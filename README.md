# KosPlatform

Marketplace dan sistem manajemen kos: platform pencarian dan pengelolaan kos yang
mengutamakan transparansi biaya, kecocokan kebutuhan, dan kepercayaan antara calon
penghuni dengan pemilik kos.

Repo ini (`GTNIC-UMKM`) hanya berisi satu proyek — monorepo `kos-platform` dengan
frontend Next.js dan backend Express.

## Isi repo

```text
GTNIC-UMKM/
├── package.json          # jembatan perintah dev/build/start ke kos-platform/frontend
└── kos-platform/         # monorepo (npm workspaces: frontend + backend)
    ├── frontend/         # Next.js 16 App Router — web publik
    ├── backend/          # Express 4 + Prisma 5 — REST API + PostgreSQL
    ├── .env.example      # referensi seluruh environment variable
    └── README.md         # dokumentasi teknis lengkap
```

## Menjalankan cepat

Prasyarat: Node.js 20.9+ (diuji pada Node 22.17), npm 10+, dan PostgreSQL 18
untuk cluster dev lokal.

```bash
cd kos-platform
npm install
cp .env.example backend/.env      # isi minimal DATABASE_URL dan JWT_SECRET
npm run db:local -- init          # cluster PostgreSQL 127.0.0.1:5433 (sekali saja)
npm run db:migrate                # buat 46 tabel
npm run db:seed                   # 8 akun demo + 6 properti contoh
```

Lalu jalankan kedua sisi di terminal terpisah:

```bash
npm run dev:api    # API → http://localhost:4000
npm run dev:web    # web → http://localhost:3000
```

Masuk dengan salah satu akun demo (password semuanya `KosDemo123!`) — daftarnya ada
di [`kos-platform/README.md`](kos-platform/README.md#akun-demo-seed).

> Dari folder akar repo, `npm run dev|build|start` sama dengan perintah web di atas
> karena `package.json` akar hanya menjembatani ke `kos-platform/frontend`. Backend
> tidak dijembatani, jadi `dev:api` tetap dijalankan dari dalam `kos-platform`.

## Yang sudah jalan

- Landing `/` dengan hero foto, marquee kawasan, kartu 3D rumah kos, dan panggilan aksi.
- Pencarian `/kos` (filter kata kunci, kota, tipe kos, kamar mandi, harga, fasilitas,
  urutan) dan detail `/kos/[slug]` — keduanya membaca endpoint publik properti.
- Masuk `/masuk` dan daftar `/daftar` yang terhubung ke API autentikasi (JWT pada
  cookie HttpOnly).
- Kredit foto `/kredit`, halaman 404 dan error.
- API: `health`, `auth` (register/login/logout/me), `users` (profil sendiri + daftar
  untuk ADMIN), dan `properties` publik (daftar + detail).
- Database: 46 tabel Prisma dengan data demo properti, kamar, fasilitas, aturan,
  dan komponen biaya.

## Yang belum

Booking, kontrak, pembayaran, notifikasi, review, dan peta masih berupa tabel di
schema tanpa endpoint maupun UI. Kredensial Midtrans, Cloudinary, Resend, Sentry, dan
Google Maps sudah disiapkan di `.env.example` tetapi belum dipakai kode. Belum ada test
otomatis di repo ini.

## Alur branch

| Branch | Fungsi |
| --- | --- |
| `main` | Rilis stabil — hanya menerima hasil yang sudah fix. |
| `develop` | Integrasi — semua fitur digabung ke sini lebih dulu. |
| `feature/<nama>` | Satu cabang per fitur, dibiarkan tetap ada setelah digabung supaya gampang dibuka dan diubah lagi. |

```bash
git switch develop
git switch -c feature/nama-fitur     # kerjakan fiturnya
git commit -m "feat(scope): ringkasan perubahan"
git push -u origin feature/nama-fitur
```

Setelah fitur selesai, gabungkan ke `develop`; `main` disentuh paling akhir saat
sedang menyiapkan rilis.

## Dokumentasi lain

- [`kos-platform/README.md`](kos-platform/README.md) — setup lengkap, daftar skrip,
  peta rute, endpoint API, environment variable, dan fase pengembangan.
- [`kos-platform/.env.example`](kos-platform/.env.example) — seluruh environment
  variable beserta nilai contohnya.
- Halaman `/kredit` dan [`kos-platform/frontend/public/images/CREDITS.md`](kos-platform/frontend/public/images/CREDITS.md)
  — kredit foto pihak ketiga.

## Keamanan

Jangan pernah commit berkas `.env` asli; pakai `.env.example` sebagai referensi.
`JWT_SECRET` wajib diganti sebelum dipakai di luar mesin lokal.
