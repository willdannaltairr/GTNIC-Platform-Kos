-- ════════════════════════════════════════════════════════════════════════════
-- Peta lokasi: data acuan kampus dan daerah.
--
-- Kenapa perlu:
--
-- Beranda baru menampilkan rekomendasi kos dari titik GPS pengunjung, filter
-- "dari lokasi ke lokasi", area terpopuler, dan kos sekitar kampus. Yang ketiga
-- dan keempat butuh daftar daerah dan kampus yang stabil — bukan hasil hitung
-- dari tabel properti, karena properti bisa berubah kapan saja sementara acuan
-- wilayah jauh lebih jarang berubah.
--
-- Kenapa tabel terpisah, bukan kolom di `properties`:
--
-- Satu properti hanya punya satu kota, sedangkan satu daerah menaungi banyak
-- properti dan satu kampus menaungi banyak properti di sekitarnya. Menyimpannya
-- di baris properti berarti daftar area dan kampus harus dirakit ulang dari data
-- yang tersebar, dan nama daerah yang tertulis berbeda-beda ("Jakarta Selatan"
-- vs "Jakarta selatan") akan terhitung sebagai dua area berbeda.
--
-- Kenapa tanpa trigger `updated_at`:
--
-- Keduanya tabel acuan yang isinya nyaris tidak pernah berubah; tidak ada alur
-- di aplikasi yang mengubahnya. Menambahkan kolom yang tidak pernah dibaca hanya
-- menambah kolom yang harus ikut diisi saat seed.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS` atau
-- idempoten, sehingga aman dijalankan di database yang sudah punya tabelnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Kampus ────────────────────────────────────────────────────────────────
-- Dipakai fitur "kos sekitar kampus". Koordinat wajib: tanpa titik kampus,
-- perhitungan jarak tidak punya arti, dan barisnya hanya akan menyesatkan.
--
-- `abbreviation` dipisahkan dari `name` karena kartu di beranda menampilkan
-- singkatan (UI, ITB, UGM) sementara pencarian dan judul memakai nama panjang.
-- Menyimpan keduanya menghindari pemotongan nama di frontend, yang hasilnya
-- berbeda-beda per lebar layar.

CREATE TABLE IF NOT EXISTS "campuses" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abbreviation" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "campuses_slug_key" ON "campuses"("slug");

-- ─── Daerah ────────────────────────────────────────────────────────────────
-- Dipakai fitur "area terpopuler". Satu tabel untuk kota dan kecamatan, karena
-- keduanya dihitung dengan cara yang sama dan hanya berbeda pada kolom mana di
-- `properties` yang dicocokkan — perbedaan itu ditandai kolom `type`.
--
-- Koordinat boleh kosong: daftar area tetap berguna tanpa peta, sedangkan
-- memaksa mengisi koordinat hanya akan diisi angka karangan. Baris berkoordinat
-- NULL otomatis tidak ikut pada perhitungan yang butuh titik.
--
-- `type` dibatasi CHECK, bukan dibiarkan teks bebas: nilai ini yang menentukan
-- cara pencocokan ke properti (kota atau kecamatan), jadi nilai di luar daftar
-- akan menghasilkan hitungan yang salah tanpa error.

CREATE TABLE IF NOT EXISTS "regions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "city" TEXT,
    "province" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "regions_type_check" CHECK ("type" IN ('CITY', 'DISTRICT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "regions_slug_key" ON "regions"("slug");

-- ─── Index pendukung ───────────────────────────────────────────────────────
-- Pada jumlah baris sekarang tabel ini masih kecil, jadi perencana query
-- kemungkinan besar tetap membaca seluruh tabel dan itu memang lebih murah.
-- Indexnya ada untuk penelusuran manual di Table Editor dan agar query yang
-- memfilter `type`/`city` tidak berubah menjadi pemindaian penuh ketika daftar
-- kampus dan daerah bertambah banyak.

CREATE INDEX IF NOT EXISTS "regions_type_idx" ON "regions"("type");
CREATE INDEX IF NOT EXISTS "regions_city_idx" ON "regions"("city");
CREATE INDEX IF NOT EXISTS "campuses_city_idx" ON "campuses"("city");
CREATE INDEX IF NOT EXISTS "regions_popular_idx" ON "regions"("is_popular");
CREATE INDEX IF NOT EXISTS "campuses_popular_idx" ON "campuses"("is_popular");

-- ════════════════════════════════════════════════════════════════════════════
-- KEAMANAN — menyalakan RLS untuk kedua tabel baru.
--
-- Migration `20261107130000_kunci_akses_public.sql` menyalakan RLS untuk tabel
-- yang ADA SAAT ITU, dan mencabut hak `anon`/`authenticated`. Tabel yang dibuat
-- setelahnya tidak ikut terjaga olehnya: skema `public` diekspos Supabase
-- sebagai REST API (PostgREST) yang bisa dipanggil siapa saja yang memegang
-- kunci publik proyek, dan tanpa RLS seluruh isi tabel ini terbuka.
--
-- Karena itu penutupannya dilakukan di sini, di berkas yang membuat tabelnya —
-- supaya tidak bergantung pada ada-tidaknya seseorang mengingat langkah
-- tambahan setelah menambah tabel.
--
-- Backend Express terhubung langsung sebagai pemilik tabel, dan pemilik tabel
-- melewati RLS, jadi seluruh fitur tetap bekerja. Yang tertutup hanya jalur
-- PostgREST. Tidak ada policy yang dibuat — sama seperti tabel lain di proyek
-- ini: akses hanya lewat backend, bukan langsung dari browser.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public."campuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."regions" ENABLE ROW LEVEL SECURITY;

-- Pencabutan hak eksplisit untuk kedua tabel ini.
--
-- `kunci_akses_public` sudah menjalankan ALTER DEFAULT PRIVILEGES, jadi tabel
-- baru seharusnya memang tidak mendapat hak apa pun untuk `anon`/`authenticated`.
-- Pencabutan ulang di sini membuat berkas ini tetap aman bila dijalankan pada
-- database yang belum pernah menjalankan migration itu — misalnya database lama
-- yang dirapikan lewat `20261107150000_naikkan_database_lama.sql`. Peran itu
-- hanya ada di Supabase, jadi di PostgreSQL biasa bagian ini dilewati.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."campuses" FROM anon, authenticated;
    REVOKE ALL ON TABLE public."regions" FROM anon, authenticated;
    RAISE NOTICE 'RLS dinyalakan dan hak anon/authenticated dicabut dari campuses & regions.';
  ELSE
    RAISE NOTICE 'Peran anon/authenticated tidak ada (PostgreSQL biasa) — RLS tetap dinyalakan.';
  END IF;
END $$;

COMMIT;
