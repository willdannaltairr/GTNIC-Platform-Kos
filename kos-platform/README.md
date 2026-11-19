# HuniKos

**Cari kos dengan informasi yang bisa diperiksa, bukan sekadar harga sewa yang terpampang.**

HuniKos adalah marketplace pencarian dan pengelolaan kos. Web-nya menyusun ulang
informasi sewa supaya bisa dipercaya sebelum keputusan diambil: berapa total biayanya,
seberapa jauh jaraknya, dan kapan kamarnya benar-benar tersedia.

## Masalah yang dijawab

Mencari kos jarang soal kurang pilihan, sering soal kurang kejelasan:

- **Harga sewa hampir selalu bukan biaya sesungguhnya.** Ada deposit, listrik, air, internet,
  kebersihan, dan biaya lain yang baru muncul belakangan.
- **Ketersediaan kamar sering baru diketahui saat sampai di lokasi.**
- **Jarak ke kampus atau kantor jadi pertimbangan terakhir**, padahal dampaknya terasa tiap hari.

Web ini memindahkan informasi itu ke depan, dan menyebutkan terus terang mana angka yang sudah
dikonfirmasi pemilik dan mana yang masih perkiraan.

## Untuk siapa

**Pencari kos**, mahasiswa, pekerja, atau siapa pun yang pindah ke kota baru. Mencari dan
membandingkan kos bisa dilakukan tanpa akun. Dengan akun, pencarian bisa disimpan supaya Anda
diberi tahu saat ada kos baru yang cocok, sewa bisa diajukan, dan statusnya bisa dipantau.

**Pemilik kos**, yang ingin propertinya dilihat calon penghuni dengan informasi yang jujur,
sehingga percakapan saat survei tidak dimulai dari selisih angka. Halaman pengelolaannya sudah
bisa dipakai: properti, kamar, foto, kunjungan, tagihan, dan pengeluaran.

## Yang bisa dilakukan di web ini

### Mencari dan menyaring kos, `/kos`

Masukkan nama kos atau wilayah, lalu saring menurut kota, kecamatan, tipe kos (putra, putri,
campur), kamar mandi dalam atau luar, rentang harga bulanan, dan fasilitas, mulai dari Wi-Fi,
AC, kasur, lemari, parkir, dapur bersama, laundry, CCTV, sampai penjaga kos. Hasilnya bisa
diurutkan dari yang terbaru atau menurut harga.

Setiap pilihan filter ikut tertulis di alamat halaman, jadi hasil pencarian bisa disalin dan
dibagikan persis seperti yang Anda lihat.

### Melihat detail kos dan total biayanya, `/kos/[slug]`

Halaman detail menampilkan kamar yang tersedia, fasilitas, aturan kos, dan rincian biaya:
sewa bulanan, deposit, listrik, air, internet, kebersihan. **Deposit tidak dihitung sebagai
biaya bulanan.** Estimasi ditampilkan untuk biaya masuk, bulanan, 3 bulan, 6 bulan, dan
12 bulan, lengkap dengan rumus yang dipakai supaya bisa Anda periksa sendiri.

Setiap rincian punya label kepercayaan:

| Label | Artinya |
| --- | --- |
| Biaya lengkap | Komponen utama sudah dikonfirmasi pemilik |
| Biaya sebagian | Sebagian angka masih berupa perkiraan |
| Perlu konfirmasi biaya | Ada komponen penting yang belum diketahui, sebaiknya ditanyakan saat survei |

### Membuat akun, `/masuk` dan `/daftar`

Mendaftar sebagai pencari kos atau sebagai pemilik kos. Sesi masuk disimpan dengan pengaturan
keamanan yang membuatnya tidak bisa dibaca skrip lain di halaman.

### Beranda, `/`

Beranda menjelaskan cara kerja platform: foto bangunan kos saat pagi dan malam, kawasan yang
bisa langsung dibuka pencariannya, penjelasan alat-alat yang disiapkan, langkah mencari kos
dari menyaring sampai menempati kamar, manfaat untuk kedua sisi, tanya jawab, dan contoh kos
terbaru yang bisa langsung diklik.

## Alat yang bisa dipakai

Empat alat ini terkumpul di `/alat`, dan semuanya sudah berjalan:

- **Simulasi biaya total**, menghitung sewa, deposit, listrik, air, internet, dan biaya lain,
  lalu memisahkan yang sudah dikonfirmasi pemilik dari yang masih perkiraan.
- **Bandingkan kos**, menaruh dua sampai empat kos berdampingan dalam satu tabel.
- **Rute dan sekitar**, menampilkan kos dalam radius jarak yang masuk akal dari titik asal dan
  titik tujuan.
- **Catatan kondisi kamar**, mendokumentasikan keadaan kamar saat masuk dan saat keluar.

Skor kecocokan **KosMatch** tersedia di `/kosmatch` dan endpointnya jalan, tetapi tidak
didaftarkan sebagai alat di halaman itu: penyaring di halaman cari kos sudah mengerjakan
pekerjaan yang sama.

## Prinsip yang dipegang

- **Verifikasi dulu, baru tayang.** Kos hanya muncul di pencarian setelah diperiksa admin.
- **Setiap angka membawa sumbernya.** Nilai yang dikonfirmasi pemilik dipisahkan dari nilai
  perkiraan, sehingga tidak ada angka yang tampak pasti padahal belum dicek.
- **Batasannya disebutkan.** Kalau ada komponen biaya yang belum diketahui, web ini
  menuliskannya sebagai daftar pertanyaan untuk survei, bukan mengosongkannya.
- **Ketersediaan yang lama tidak diperbarui ditandai**, bukan ditampilkan seolah pasti.
- **Kami tidak menebak, kami mencatat.** Ulasan hanya dari penyewa yang punya transaksi sah.

## Peta halaman

| Halaman | Alamat | Isi |
| --- | --- | --- |
| Beranda | `/` | Penjelasan platform, contoh kos terbaru, kartu 3D bangunan kos |
| Pencarian kos | `/kos` | Daftar kos terverifikasi dengan filter dan urutan |
| Detail kos | `/kos/[slug]` | Kamar, fasilitas, aturan, dan rincian biaya |
| Masuk | `/masuk` | Form masuk |
| Daftar | `/daftar` | Form pendaftaran pencari kos atau pemilik kos |

## Status saat ini

**Sudah bisa dicoba:** jelajah beranda, pencarian beserta seluruh filternya, halaman detail
dengan rincian biaya, pendaftaran dan masuk akun, pencarian tersimpan, pengelolaan properti dan
kamar bagi pemilik, pengajuan sewa sampai kontrak dan tagihan, dokumentasi kondisi kamar, serta
ulasan penghuni.

**Belum ada:** peta jarak dan rute tempuh, pengiriman email sungguhan, dan pembayaran sungguhan.
Ketiganya butuh kunci layanan yang belum diisi; tanpa itu tautan verifikasi dicatat di log server
dan pembayaran tidak bisa dijalankan.

> **Datanya masih contoh.** Yang tampil sekarang adalah 6 kos demo di 6 kota, Bandung, Depok,
> Jakarta Selatan, Malang, Sleman, dan Surabaya, beserta kamar, fasilitas, aturan, dan komponen
> biayanya. Semuanya fiktif dan dipakai supaya alur pencarian sampai rincian biaya bisa dicoba
> apa adanya, bukan untuk menggambarkan harga pasar yang sebenarnya.

---

**Panduan teknis.** Sisa dokumen ini menjelaskan cara menjalankan dan mengembangkan platformnya -
struktur monorepo, perintah, API, dan skema database.

## Struktur monorepo

```text
kos-platform/
├── frontend/                 # Next.js App Router, web publik
│   ├── app/                  # rute: (landing)/ dan (site)/
│   ├── components/           # landing/, kos/, motion/, komponen bersama
│   ├── hooks/                # use-media-query, use-prefers-reduced-motion
│   ├── lib/                  # api.ts (klien API), format.ts, landing.ts, constants.ts
│   └── public/images/        # foto demo + CREDITS.md
├── backend/                  # server API Express + perkakas database
│   ├── src/                  # index.ts, env.ts, adaptor.ts, api/ (rute + service), shared/
│   ├── scripts/              # db-local.mjs (kelola cluster) dan db-sql.mjs (jalankan SQL)
│   └── uploads/              # berkas unggahan (di-gitignore)
├── supabase/                 # skema dan data demo (warisan Edge Function lama)
│   ├── migrations/           # DDL: 46 tabel, 23 enum, 78 foreign key, trigger updated_at
│   ├── seed.sql              # 8 akun demo + 6 properti contoh
│   └── functions/api/        # Edge Function lama, disimpan sebagai pembanding
├── .env.example              # referensi seluruh environment variable
└── package.json              # npm workspaces (frontend + backend) + skrip bersama
```

## Teknologi

| Bagian | Dipakai |
| --- | --- |
| Frontend | Next.js 16.2.3 (App Router, Turbopack), React 19.2.4, TypeScript 5, Tailwind CSS v4, motion 14, lenis, lucide-react, three + @react-three/fiber (kartu 3D) |
| Backend | Express 4, TypeScript, Zod 3, `pg`. Dijalankan dengan `tsx`, tanpa Deno atau Docker |
| Database | PostgreSQL 16+, **tanpa ORM**: skema, migration, dan seluruh query ditulis SQL langsung |
| Auth | bcrypt + JWT sendiri; sesinya dikirim lewat cookie HttpOnly `access_token` dan `refresh_token` |
| Berkas | Folder lokal `backend/uploads`; berkas privat hanya lewat tautan bertanda tangan |
| Server | Rute per modul, validasi Zod di batas masuk, pembatasan peran per rute, error handler terpusat |

Sudah ada di `.env.example` tetapi **belum dipakai kode**: Google Maps Platform, Cloudinary,
dan Sentry. Midtrans dan Resend sudah terpakai di sisi server, tetapi kuncinya boleh kosong:
tanpa kunci Midtrans tautan pembayaran belum dibuat, dan tanpa kunci Resend tautan verifikasi
email dicatat di log fungsi alih-alih dikirim.

## Prasyarat

- Node.js **20.9+** (syarat Next.js 16; diuji pada Node 22.17)
- npm 10+
- Database **PostgreSQL 16+**, salah satu:
  - **cluster lokal** untuk mengembangkan tanpa internet (PostgreSQL terpasang di mesin, diuji pada PostgreSQL 18), atau
  - **PostgreSQL terkelola** (Aiven, Neon, Supabase, dsb.), cukup connection string-nya

## Menjalankan stack dev (Windows, sudah diuji)

Jalankan dari folder `kos-platform` (git-bash):

```bash
npm install                  # dependency seluruh workspace (hoisted ke kos-platform/node_modules)
npm run db:local -- start    # cluster PostgreSQL dev di 127.0.0.1:5433
npm run db:setup             # buat tabel lalu isi data demo (sekali saja)
npm run dev:api              # server API di http://localhost:4000
npm run dev                  # web di http://localhost:3000 (terminal terpisah)
```

Peramban memanggil `/api/v1` milik situs sendiri; `frontend/next.config.ts` meneruskannya
ke server Express, sehingga cookie sesinya first-party dan tidak ada permintaan lintas asal.
Alamat server bisa dipindah lewat `API_FUNGSI_URL` tanpa menyunting kode.

### Pilihan A, PostgreSQL terkelola

Ambil connection string dari penyedia database, lalu tempel ke `DATABASE_URL` di
`backend/.env`.

> **Pakai connection pooler bila penyedianya punya.** Contohnya Supabase: koneksi langsung
> (`db.<ref>.supabase.co`) hanya punya alamat IPv6, sedangkan session pooler selalu IPv4.
>
> `backend/scripts/db-sql.mjs` mengurus TLS otomatis. Menempelkan `?sslmode=require` di
> connection string tidak membantu, karena driver `pg` mengabaikan pengaturan TLS aplikasi
> begitu parameter itu ada.

```bash
npm run db:migrate    # buat seluruh tabel
npm run db:seed       # 8 akun demo + 6 properti contoh
```

### Pilihan B, PostgreSQL lokal

```bash
npm run db:local -- init     # buat cluster PostgreSQL di 127.0.0.1:5433 (sekali saja)
npm run db:setup             # buat seluruh tabel, lalu isi data demo
```

Cluster lokal dipakai server API dan perkakas database sekaligus, jadi seluruh alur bisa
dicoba tanpa internet.

Lalu nyalakan server API dan web di dua terminal:

```bash
npm run dev:api              # API  → http://localhost:4000
npm run dev                  # web  → http://localhost:3000
```

## Perintah

Semua perintah dijalankan dari folder `kos-platform`:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` · `dev:web` | Nyalakan dev server frontend (Turbopack) |
| `npm run dev:api` | Nyalakan server API Express (`tsx watch`) |
| `npm run build` · `build:web` | Build produksi frontend (`next build`) |
| `npm run start` | Jalankan hasil build frontend |
| `npm run check:api` | Type-check server API (`tsc --noEmit`) |
| `npm run db:migrate` | Jalankan seluruh migration SQL ke database di `DATABASE_URL` |
| `npm run db:seed` | Isi akun demo dan properti contoh |
| `npm run db:setup` | `db:migrate` lalu `db:seed` sekaligus |
| `npm run db:local -- init\|start\|stop\|status` | Kelola cluster PostgreSQL dev lokal |

### Catatan menjalankan

- **Port web bisa berpindah.** Bila 3000 sedang dipakai proses lain, Next otomatis memakai port berikutnya dan menuliskannya di terminal.
- **Cookie sesi ikut karena satu asal.** Halaman memanggil `/api/v1` di domainnya sendiri, dan `frontend/next.config.ts` yang meneruskannya ke server Express. Memanggil alamat server langsung membuat login tampak berhasil tetapi sesinya tidak pernah terbaca, sebab cookie `SameSite=Lax` tidak dikirim pada permintaan lintas situs.
- **Origin yang boleh memanggil API diatur `FRONTEND_URL`** di `backend/.env`, dipisah koma. Bila kosong, hanya `http://localhost:3000` dan `http://127.0.0.1:3000`.
- **Unggahan tersimpan lokal.** Foto dan dokumen masuk ke `backend/uploads`; folder itu di-gitignore dan harus ikut disalin bila server dipindah.
- **Tanpa API.** Halaman tetap tampil; bagian daftar kos menampilkan keterangan bahwa daftar belum dapat dimuat, bukan data contoh.
- **Cluster DB perlu dihidupkan ulang tiap boot.** `npm run db:local -- start`.

## Environment variable

Referensi lengkap ada di [`.env.example`](.env.example). Ada dua tempat yang berbeda:

| Variable | Tempat | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `backend/.env` | Untuk perkakas database lokal: migration, seed, dan `db:local` |
| `DB_SSL` | `backend/.env` | Mode TLS ke database: `auto` (default), `disable`, atau `require` |
| `FRONTEND_URL` | secret fungsi | Origin yang boleh memanggil API; boleh beberapa, dipisah koma |
| `MIDTRANS_SERVER_KEY` | secret fungsi | Kunci Midtrans; kosong berarti tautan pembayaran belum dibuat |
| `RESEND_API_KEY` | secret fungsi | Pengirim email verifikasi; kosong berarti tautannya dicatat di log fungsi |
| `STORAGE_BUCKET` | secret fungsi | Bucket foto kamar, default `room-photos` |
| `MODE_PENGEMBANGAN` | secret fungsi | `true` membuka rute simulasi pembayaran; bawaannya mati |
| `TOKEN_PENGEMBANGAN` | secret fungsi | `true` menyertakan token mentah di jawaban; bawaannya mati, jangan dinyalakan di produksi |

Variabel berawalan `SUPABASE_` disuntikkan platform sendiri dan tidak perlu diisi.

## Halaman

| Rute | Grup | Isi |
| --- | --- | --- |
| `/` | `(landing)` | Landing page: hero foto, marquee kawasan, manifesto, produk, solusi, lokasi, kos terbaru dari API, cara kerja, manfaat, angka, tentang, tanya jawab, ajakan akhir, dan kartu 3D rumah kos |
| `/kos` | `(site)` | Pencarian kos dengan filter (kata kunci, kota, kecamatan, tipe, kamar mandi, rentang harga, fasilitas, urutan), seluruh filter ditulis ke URL sehingga hasil bisa dibagikan |
| `/kos/[slug]` | `(site)` | Detail properti: kamar, fasilitas, aturan, komponen biaya, dan ringkasan TrueCost |
| `/masuk` · `/daftar` | `(auth)` | Form autentikasi yang terhubung API |
| `not-found` · `error` | akar app | Halaman 404 dan 500, lengkap dengan header/footer situs |

Landing memakai chrome sendiri (header dan footer khusus, tipografi DM Sans + Space
Grotesk + JetBrains Mono lewat kelas `landing-scope`); halaman lain memakai chrome situs
yang lebih sederhana. Pemisahannya ada di `app/(landing)/layout.tsx` dan `app/(site)/layout.tsx`.

## API

Prefix `/api/v1`. Semua respons berbentuk
`{ success, message, data?, meta?, errors? }`.

Endpointnya ada di `backend/src/api/routes.ts`, satu berkas untuk seluruh modul,
sehingga daftar alamatnya bisa dibaca di satu tempat:

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
| 400 | Validasi Zod gagal, `errors[]` berisi `{ field, message }` |
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
| `supabase/migrations/20261107150000_naikkan_database_lama.sql` | Untuk database yang dibuat sebelum pindah ke SQL: memasang default UUID, default waktu, dan trigger tanpa menghapus data |
| `supabase/seed.sql` | 8 akun demo, 14 fasilitas, 6 properti lengkap dengan kamar, foto, aturan, dan komponen biaya |

Jalankan dengan `npm run db:migrate` dan `npm run db:seed` (keduanya membaca `DATABASE_URL`).

Tiga hal yang diurus database sendiri, dulu dikerjakan aplikasi:

- **`id`** punya `DEFAULT gen_random_uuid()`, jadi UUID dibuat database, bukan kode.
- **`created_at` / `updated_at`** punya default `now()`, dan trigger `set_updated_at()`
  memperbarui `updated_at` di setiap `UPDATE`, tidak bisa terlupa di query.
- **Keunikan email** dijaga indeks unik, bukan pemeriksaan terpisah di aplikasi, sehingga
  dua pendaftaran bersamaan tidak bisa sama-sama lolos (fungsi menerjemahkan pelanggaran
  indeks `23505` menjadi 409 "Email sudah terdaftar").

Kelompok tabelnya: pengguna dan profil (`users`, `owner_profiles`, `tenant_profiles`,
`password_reset_tokens`, `refresh_sessions`, `user_preferences`, `favorites`), properti
(`properties`, `rooms`, `property_images`, `room_images`, `facilities`,
`property_facilities`, `room_facilities`, `property_rules`, `cost_components`), transaksi
(`bookings`, `contracts`, `invoices`, `payments`, beserta tabel riwayat status), operasional
(`maintenance_requests`, `room_condition_reports`, `visits`, `expenses`), dan admin
(`reports`, `audit_logs`, `notifications`, `content_articles`).

Sebagian besar tabel sudah dipakai endpoint. Yang belum tersambung masih tabel pendukung
internal, misalnya `content_articles`, `reports`, dan `audit_logs`.

### Cara API menyambung ke database

`backend/src/shared/db.ts` membuat satu `pg.Pool` untuk seluruh proses server:

- **Parameter query, bukan rangkaian teks.** Semua nilai filter dikirim sebagai `$1`,
  `$2`, … sehingga filter pencarian yang jumlahnya berubah-ubah tetap aman dari injeksi.
- **Pool dibagi semua permintaan.** Batasnya `DB_POOL_MAX` (default 10), cukup untuk
  hosting gratis yang biasanya membatasi 20 koneksi.
- **`withTransaction`** membungkus `BEGIN`/`COMMIT`/`ROLLBACK` dan selalu melepas koneksi
  kembali ke pool, sehingga satu kegagalan tidak menahan koneksi.
- **Kolom selalu ditulis eksplisit.** Tidak ada `SELECT *`, sehingga kolom sensitif tidak
  ikut terkirim hanya karena ada kolom baru ditambahkan.

### RLS dan kunci akses Supabase (warisan)

Skema `public` pada migration lama menyiapkan RLS dan mencabut hak akses peran `anon` serta
`authenticated`. Itu berlaku bila database-nya Supabase dan dulu bisa diakses lewat REST
API bawaan. Sekarang API menyambung langsung sebagai pemilik tabel, jadi RLS tidak lagi
menjadi lapisan keamanan yang dipakai; migration-nya dibiarkan utuh karena tidak berbahaya
di PostgreSQL biasa dan menjaga riwayat tetap bisa dijalankan ulang.
tabel melewati RLS.

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

Alamat emailnya sengaja tidak ikut berganti saat mereknya berubah: akun itu sudah
ada di database, dan mengganti tulisan di dokumentasi saja akan membuat pembaca
mencoba alamat yang tidak pernah ada.

Seed juga mengisi 6 properti contoh (Kos Melati Putri, Kos Anggrek Campur, Kos Cendana Putra,
Kos Bougenville Putri, Kos Flamboyan Campur, Kos Kenanga Putri) di Bandung, Depok, Jakarta
Selatan, Malang, Sleman, dan Surabaya, lengkap dengan kamar, foto, fasilitas, aturan, dan
komponen biaya sehingga halaman `/kos` dan `/kos/[slug]` langsung ada isinya.

## Simulasi biaya (TrueCost)

`backend/src/api/cost-summary.ts` menghitung ringkasan biaya untuk halaman
detail dengan aturan yang dipegang ketat:

- Deposit bukan biaya bulanan dan tidak dihitung sebagai pengeluaran hilang.
- Biaya variabel selalu diberi label estimasi, tidak pernah diklaim pasti.
- Bila ada komponen yang belum dikonfirmasi, total tidak disimpulkan pasti dan komponennya
  dicantumkan di daftar `unknowns`.
- Rumus yang dipakai ikut dikirim ke klien agar pengguna bisa memeriksa sendiri.

## Fase pengembangan

| Fase | Isi | Status |
| --- | --- | --- |
| 1 | Foundation: monorepo, Next.js, Express API, TypeScript, PostgreSQL, skema SQL langsung, error handling, API versioning | Selesai |
| 2 | Authentication & Authorization: register, login, logout, profil, verifikasi email, lupa sandi, RBAC | Selesai |
| 3 | Property & Room Management: kelola properti dan kamar pemilik, foto kamar, moderasi admin | Selesai |
| 4 | Search & Discovery (KosMatch, TrueCost Simulator) | Selesai |
| 5 | Booking & Contract: pengajuan sewa, keputusan pemilik, kontrak sewa | Selesai |
| 6 | Payment & Billing: tagihan, pembayaran Midtrans, webhook | Selesai untuk alurnya; kunci Midtrans masih perlu diisi untuk pembayaran sungguhan |
| 7 | Tenant & Owner Operations: kunjungan, perbaikan, verifikasi pemilik | Selesai |
| 8 | Admin Management: moderasi properti, pengguna, verifikasi pemilik, audit | Selesai |
| 9 | Map & Location | Sebagian, koordinat dan pencarian sekitar sudah jalan; rute tempuh belum |
| 10 | Testing & Polishing | Belum ada test otomatis di repo |

## Keamanan

- **Kata sandi di-hash bcrypt** (biaya 10) dan hanya hash-nya yang disimpan; password asli
  tidak pernah masuk database maupun log.
- **Sesi hanya lewat cookie HttpOnly** (tidak di localStorage), dikirim sebagai
  `access_token` dan `refresh_token`; nilainya tidak bisa dibaca skrip di halaman.
- **Query memakai parameter, bukan rangkaian teks.** Tidak ada satu pun nilai dari pengguna
  yang disisipkan ke dalam teks SQL, termasuk filter pencarian yang jumlahnya berubah-ubah.
- **Daftar kolom ditulis eksplisit.** Tidak ada `SELECT *`, sehingga kolom sensitif seperti
  hash kata sandi tidak ikut terkirim hanya karena ada kolom baru ditambahkan.
- **Keunikan dijaga database.** Pendaftaran email ganda ditolak indeks unik, bukan oleh
  pemeriksaan yang bisa dilewati dua permintaan bersamaan.
- **Token sesi ditandatangani server sendiri** (JWT HS256); peran tidak diambil dari token
  melainkan dibaca ulang dari database di setiap permintaan, sehingga akun yang dinonaktifkan
  langsung tertolak.
- **Status pembayaran hanya datang dari webhook** yang tanda tangannya diperiksa lebih dulu,
  bukan dari halaman kembalian di peramban.
- **Berkas sensitif di folder privat** (dokumen identitas, foto laporan perbaikan) dan hanya
  dibuka lewat tautan bertanda tangan yang berlaku lima menit; tanda tangannya diperiksa
  server sebelum berkas dikirim.
- Setiap rute memeriksa peran dan kepemilikan data; yang tidak berhak dijawab 404 bila
  menyebut 403 akan membocorkan keberadaan datanya.
- Jangan pernah commit file `.env` asli. Gunakan `.env.example` sebagai referensi.

## Kredit foto

Foto kamar dan rumah pada halaman demo berasal dari Pexels. Lisensi Pexels tidak mewajibkan
atribusi, tetapi kredit tetap dicantumkan di
[`frontend/public/images/CREDITS.md`](frontend/public/images/CREDITS.md) sebagai penghargaan
kepada fotografernya.
