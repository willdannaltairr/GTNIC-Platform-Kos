-- Percakapan pada laporan perbaikan.
--
-- Status laporan hanya bisa dipindah pemilik, sedangkan penghuni sering perlu
-- menjelaskan kerusakannya lebih rinci, dan pemilik perlu bertanya balik
-- sebelum datang. Tanpa tempat untuk itu, keduanya berpindah ke pesan pribadi,
-- dan riwayat penanganannya hilang dari laporan yang justru menjadi catatannya.
--
-- Aman dijalankan berulang: tabel dan indeksnya dibuat hanya bila belum ada.
CREATE TABLE IF NOT EXISTS "maintenance_comments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "request_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "body" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT "maintenance_comments_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "maintenance_comments"
    ADD CONSTRAINT "maintenance_comments_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "maintenance_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_comments"
    ADD CONSTRAINT "maintenance_comments_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Diurutkan per laporan lalu waktu: satu laporan dibaca sebagai satu percakapan.
CREATE INDEX IF NOT EXISTS "maintenance_comments_request_created_idx"
  ON "maintenance_comments" ("request_id", "created_at");
