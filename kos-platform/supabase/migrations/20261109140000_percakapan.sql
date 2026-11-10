-- ════════════════════════════════════════════════════════════════════════════
-- Percakapan antara penghuni dan pemilik kos.
--
-- Kenapa perlu:
--
-- Sampai sekarang kedua pihak hanya bisa bertemu lewat booking, kunjungan, dan
-- laporan perbaikan: semuanya punya bentuk yang kaku dan berjenjang. Pertanyaan
-- yang paling sering muncul justru yang tidak masuk ke ketiganya — "kamar itu
-- masih kosong?", "boleh lihat akhir pekan?", "airnya sudah normal?", dan
-- tawar-menawar harga. Tanpa tempat untuk itu, pertanyaan seperti itu berpindah
-- ke luar platform, dan riwayatnya hilang bersama percakapannya.
--
-- Bentuknya sengaja sesederhana mungkin: SATU percakapan per penghuni per
-- properti, dan pesan teks di dalamnya.
--
--   * Percakapan dipisah per properti, bukan per pemilik. Pertanyaan tentang
--     Kos Melati dan Kos Anggrek adalah dua urusan berbeda walau pemiliknya
--     sama, dan menggabungkannya membuat isinya bercampur.
--
--   * Kuncinya (tenant_id, property_id, owner_id), TIGA kolom, bukan dua.
--     `owner_id` dicatat saat percakapan dimulai. Kalau propertinya berpindah
--     tangan, penghuni memulai percakapan baru dengan pemilik barunya, dan
--     percakapan lama tetap tinggal sebagai riwayat bersama pihak yang dulu
--     memang menjawabnya. Tanpa `owner_id` di kunci, percakapan lama akan ikut
--     terbaca pemilik baru, padahal ia tidak pernah ikut berbicara di sana.
--
--   * `read_at` ada di tabel pesan, bukan di tabel tersendiri. Isinya hanya
--     "sudah dibaca penerimanya", dan itu cukup karena percakapannya selalu
--     1:1 — pengirimnya cuma satu dari dua orang yang ada di percakapan itu.
--     Tabel status-baca terpisah akan menambah satu baris per pesan per orang
--     untuk informasi yang sama.
--
-- Lampiran berkas sengaja tidak ada di sini. Foto punya tempatnya sendiri di
-- laporan perbaikan dan dokumentasi kondisi kamar, dan di percakapan ia akan
-- bercampur dengan keperluan lain tanpa konteks yang menahannya.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS` atau dijaga
-- pemeriksaan, sehingga aman dijalankan di database yang sudah punya tabelnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "booking_id" UUID,
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_messages" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    -- Diisi saat penerimanya membaca; pengirimnya sendiri tidak pernah mengisi
    -- kolom ini untuk pesannya sendiri.
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- Satu percakapan per penghuni per properti per pemilik, seperti penjelasan di
-- atas. Indeks unik inilah yang menahan percakapan ganda saat penghuni menekan
-- tombol "Kirim pesan" dua kali, bukan pemeriksaan terpisah di aplikasi yang
-- bisa dilewati dua permintaan bersamaan.
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_pihak_key"
  ON "conversations"("tenant_id", "property_id", "owner_id");

-- Daftar percakapan selalu dibaca per pihak lalu diurutkan dari yang terbaru,
-- jadi yang dipakai indeks gabungan: dengan begitu pengurutannya tidak perlu
-- menyortir ulang seluruh baris yang cocok.
CREATE INDEX IF NOT EXISTS "conversations_tenant_idx"
  ON "conversations"("tenant_id", "last_message_at" DESC);

CREATE INDEX IF NOT EXISTS "conversations_owner_idx"
  ON "conversations"("owner_id", "last_message_at" DESC);

-- Setiap halaman pesan dan setiap penghitungan belum dibaca membaca lewat id
-- percakapannya, dan penghapusan berantai ikut memakainya.
CREATE INDEX IF NOT EXISTS "conversation_messages_thread_idx"
  ON "conversation_messages"("conversation_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_tenant_id_fkey') THEN
    ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_owner_id_fkey') THEN
    ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  -- CASCADE: properti yang benar-benar dihapus membawa percakapannya. Properti
  -- yang hanya ditarik dari peredaran memakai `deleted_at`, jadi riwayatnya
  -- tetap utuh.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_property_id_fkey') THEN
    ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_property_id_fkey"
      FOREIGN KEY ("property_id") REFERENCES "properties"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- SET NULL, bukan CASCADE: booking yang hilang tidak boleh menghapus
  -- percakapan yang isinya sudah berbicara tentang banyak hal lain.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_booking_id_fkey') THEN
    ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_booking_id_fkey"
      FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_messages_conversation_id_fkey'
  ) THEN
    ALTER TABLE "conversation_messages"
      ADD CONSTRAINT "conversation_messages_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- RESTRICT: pengirim pesan tidak boleh dihapus selama pesannya masih ada.
  -- Menghapus akun tidak boleh menghilangkan separuh percakapan, sehingga
  -- kalimat yang tersisa tidak lagi bisa dipahami.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_messages_sender_id_fkey') THEN
    ALTER TABLE "conversation_messages"
      ADD CONSTRAINT "conversation_messages_sender_id_fkey"
      FOREIGN KEY ("sender_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'conversations_set_updated_at') THEN
    CREATE TRIGGER "conversations_set_updated_at"
      BEFORE UPDATE ON "conversations"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversation_messages" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."conversations" FROM anon, authenticated;
    REVOKE ALL ON TABLE public."conversation_messages" FROM anon, authenticated;
    RAISE NOTICE 'RLS dinyalakan dan hak anon/authenticated dicabut dari tabel percakapan.';
  ELSE
    RAISE NOTICE 'Peran anon/authenticated tidak ada (PostgreSQL biasa), RLS tetap dinyalakan.';
  END IF;
END $$;

-- Jenis notifikasi untuk pesan baru.
DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_MESSAGE';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Tipe NotificationType tidak ada, penambahan jenis dilewati.';
END $$;

COMMIT;
