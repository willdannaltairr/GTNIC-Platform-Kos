# kos-platform

Smart Living & Trust-Based Boarding House Platform — marketplace dan sistem manajemen kos.

## Struktur monorepo

```
kos-platform/
├── frontend/              # Next.js App Router (landing page + halaman lain)
├── backend/               # Express.js + TypeScript (REST API + database)
│   ├── prisma/            # Prisma schema + migrations + seed
│   ├── scripts/           # db-local.mjs (cluster PostgreSQL dev proyek)
│   └── src/               # config, middleware, modules, routes
└── package.json           # Root workspace config
```

## Teknologi

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL + PostGIS, Prisma ORM (migrate)
- Auth: JWT (HttpOnly secure cookies), bcrypt
- Payment: Midtrans Sandbox (QRIS / Virtual Account)
- Maps: Google Maps Platform (with MapLibre abstraction)
- Image storage: Cloudinary
- Email: Resend
- Monitoring: Sentry

## Database dev lokal

Mesin dev memakai cluster PostgreSQL terpisah untuk proyek ini (port **5433**,
folder `backend/.pgdata` yang di-gitignore) agar tidak mengganggu service
PostgreSQL lain di mesin.

```bash
npm run db:local -- init     # buat cluster + database (sekali saja)
npm run db:local -- start    # hidupkan server
npm run db:local -- status   # cek status
npm run db:local -- stop     # hentikan server

npm run db:migrate           # jalankan migration (prisma migrate dev)
npm run db:seed              # isi akun demo
```

Connection string ada di `backend/.env` (contoh lengkap: `.env.example`).

## Perintah umum

```bash
npm install                  # instalasi dependency seluruh workspace
npm run db:generate          # generate Prisma Client
npm run dev:web              # dev server web (port 3000)
npm run dev:api              # dev server API (port 4000)
npm run build:web            # build produksi frontend
npm run build:api            # type-check backend
```

## Menjalankan stack dev (Windows)

Urutan yang sudah diuji dari folder `kos-platform` (git-bash):

```bash
npm run db:local -- start   # PostgreSQL di 127.0.0.1:5433 (perlu diulang tiap boot)
npm run dev:api             # API di http://localhost:4000
npm run dev:web             # web — lihat baris "Local:" untuk alamat sebenarnya
```

Buka alamat dari baris `Local:` itu, lalu masuk dengan akun demo di bawah.

- **Port web bisa berpindah.** Bila 3000 sedang dipakai dev server lain (mis. app Gridora di root repo), Next otomatis memakai port berikutnya dan menuliskannya di terminal.
- **Login dan daftar hanya jalan dari origin yang terdaftar.** Backend hanya menjawab CORS untuk origin di `FRONTEND_URL` (default `http://localhost:3000`); dari port lain browser memblokir permintaan auth. Beberapa origin dipisah koma, mis. `FRONTEND_URL=http://localhost:3000,http://localhost:3001` di `backend/.env`, lalu jalankan ulang API.
- **Tanpa API.** Halaman tetap tampil; bagian "Kos terbaru" menampilkan keterangan bahwa daftar belum dapat dimuat, bukan data contoh.

## Akun demo (seed)

Semua akun memakai password yang sama: `KosDemo123!` (data fiktif, hanya untuk demo lokal).

| Email                     | Peran  |
| ------------------------- | ------ |
| admin@kosplatform.test    | ADMIN  |
| owner1@kosplatform.test   | OWNER  |
| owner2@kosplatform.test   | OWNER  |
| tenant1@kosplatform.test  | TENANT |
| tenant2@kosplatform.test  | TENANT |
| tenant3@kosplatform.test  | TENANT |
| tenant4@kosplatform.test  | TENANT |
| tenant5@kosplatform.test  | TENANT |

Properti, kamar, booking, dan data operasional lain menyusul pada fase berikutnya.

## Fase pengembangan (per `tempelan-1.txt`)

- PHASE 1 — Foundation: monorepo, Next.js, Express, TypeScript, PostgreSQL, Prisma, env config, error handling, logging, API versioning, docs. **(selesai)**
- PHASE 2 — Authentication & Authorization: register, login, logout, get current user, password hashing, session management, RBAC, protected routes, ownership checks, basic profile management. **(berjalan)**
- PHASE 3 — Property & Room Management
- PHASE 4 — Search & Discovery (KosMatch, TrueCost Simulator)
- PHASE 5 — Booking & Contract
- PHASE 6 — Payment & Billing
- PHASE 7 — Tenant & Owner Operations
- PHASE 8 — Admin Management
- PHASE 9 — Map & Location
- PHASE 10 — Testing & Polishing

## API

Semua endpoint di bawah prefix `/api/v1`:

- `GET  /api/v1/health` — health check
- `POST /api/v1/auth/register` — daftar (TENANT/OWNER)
- `POST /api/v1/auth/login` — login (cookie HttpOnly)
- `POST /api/v1/auth/logout` — logout
- `GET  /api/v1/auth/me` — profil pengguna aktif
- `PATCH /api/v1/users/me` — perbarui profil sendiri
- `GET  /api/v1/users` — daftar pengguna (ADMIN)

## Keamanan

- Password di-hash bcrypt; token JWT hanya lewat cookie HttpOnly (tidak di localStorage).
- Rate limit per IP untuk seluruh API dan batas lebih ketat untuk endpoint auth.
- Backend memverifikasi role dan kepemilikan resource di setiap endpoint privat.
- Jangan pernah commit file `.env` asli. Gunakan `.env.example` sebagai referensi.
