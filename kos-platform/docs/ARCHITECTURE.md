# Nestari — System Architecture

## 1. Shape

Modular monolith deployed as two applications plus one shared package:

```
apps/web   Next.js 16 App Router (public site + tenant/owner/admin dashboards)
apps/api   Express 5 REST API, Prisma, background-safe domain services
packages/shared  Zod schemas, DTO types, scoring math, constants
```

The web app proxies `/api/v1/*` to the API in development, so the session cookie
is first-party and CORS is only required for separately hosted deployments.

## 2. Backend layers

```
routes ──▶ middleware (auth, role, validate, rate-limit, upload)
      ──▶ controller (HTTP only)
      ──▶ service (business rules, transactions, ownership checks)
      ──▶ Prisma (repository / unit of work)
```

- **Controllers** never contain business rules. They parse validated input and
  format responses.
- **Services** own authorization-by-ownership, state machines, transactions and
  external adapters.
- **Prisma** is the only database access path. No raw SQL string interpolation;
  the few raw queries use `Prisma.sql` parameters.
- **Shared Zod schemas** are the contract between web and API. The server always
  re-validates.

### Modules

`auth`, `users`, `properties`, `rooms`, `facilities`, `favorites`,
`recommendations`, `cost-simulator`, `bookings`, `contracts`, `invoices`,
`payments`, `maintenance`, `room-passport`, `visits`, `reviews`,
`notifications`, `admin`, `articles`, `uploads`, `health`.

Dependency direction is one-way: modules may import `config`, `utils` and
`shared`; cross-module calls go through exported service functions (for example
bookings → notifications), never through another module's controller.

## 3. Frontend layers

```
app/(public)      server components; data fetched through the API
app/(auth)        client forms
app/tenant|owner|admin
components/ui     design-system primitives
components/...    reusable feature components
features/*        feature-specific client logic
lib/api.ts        typed fetch wrapper (credentials: include)
```

- Server components are the default. Client components are limited to forms,
  filters, charts, compare tray and interactive widget state.
- TanStack Query is used for client-side server state (dashboards, mutation
  refresh). Public pages use server-side fetches with `cache: 'no-store'` where
  freshness matters.
- The API base URL is server-only (`API_INTERNAL_URL`) for RSC fetches; browser
  calls use the same-origin `/api/v1` rewrite.

## 4. Authentication

- Email + password. Passwords hashed with bcrypt cost 12.
- Opaque 32-byte session token, SHA-256 hashed at rest in `sessions`.
- Cookie: `nestari_session`, `HttpOnly`, `SameSite=Lax`, `Secure` in production,
  7-day expiry, path `/`.
- Token rotation on login; all sessions revoked on password reset.
- Account status is checked on every authenticated request; suspended/banned
  accounts are rejected immediately.
- Rate limits: strict on login/register/forgot-password, general API limiter.
- CSRF: SameSite cookie + `Origin` allowlist check for state-changing requests.
- Password reset: one-time, hashed token, 30-minute expiry, generic response to
  prevent account enumeration.
- Email verification tokens are generated and delivered through the configured
  transport. In development the console transport logs the link; no claim is
  made that email is configured.

### Authorization

`requireAuth` loads the user from the session. `requireRole(...roles)` guards
endpoint classes. Ownership is always checked in the service:

- owner → property `ownerId`, room → property → owner, booking → ownerId/tenantId,
  invoice/payment/contract → tenantId or ownerId, maintenance → participant.
- tenant → own bookings/contracts/invoices/payments, own favorites/visits,
  own condition reports.
- admin → platform-wide, with every sensitive action written to `audit_logs`.
- guest → only published + verified properties/rooms and public reference data.

The frontend hides navigation for UX only; it is never the security boundary.

## 5. Data and money rules

- UUID keys; `TIMESTAMPTZ`; `NUMERIC(14,2)` for money.
- Price snapshots are written to bookings; later owner price edits never mutate
  historical transactions.
- Booking state machine:
  `PENDING → APPROVED → AWAITING_PAYMENT → CONFIRMED → COMPLETED`
  plus `REJECTED`, `CANCELLED`, `EXPIRED`. Only explicit transitions are allowed.
- Double booking is prevented twice: a transaction re-checks availability, and
  PostgreSQL has an exclusion constraint over active booking date ranges per room.
- Invoice status and payment status are separate. A successful payment recomputes
  the invoice status from successful payment totals inside a transaction.
- Webhook processing is idempotent through `(provider, idempotency_key)` and
  transaction status/amount/order validation. Failed events are stored.
- Financial reports count only `PAID` invoices / `SUCCESS` payments.

## 6. External service adapters

| Adapter | Configured? | Fallback behaviour |
| --- | --- | --- |
| Midtrans payment | env keys | payment intent remains pending; no fake success |
| Google Maps | env keys | Haversine distance/time estimate, external map link |
| Cloudinary | env keys | local public bucket + static serving |
| Supabase storage | env keys | local private bucket + signed API route |
| Resend email | env keys | console transport in development |
| Sentry | env DSN | structured console logging |

Adapters are interfaces under `src/services/` (API) or `lib/` (web). Swapping a
provider does not change controllers or business logic.

## 7. Failure and observability

- Uniform success/error envelope; operational errors have codes and HTTP status.
- Unknown errors are logged server-side, never returned with a stack trace.
- Request IDs are attached to logs.
- Audit log writes are append-only; the DB trigger blocks UPDATE/DELETE.
- Health endpoint checks the database.

## 8. Deployment

- Web: Vercel. API: Railway/Render. DB: Supabase/Neon PostgreSQL with PostGIS
  optional. Set `WEB_ORIGIN`, `API_URL`, cookie `Secure`, and provider keys.
- Run `prisma migrate deploy`, never `migrate reset`.
- Backups: provider PITR + nightly logical dump; restore test documented in
  `docs/SECURITY.md`.
