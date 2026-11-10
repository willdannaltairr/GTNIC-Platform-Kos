-- Pencarian tersimpan beserta pemberitahuannya.
--
-- Menyimpan penyaring pencarian supaya pengunjung tidak perlu menyusun ulang
-- setiap kali membuka halaman cari kos, dan supaya ia bisa diberi tahu begitu
-- ada kos baru yang cocok.
--
-- Penyaringnya disimpan sebagai `jsonb`, bukan sebagai kolom per penyaring.
-- Bentuk penyaring di halaman pencarian terus bertambah, dan menambah kolom
-- setiap kali berarti migrasi untuk hal yang isinya hanya dibaca kembali oleh
-- halaman yang menuliskannya sendiri. Yang membacanya di luar halaman itu hanya
-- pencocokan pemberitahuan, dan itu pun lewat kode aplikasi, bukan lewat SQL
-- yang butuh kolom bertipe.
--
-- `last_notified_at` mencatat kapan pencarian ini terakhir menghasilkan
-- pemberitahuan. Dipakai untuk menampilkan keadaannya, bukan sebagai pembatas
-- pengiriman; pembatasnya adalah pemeriksaan duplikat per properti, supaya satu
-- kos yang sama tidak diberitakan dua kali.
--
-- RLS dinyalakan tanpa policy: tabel ini hanya diakses lewat Edge Function yang
-- memakai koneksi database langsung. Tanpa RLS, isinya terbuka bagi siapa pun
-- yang memegang kunci publik proyek lewat PostgREST.

CREATE TABLE IF NOT EXISTS "saved_searches" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "last_notified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "saved_searches_user_idx"
  ON "saved_searches" ("user_id", "created_at" DESC);

ALTER TABLE public."saved_searches" ENABLE ROW LEVEL SECURITY;

-- Jenis notifikasi untuk kos baru yang cocok dengan pencarian tersimpan.
--
-- Ditambahkan lewat ALTER TYPE, bukan dengan membuat enum baru: kolomnya sudah
-- bertipe ini dan tidak ada cara menambah anggota enum selain ini. Nilai baru
-- belum boleh dipakai di transaksi yang sama dengan penambahannya, dan memang
-- tidak dipakai di sini - kode aplikasi baru memakainya setelah migrasi ini
-- selesai.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SAVED_SEARCH_MATCH';
