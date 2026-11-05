# kos-platform

Smart Living & Trust-Based Boarding House Platform — marketplace dan sistem manajemen kos.

## Struktur monorepo

```
kos-platform/
├── apps/web/          # Next.js App Router (frontend)
├── apps/api/          # Express.js + TypeScript (backend REST API)
├── packages/shared/   # Prisma schema, shared types, Zod schemas, seed
├── prisma/            # Migration directory
└── package.json       # Root workspace config
```

## Teknologi

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL + PostGIS, Prisma ORM (migrate)
- Auth: JWT (HttpOnly secure cookies), bcrypt (Argon2id-ready)
- Payment: Midtrans Sandbox (QRIS / Virtual Account)
- Maps: Google Maps Platform (with MapLibre abstraction)
- Image storage: Cloudinary
- Email: Resend
- Monitoring: Sentry

## Fase pengembangan (per `tempelan-1.txt`)

- PHASE 1 — Foundation: monorepo, Next.js, Express, TypeScript, PostgreSQL, Prisma, shared package, env config, error handling, logging, API versioning, docs.
- PHASE 2 — Authentication & Authorization: register, login, logout, get current user, password hashing, session management, RBAC, protected routes, ownership checks, basic profile management.
- PHASE 3 — Property & Room Management, PHASE 4 — Search & Discovery, PHASE 5 — Booking & Contract, PHASE 6 — Payment & Billing, PHASE 7 — Tenant & Owner Operations, PHASE 8 — Admin Management, PHASE 9 — Map & Location, PHASE 10 — Testing & Polishing.

## Perintah umum

```bash
# Instalasi dependency (di root kos-platform)
npm install

# Generate Prisma Client
npm run db:generate

# Jalankan migration development
npm run db:migrate

# Jalankan seed data demo
npm run db:seed

# Jalankan dev server web (port 3000)
npm run dev:web

# Jalankan dev server API (port 4000)
npm run dev:api
```

## Akun demo (seed)

Dokumentasi kredensial demo ditambahkan saat PHASE 2 selesai (lihat `packages/shared/seed.ts`).

## Keamanan

Jangan pernah commit file `.env` asli. Gunakan `.env.example` sebagai referensi variabel yang diperlukan.
