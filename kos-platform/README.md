# kos-platform

Smart Living & Trust-Based Boarding House Platform — marketplace dan sistem manajemen kos.
Monorepo berisi web publik (frontend) dan REST API (backend).

## Struktur monorepo

```text
kos-platform/
├── frontend/                 # Next.js App Router — web publik
│   ├── app/                  # rute: (landing)/ dan (site)/
│   ├── components/           # landing/, kos/, motion/, komponen bersama
│   ├── hooks/                # use-media-query, use-prefers-reduced-motion
│   ├── lib/                  # api.ts (klien API), format.ts, landing.ts, constants.ts
│   └── public/images/        # foto demo + CREDITS.md
├── backend/                  # Express + TypeScript — REST API
│   ├── scripts/db-local.mjs  # kelola cluster PostgreSQL dev proyek
│   ├── scripts/db-sql.mjs    # jalankan migration/seed SQL ke database
│   └── src/                  # config, lib (koneksi + query), middleware, modules, routes
├── supabase/                 # seluruh skema dan data demo, murni SQL
│   ├── migrations/           # DDL: 46 tabel, 23 enum, 78 foreign key, trigger updated_at
│   ├── seed.sql              # 8 akun demo + 6 properti contoh
│   └── config.toml           # konfigurasi Supabase CLI
├── .env.example              # referensi seluruh environment variable
└── package.json              # npm workspaces (frontend + backend) + skrip bersama
```

## Teknologi

| Bagian | Dipakai |
| --- | --- |
| Frontend | Next.js 16.2.3 (App Router, Turbopack), React 19.2.4, TypeScript 5, Tailwind CSS v4, motion 14, lenis, lucide-react, three + @react-three/fiber (kartu 3D) |
| Backend | Node.js, Express 4, TypeScript 5, Zod 3, node-postgres (`pg` 8), ts-node (dev) |
| Database | PostgreSQL (lokal atau Supabase) — **tanpa ORM**: skema, migration, dan seluruh query ditulis SQL langsung |
| Auth | JWT pada cookie HttpOnly (access 15 menit + refresh 7 hari), bcrypt untuk password |
| Middleware | helmet, cors, express-rate-limit, cookie-parser, logger permintaan, error handler terpusat |

Sudah ada di `.env.example` tetapi **belum dipakai kode**: Midtrans, Google Maps Platform,
Cloudinary, Resend, dan Sentry. Variabelnya disiapkan untuk fase berikutnya, bukan
ketergantungan aktif — tidak ada satu pun yang diimpor di `backend/src` maupun `frontend`.

## Prasyarat

- Node.js **20.9+** (syarat Next.js 16; diuji pada Node 22.17)
- npm 10+
- Database **PostgreSQL**, salah satu:
  - **Supabase** — cukup connection string dari dashboard, atau
  - **cluster lokal** untuk mengembangkan tanpa internet (PostgreSQL terpasang di mesin, diuji pada PostgreSQL 18)
- Supabase CLI **hanya bila** memakai Supabase (dijalankan lewat `npx supabase`, tidak perlu dipasang global)

## Menjalankan stack dev (Windows, sudah diuji)

Jalankan dari folder `kos-platform` (git-bash):

```bash
npm install                  # dependency seluruh workspace (hoisted ke kos-platform/node_modules)
cp .env.example backend/.env # lalu isi DATABASE_URL dan JWT_SECRET
cp .env.example frontend/.env.local   # cukup sisakan NEXT_PUBLIC_API_URL
```

### Pilihan A — database Supabase

Ambil connection string dari dashboard Supabase (**Connect → Session pooler**), lalu
tempel ke `DATABASE_URL` di `backend/.env`.

> **Pakai Session pooler, bukan koneksi langsung.** Host koneksi langsung
> (`db.<ref>.supabase.co`) hanya punya alamat IPv6; dari jaringan yang cuma punya IPv4,
> host itu tidak bisa dihubungi sama sekali. Session pooler
> (`aws-<n>-<region>.pooler.supabase.com:5432`) selalu IPv4.
>
> Menempelkan `?sslmode=require` di connection string juga tidak membantu — driver `pg`
> akan mengabaikan pengaturan TLS dari aplikasi begitu parameter itu ada. Enkripsi sudah
> diurus otomatis oleh `backend/src/lib/db.ts`.

```bash
npx supabase login                              # sekali saja, menyimpan token akses
npx supabase link --project-ref <ref-proyek>    # contoh: ftunxbdpiokslgrzcmvd
npm run db:migrate                              # buat seluruh tabel + kunci akses REST
npm run db:seed                                 # 8 akun demo + 6 properti contoh
```

Bila `supabase db push` gagal karena IPv6 (perintah itu menyambung lewat koneksi
langsung), berikan connection string pooler secara eksplisit:

```bash
npx supabase db push --db-url "postgresql://postgres.<ref>:[PASSWORD]@aws-<n>-<region>.pooler.supabase.com:5432/postgres"
```

### Pilihan B — PostgreSQL lokal

```bash
npm run db:local -- init     # buat cluster PostgreSQL di 127.0.0.1:5433 (sekali saja)
npm run db:setup             # buat seluruh tabel, lalu isi data demo
```

Lalu dua terminal terpisah:

```bash
npm run dev:api              # API  → http://localhost:4000
npm run dev:web              # web  → lihat baris "Local:" di terminal
```

Buka alamat dari baris `Local:` itu, lalu masuk dengan akun demo di bawah.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev:web` | Dev server frontend (Turbopack) |
| `npm run dev:api` | Dev server backend (ts-node, port 4000) |
| `npm run build:web` | Build produksi frontend (`next build`) |
| `npm run build:api` | Type-check backend (`tsc --noEmit`, tanpa output) |
| `npm run db:migrate` | Jalankan seluruh migration SQL ke database di `DATABASE_URL` |
| `npm run db:seed` | Isi akun demo dan properti contoh |
| `npm run db:setup` | `db:migrate` lalu `db:seed` sekaligus |
| `npm run db:push` | Deployment migration ke proyek Supabase yang sudah di-`link` |
| `npm run db:local -- init\|start\|stop\|status` | Kelola cluster PostgreSQL dev lokal |

> **Dari folder akar repo.** `package.json` di akar hanya menjembatani perintah ke
> `kos-platform/frontend`, jadi `npm run dev|build|start` di akar sama dengan
> `npm run dev:web|build:web` di sini. Backend tetap dijalankan dari `kos-platform`
> (`npm run dev:api`) karena tidak dijembatani.

### Catatan menjalankan

- **Port web bisa berpindah.** Bila 3000 sedang dipakai proses lain, Next otomatis memakai port berikutnya dan menuliskannya di terminal.
- **Login dan daftar hanya jalan dari origin yang terdaftar.** Backend hanya menjawab CORS untuk origin di `FRONTEND_URL` (default `http://localhost:3000`); dari port lain browser memblokir permintaan auth. Beberapa origin dipisah koma, mis. `FRONTEND_URL=http://localhost:3000,http://localhost:3001` di `backend/.env`, lalu jalankan ulang API.
- **Tanpa API.** Halaman tetap tampil; bagian daftar kos menampilkan keterangan bahwa daftar belum dapat dimuat, bukan data contoh.
- **Cluster DB perlu dihidupkan ulang tiap boot.** `npm run db:local -- start`.

## Environment variable

Referensi lengkap ada di [`.env.example`](.env.example). Yang benar-benar wajib:

| Variable | Berkas | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | Wajib — API menolak start bila kosong |
| `JWT_SECRET` | `backend/.env` | Wajib — ganti sebelum dipakai di luar mesin lokal |
| `FRONTEND_URL` | `backend/.env` | Origin yang diizinkan CORS; boleh beberapa, dipisah koma |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Default `http://localhost:4000` bila kosong |

Sisanya (`PORT`, `API_PREFIX`, `BCRYPT_SALT_ROUNDS`, `JWT_*_EXPIRES_IN`, dan kredensial
layanan pihak ketiga) punya nilai default di `backend/src/config/env.ts`.

## Halaman

| Rute | Grup | Isi |
| --- | --- | --- |
| `/` | `(landing)` | Landing page: hero foto, marquee kawasan, manifesto, produk, solusi, lokasi, kos terbaru dari API, cara kerja, manfaat, angka, tentang, tanya jawab, ajakan akhir, dan kartu 3D rumah kos |
| `/kos` | `(site)` | Pencarian kos dengan filter (kata kunci, kota, kecamatan, tipe, kamar mandi, rentang harga, fasilitas, urutan) — seluruh filter ditulis ke URL sehingga hasil bisa dibagikan |
| `/kos/[slug]` | `(site)` | Detail properti: kamar, fasilitas, aturan, komponen biaya, dan ringkasan TrueCost |
| `/masuk` · `/daftar` | `(site)` | Form autentikasi yang terhubung API |
| `/kredit` | `(site)` | Kredit foto Pexels yang dipakai sebagai ilustrasi demo |
| `not-found` · `error` | akar app | Halaman 404 dan 500, lengkap dengan header/footer situs |

Landing memakai chrome sendiri (header dan footer khusus, tipografi DM Sans + Space
Grotesk + JetBrains Mono lewat kelas `landing-scope`); halaman lain memakai chrome situs
yang lebih sederhana. Pemisahannya ada di `app/(landing)/layout.tsx` dan `app/(site)/layout.tsx`.

## API

Prefix `/api/v1` (dapat diubah lewat `API_PREFIX`). Semua respons berbentuk
`{ success, message, data?, meta?, errors? }`.

| Method | Endpoint | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/health` dan `/api/v1/health` | publik | Health check |
| GET | `/api/v1/properties` | publik | Daftar properti terverifikasi + terpublikasi |
| GET | `/api/v1/properties/:slug` | publik | Detail properti + ringkasan biaya; 404 bila tidak ada |
| POST | `/api/v1/auth/register` | publik | Daftar sebagai TENANT atau OWNER |
| POST | `/api/v1/auth/login` | publik | Login; token hanya dikirim lewat cookie HttpOnly |
| POST | `/api/v1/auth/logout` | publik | Hapus cookie |
| GET | `/api/v1/auth/me` | login | Profil pengguna aktif |
| PATCH | `/api/v1/users/me` | login | Perbarui nama, telepon, atau avatar sendiri |
| GET | `/api/v1/users` | ADMIN | Daftar pengguna |

### Parameter pencarian properti

Semuanya benar-benar diterapkan di query database, bukan hanya disaring di frontend:

| Parameter | Nilai |
| --- | --- |
| `q` | Kata kunci nama/alamat/wilayah |
| `city`, `district` | Nama kota atau kecamatan (pencocokan tidak peka huruf besar-kecil) |
| `type` | `KOS_PUTRA` · `KOS_PUTRI` · `KOS_CAMPUR` |
| `bathroomType` | `private` · `shared` |
| `minPrice`, `maxPrice` | Rentang harga sewa bulanan (integer, rupiah) |
| `facilities` | Slug fasilitas, dipisah koma; cocok bila ada di level properti **atau** kamar |
| `sort` | `newest` (default) · `price_asc` · `price_desc` |
| `page`, `limit` | Halaman (mulai 1) dan jumlah per halaman (maksimal 24, default 9) |

### Bentuk error

| Status | Isi |
| --- | --- |
| 400 | Validasi Zod gagal — `errors[]` berisi `{ field, message }` |
| 401 / 403 | Belum login / peran tidak diizinkan |
| 404 | Properti tidak ditemukan |
| 429 | Rate limit terlampaui |
| 500 | Pesan generik; detail dan stack trace hanya masuk log server |

## Database

Skema dipegang **SQL langsung**, tanpa ORM. Seluruh definisinya ada di `supabase/`:

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20261107120000_init.sql` | 46 tabel, 23 tipe enum, 78 foreign key, 67 indeks unik, trigger `updated_at` |
| `supabase/migrations/20261107130000_kunci_akses_public.sql` | RLS menyala di semua tabel + cabut hak akses peran `anon`/`authenticated` |
| `supabase/seed.sql` | 8 akun demo, 14 fasilitas, 6 properti lengkap dengan kamar, foto, aturan, dan komponen biaya |

Jalankan dengan `npm run db:migrate` dan `npm run db:seed` (keduanya membaca `DATABASE_URL`),
atau deploy ke Supabase lewat `npm run db:push`.

Tiga hal yang diurus database sendiri — dulu dikerjakan aplikasi:

- **`id`** punya `DEFAULT gen_random_uuid()`, jadi UUID dibuat database, bukan kode.
- **`created_at` / `updated_at`** punya default `now()`, dan trigger `set_updated_at()`
  memperbarui `updated_at` di setiap `UPDATE` — tidak bisa terlupa di query.
- **Keunikan email** dijaga indeks unik, bukan pemeriksaan terpisah di aplikasi, sehingga
  dua pendaftaran bersamaan tidak bisa sama-sama lolos (backend menerjemahkan pelanggaran
  indeks `23505` menjadi 409 "Email sudah terdaftar").

Kelompok tabelnya: pengguna dan profil (`users`, `owner_profiles`, `tenant_profiles`,
`password_reset_tokens`, `refresh_sessions`, `user_preferences`, `favorites`), properti
(`properties`, `rooms`, `property_images`, `room_images`, `facilities`,
`property_facilities`, `room_facilities`, `property_rules`, `cost_components`), transaksi
(`bookings`, `contracts`, `invoices`, `payments`, beserta tabel riwayat status), operasional
(`maintenance_requests`, `room_condition_reports`, `visits`, `expenses`), dan admin
(`reports`, `audit_logs`, `notifications`, `content_articles`).

Hanya tabel pengguna, properti, kamar, fasilitas, aturan, dan komponen biaya yang sudah
dipakai endpoint. Sisanya masih tabel kosong tanpa API.

### Cara backend menyambung

`backend/src/lib/db.ts` membuat satu pool `pg` dari `DATABASE_URL`:

- **TLS otomatis.** Menyala untuk host non-lokal (Supabase wajib terenkripsi), mati untuk
  localhost yang umumnya tanpa TLS. Paksa dengan `DB_SSL=require` atau `DB_SSL=disable`.
- **Parameter `sslmode` di connection string dibuang lebih dulu.** Kalau tidak, `pg` akan
  menimpakan objek `ssl`-nya sendiri dan pengaturan aplikasi diabaikan — sumber galat
  "self-signed certificate in certificate chain" yang membingungkan.
- **Query lewat parameter, bukan rangkaian teks.** Semua nilai filter dikirim sebagai `$1`,
  `$2`, … sehingga filter pencarian yang jumlahnya berubah-ubah tetap aman dari injeksi.

### Supabase

Skema `public` disiapkan tertutup: RLS menyala di seluruh tabel dan hak akses `anon` serta
`authenticated` dicabut. Alasannya, Supabase mengekspos `public` sebagai REST API yang bisa
dipanggil siapa pun yang memegang kunci publik — dan pada tabel yang dibuat lewat SQL
migration, RLS **tidak** menyala otomatis. Tanpa langkah ini, `password_hash` bisa terbaca
dari browser. Aplikasi tidak terpengaruh karena backend masuk sebagai pemilik tabel, dan
pemilik tabel melewati RLS.

### Cluster dev lokal

Mesin dev memakai cluster PostgreSQL terpisah untuk proyek ini (port **5433**, data di
`backend/.pgdata` yang di-gitignore) agar tidak mengganggu service PostgreSQL lain di mesin.
Skrip `backend/scripts/db-local.mjs` memakai binari PostgreSQL dari
`C:\Program Files\PostgreSQL\18\bin`; arahkan ke versi lain lewat `PG_BIN`, dan ganti port
lewat `KOS_DB_PORT`.

## Akun demo (seed)

Password semua akun: `KosDemo123!` (data fiktif, hanya untuk demo lokal).

| Email | Peran |
| --- | --- |
| admin@kosplatform.test | ADMIN |
| owner1@kosplatform.test · owner2@kosplatform.test | OWNER |
| tenant1@kosplatform.test … tenant5@kosplatform.test | TENANT |

Seed juga mengisi 6 properti contoh (Kos Melati Putri, Kos Anggrek Campur, Kos Cendana Putra,
Kos Bougenville Putri, Kos Flamboyan Campur, Kos Kenanga Putri) di Bandung, Depok, Jakarta
Selatan, Malang, Sleman, dan Surabaya — lengkap dengan kamar, foto, fasilitas, aturan, dan
komponen biaya sehingga halaman `/kos` dan `/kos/[slug]` langsung ada isinya.

## Simulasi biaya (TrueCost)

`backend/src/modules/properties/cost-summary.ts` menghitung ringkasan biaya untuk halaman
detail dengan aturan yang dipegang ketat:

- Deposit bukan biaya bulanan dan tidak dihitung sebagai pengeluaran hilang.
- Biaya variabel selalu diberi label estimasi, tidak pernah diklaim pasti.
- Bila ada komponen yang belum dikonfirmasi, total tidak disimpulkan pasti dan komponennya
  dicantumkan di daftar `unknowns`.
- Rumus yang dipakai ikut dikirim ke klien agar pengguna bisa memeriksa sendiri.

## Fase pengembangan

| Fase | Isi | Status |
| --- | --- | --- |
| 1 | Foundation: monorepo, Next.js, Express, TypeScript, PostgreSQL, skema SQL langsung, env config, error handling, logging, API versioning | Selesai |
| 2 | Authentication & Authorization: register, login, logout, profil, RBAC, rate limit | Berjalan — endpoint inti sudah ada; endpoint refresh token belum |
| 3 | Property & Room Management | Sebagian — baru endpoint baca publik; belum ada CRUD pemilik |
| 4 | Search & Discovery (KosMatch, TrueCost Simulator) | Sebagian — filter pencarian dan TrueCost sudah jalan; skor KosMatch belum diimplementasikan |
| 5 | Booking & Contract | Belum — tabel sudah ada |
| 6 | Payment & Billing | Belum |
| 7 | Tenant & Owner Operations | Belum |
| 8 | Admin Management | Belum |
| 9 | Map & Location | Belum — koordinat properti sudah tersimpan |
| 10 | Testing & Polishing | Belum ada test otomatis di repo |

## Keamanan

- Password di-hash bcrypt; token JWT hanya lewat cookie HttpOnly (tidak di localStorage).
- **Query memakai parameter, bukan rangkaian teks.** Tidak ada satu pun nilai dari pengguna
  yang disisipkan ke dalam teks SQL — termasuk filter pencarian yang jumlahnya berubah-ubah.
- **Daftar kolom ditulis eksplisit.** Tidak ada `SELECT *`, sehingga kolom sensitif seperti
  `password_hash` tidak ikut terkirim hanya karena ada kolom baru ditambahkan.
- **Keunikan dijaga database.** Pendaftaran email ganda ditolak indeks unik, bukan oleh
  pemeriksaan yang bisa dilewati dua permintaan bersamaan.
- **REST API Supabase ditutup.** RLS menyala di seluruh tabel dan hak akses peran `anon`
  serta `authenticated` dicabut, sehingga isi database tidak bisa dibaca lewat kunci publik.
- Rate limit per IP untuk seluruh API dan batas lebih ketat untuk endpoint auth.
- Backend memverifikasi role dan kepemilikan resource di setiap endpoint privat.
- `JWT_SECRET` wajib diganti sebelum dipakai di luar mesin lokal.
- Jangan pernah commit file `.env` asli. Gunakan `.env.example` sebagai referensi.

## Kredit foto

Foto kamar dan rumah pada halaman demo berasal dari Pexels dan dipakai sesuai lisensinya —
daftar lengkap ada di halaman `/kredit` dan di
[`frontend/public/images/CREDITS.md`](frontend/public/images/CREDITS.md).
