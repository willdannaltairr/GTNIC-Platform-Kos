-- ════════════════════════════════════════════════════════════════════════════
-- Token verifikasi email.
--
-- Kenapa perlu:
--
-- Kolom `users.email_verified_at` sudah ada sejak skema awal, tetapi tidak ada
-- satu pun cara mengisinya: pendaftaran tidak pernah mengirim tautan, dan tidak
-- ada tabel yang menyimpan tautannya. Akibatnya alamat email yang dipakai
-- mendaftar tidak pernah dipastikan benar, padahal seluruh pemberitahuan
-- penting (booking, tagihan, atur ulang sandi) dikirim ke alamat itu.
--
-- Kenapa tabel sendiri, bukan memakai ulang `password_reset_tokens`:
--
-- Keduanya punya masa berlaku dan aturan sekali pakai yang berbeda. Tautan
-- atur ulang sandi sengaja berumur pendek (60 menit) karena ia kunci akun,
-- sedangkan tautan verifikasi email wajar terbuka berjam-jam kemudian saat
-- penerimanya baru membuka kotak masuk. Menyatukan keduanya berarti salah satu
-- masa berlakunya harus dikorbankan.
--
-- Bentuknya sengaja dibuat sebentuk dengan `password_reset_tokens`: satu baris
-- per akun, token disimpan sebagai hash, dan barisnya ditandai `used_at` ketika
-- dipakai. Satu baris per akun berarti meminta tautan baru otomatis membatalkan
-- tautan lama, jadi tidak ada kunci lama yang masih hidup tanpa diketahui
-- pemiliknya.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS` atau
-- dijaga pemeriksaan, sehingga aman dijalankan di database yang sudah punya
-- tabelnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- Indeks unik `user_id` bukan sekadar percepatan pencarian: ia yang menegakkan
-- aturan satu tautan aktif per akun, termasuk saat dua permintaan kirim ulang
-- datang hampir bersamaan.
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_user_id_key"
  ON "email_verification_tokens"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key"
  ON "email_verification_tokens"("token");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "email_verification_tokens"
      ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "email_verification_tokens" ENABLE ROW LEVEL SECURITY;

-- Tabel ini hanya dibaca dan ditulis backend memakai kunci rahasia. Tidak ada
-- satu pun policy untuk anon/authenticated, dan haknya dicabut di sini, supaya
-- isinya tidak bisa dibaca langsung lewat Data API.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."email_verification_tokens" FROM anon, authenticated;
    RAISE NOTICE 'RLS dinyalakan dan hak anon/authenticated dicabut dari email_verification_tokens.';
  ELSE
    RAISE NOTICE 'Peran anon/authenticated tidak ada (PostgreSQL biasa), RLS tetap dinyalakan.';
  END IF;
END $$;

COMMIT;
