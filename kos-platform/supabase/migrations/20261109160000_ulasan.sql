-- ════════════════════════════════════════════════════════════════════════════
-- Ulasan penghuni: moderasi, indeks, dan jenis notifikasinya.
--
-- Kenapa perlu:
--
-- Tabel `reviews` sudah ada sejak skema awal lengkap dengan kolom penilaiannya
-- (kebersihan, lokasi, fasilitas, layanan pemilik), tetapi belum ada satu pun
-- cara mengisinya, dan belum ada tempat mencatat keputusan moderasinya. Tanpa
-- catatan itu, ulasan yang ditolak atau disembunyikan tidak bisa dijelaskan
-- kepada penulisnya, dan pertanyaan "kenapa ulasan saya hilang" tidak punya
-- jawaban.
--
-- Kenapa satu ulasan per booking, bukan per properti:
--
-- Penghuni yang pernah menyewa dua kali di properti yang sama punya dua
-- pengalaman berbeda, dan pengalaman keduanya justru yang paling menarik
-- dibaca calon penghuni berikutnya. Kuncinya `booking_id`, dengan satu
-- pengecualian penting: booking yang id-nya NULL tidak boleh dianggap sama.
-- Indeks unik biasa memperlakukan dua NULL sebagai berbeda, dan itu memang
-- yang diinginkan di sini.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS` atau dijaga
-- pemeriksaan, sehingga aman dijalankan di database yang sudah punya tabelnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Catatan keputusan moderasi. Terpisah dari `review_status` karena status
-- menjawab "sekarang bagaimana", sedangkan kolom ini menjawab "siapa yang
-- memutuskan dan kenapa".
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderated_by" UUID;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderated_at" TIMESTAMPTZ(3);
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "moderation_notes" TEXT;

-- Satu ulasan per booking. Booking yang belum terhubung (booking_id NULL) tidak
-- dibatasi, karena kolom NULL tidak pernah dianggap sama oleh indeks unik.
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_id_key"
  ON "reviews"("booking_id");

-- Halaman properti membaca ulasan yang sudah tayang, diurutkan dari yang
-- terbaru. Yang dipakai indeks gabungan: dengan begitu pengurutan tidak perlu
-- menyortir ulang seluruh ulasan properti itu.
CREATE INDEX IF NOT EXISTS "reviews_property_status_idx"
  ON "reviews"("property_id", "review_status", "created_at" DESC);

-- Daftar ulasan milik satu penghuni, dipakai halaman ulasan saya.
CREATE INDEX IF NOT EXISTS "reviews_tenant_idx"
  ON "reviews"("tenant_id", "created_at" DESC);

-- Antrean moderasi admin: disaring per status lalu diurutkan dari yang paling
-- lama menunggu, supaya yang paling lama tidak tertinggal di bawah.
CREATE INDEX IF NOT EXISTS "reviews_status_idx"
  ON "reviews"("review_status", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_moderated_by_fkey') THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_moderated_by_fkey"
      FOREIGN KEY ("moderated_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Jenis notifikasi untuk keputusan atas ulasan.
--
-- Tiga jenis, bukan satu: yang tayang, yang ditolak, dan yang disembunyikan
-- adalah tiga kabar berbeda bagi penulisnya, dan menyatukannya membuat ia harus
-- membuka halamannya dulu untuk tahu yang mana yang terjadi. Yang ditolak dan
-- yang disembunyikan sama-sama membawa alasan, karena keduanya sama-sama
-- memutuskan sesuatu atas tulisan orang.
DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_APPROVED';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_REJECTED';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_HIDDEN';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Tipe NotificationType tidak ada, penambahan jenis dilewati.';
END $$;

COMMIT;
