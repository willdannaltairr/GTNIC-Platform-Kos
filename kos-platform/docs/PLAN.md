# Nestari — Implementation Plan

## 1. Context and workspace audit

The existing repository (`GTNIC-UMKM`) contains an unrelated Next.js Pages Router
marketing site about renewable energy. All of its files are currently uncommitted
and therefore treated as user work-in-progress.

**Decision:** the platform is built in an isolated monorepo at `kos-platform/`.
No existing file is overwritten or deleted. The old site keeps working exactly as
before. This is the only non-destructive option and satisfies the preservation
rule in the brief.

## 2. Product framing

**Nestari** is a trust-based boarding-house discovery and management platform.

- **Guest** — search, filter, compare, view property details, estimate full costs.
- **Tenant** — book, manage contract/bills/payments, document room condition,
  submit maintenance requests, keep personal survey notes.
- **Owner** — manage properties, rooms, availability, bookings, tenants,
  contracts, invoices, payments, maintenance, expenses and reports.
- **Admin** — verify owners/properties, moderate users and reports, inspect
  transactions, manage content/settings and audit logs.

Differentiators implemented end-to-end:

1. **TrueCost** — transparent fixed/variable/one-time costs, deposit handling,
   budget planner and confidence indicator (never fabricates unknown costs).
2. **KosMatch** — explainable weighted scoring, not "AI".
3. **CampusRoute** — coordinates, distance, travel-time estimate, nearby places,
   provider abstraction (Google Maps optional, Haversine fallback).
4. **KosVisit** — private survey checklist and notes.
5. **Room Passport** — joint check-in/check-out documentation with acknowledgements.

## 3. Stack decisions

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript | Required; server components reduce client JS |
| Styling | Tailwind CSS v4 + shadcn-style primitives | Required visual system, low runtime cost |
| Server state | TanStack Query v5 | Cache, retries, mutations |
| Client state | Zustand (compare tray only) | Small, persistent local state |
| Forms | React Hook Form + Zod | Shared validation with API |
| Charts | Recharts | Dashboard reporting |
| Backend | Express 5 + TypeScript, modular monolith | Required; service/controller split |
| DB | PostgreSQL 18 + Prisma 6.19 | Required; type-safe data access |
| Validation | Zod (shared package) | One schema for client and server |
| Auth | Opaque session tokens, HttpOnly cookies, bcrypt(12) | Revocable, no token in JS; no Supabase credentials available |
| Payments | Midtrans Snap + webhook signature verification | Required sandbox integration, provider isolated behind a service |
| Storage | Local private/public buckets behind an adapter | No Cloudinary/Supabase credentials; adapter documented |
| Maps | Google Maps/Places/Routes adapter with Haversine fallback | No key available; app must still work honestly |
| Email | Console transport in dev, Resend adapter | No API key available |
| Tests | Vitest + Supertest | API unit/integration/authorization tests |

### Deliberate deviations, documented not hidden

- **Supabase Auth vs self-hosted auth.** The database brief requests Supabase Auth,
  but no Supabase project or keys exist in this environment, and local migrations,
  seed and tests must actually run. The implementation uses the same `public.users`
  UUID model with an opaque-session auth service. A Supabase JWT verification path
  is documented as a deployment option; no claim is made that it is configured.
- **PostGIS.** The portable PostgreSQL used for local development does not ship
  PostGIS. Radius search uses a bounding box + Haversine SQL calculation with
  lat/lng indexes. `prisma/sql/postgis-optional.sql` and deployment docs describe
  how to enable PostGIS on Supabase/Neon without changing the API contract.
- **Payment simulation.** Real money is never processed. Midtrans sandbox is used
  when keys are configured. A clearly-labelled, development-only simulation
  endpoint exists behind `ALLOW_PAYMENT_SIMULATION=true`; every simulated payment
  is marked `SIMULATED` and audited. In production the flag is rejected.
- **RLS.** Supabase RLS policies are shipped as an optional SQL hardening file.
  Express is the only application data path and enforces authorization itself;
  the docs explicitly state that a privileged Prisma connection bypasses RLS.
  RLS is defense-in-depth for direct Supabase/PostgREST access, not a replacement
  for backend checks.

## 4. Architecture

```
Browser
  │  HTTPS, HttpOnly cookie
  ▼
Next.js web (app router)  ──/api/v1 rewrite──▶  Express API
                                                   │
                              ┌────────────────────┼───────────────────┐
                              ▼                    ▼                   ▼
                        Prisma / PostgreSQL   Storage adapter    External adapters
                        (modular monolith)    local | S3/Cloud  Midtrans · Google · Resend
```

- The browser never talks to PostgreSQL directly.
- Controllers handle HTTP only; services hold business rules; Prisma is the
  repository layer.
- Shared Zod schemas and types live in `packages/shared`, consumed by both apps.
- Every private endpoint runs `requireAuth` + `requireRole` + explicit ownership
  checks in the service layer.
- Money is stored as `Decimal(14,2)`, never float.
- Booking overlap is blocked by a PostgreSQL `EXCLUDE USING gist` constraint in
  addition to transactional checks.

## 5. Database plan (full platform schema)

46 tables are modelled in `apps/api/prisma/schema.prisma`, covering:

- identity: users, owner/tenant profiles, sessions, reset/verification tokens
- supply: properties, rooms, images, facilities, rules, cost components
- demand: favorites, preferences, visits, checklists, images, notes, reviews
- commerce: bookings + status history, contracts + documents, invoices + items,
  payments + status history, webhook events, expenses
- operations: maintenance + images + history, room condition reports + images +
  checklist + acknowledgements
- governance: owner verification documents, property verification history,
  user reports, audit logs, notifications, preferences, articles, settings
- geography: destinations, nearby places, property views

Full ERD and column notes: `docs/DATABASE.md`.

Key integrity rules:

- UUID primary keys, `snake_case` tables, `TIMESTAMPTZ`.
- Unique: `users.email`, `properties.slug`, `(property_id, room_number)`,
  `bookings.booking_code`, `contracts.contract_number`,
  `invoices.invoice_number`, `payments.order_id`, `(user_id, property_id)` favorites,
  `(provider, idempotency_key)` webhook events, `reviews.booking_id`.
- Check: positive money/area, rating 1..5, valid dates, valid coordinates.
- Booking exclusion: active statuses cannot overlap for the same room.
- Audit log append-only trigger.
- `updated_at` triggers.
- Indexes on every foreign key used in list queries, plus search composites.

## 6. Delivery phases and acceptance

### Phase 1 — Foundation
Monorepo, env validation, Express app, health endpoint, Prisma schema/migration,
seed scaffolding, API error envelope, logging, docs.

### Phase 2 — Auth and RBAC
Register tenant/owner, login, logout, me, refresh, forgot/reset password,
email verification token flow, account status checks, role guards, ownership
tests.

### Phase 3 — Property and room management
Owner CRUD, rooms, facilities, images (local upload adapter), availability with
last-confirmed timestamps, admin verification workflow, public listing/detail.

### Phase 4 — Search and discovery
Debounced search UI, all required filters, URL state, sort, pagination, empty/
loading states, favorites, compare (max 4), KosMatch with explanations,
TrueCost simulator + confidence + budget planner, routes/nearby places.

### Phase 5 — Booking and contract
Transactional booking with expiration and DB overlap constraint, owner
approve/reject, tenant cancel, contract creation/acceptance/activation,
notifications, invoices and payment records, Midtrans sandbox adapter, verified
idempotent webhook.

### Phase 6 — Audit and hardening (requested)
Functional, DB integrity, API consistency, authn/authz/ownership, payment
security, double-booking, responsive checks, performance basics, accessibility,
error handling, TypeScript, build, tests. Fix findings, report honestly.

## 7. Verification gates

1. `npm run db:migrate` on a clean PostgreSQL.
2. `npm run db:seed` idempotent.
3. `npm test` — unit + integration + authorization + booking + webhook.
4. `npm run typecheck` (all workspaces).
5. `npm run build` (shared, API, web).
6. Manual smoke test of login/search/booking/approve/contract/payment.

## 8. Known external configuration still required

- Midtrans server/client keys for sandbox payment UI/webhook.
- Google Maps browser/server keys for map tiles, Places and Routes.
- Resend API key for real email delivery.
- Cloudinary/Supabase credentials for managed image storage.
- Production PostgreSQL with PostGIS for the optional geo migration.
