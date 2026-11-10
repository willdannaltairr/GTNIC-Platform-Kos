-- ════════════════════════════════════════════════════════════════════════════
-- Pemindahan akun lama ke Supabase Auth.
--
-- Kenapa perlu:
--
-- Kata sandi dan sesi pindah dari kode sendiri ke Supabase Auth, sedangkan
-- akun yang sudah ada seluruhnya tersimpan di `public.users` dengan hash sandi
-- bcrypt dan tidak punya baris di `auth.users` sama sekali. Tanpa pemindahan
-- ini, seluruh akun lama berhenti bisa masuk walaupun sandinya benar, dan
-- pemulihannya hanya bisa lewat atur ulang sandi satu per satu.
--
-- Cara kerjanya: hash bcrypt lama disalin APA ADANYA ke `encrypted_password`.
-- Supabase Auth memverifikasi bcrypt dengan skema yang sama (`$2a$`), jadi
-- sandi lama tetap berlaku dan tidak ada satu pun pemilik akun yang perlu
-- diminta menggantinya. Yang berpindah hanya wadahnya, bukan sandinya.
--
-- `email_confirmed_at` diisi dari `email_verified_at` milik platform, dan bila
-- masih kosong dipakai waktu sekarang. Pemisahannya disengaja: status
-- terverifikasi di platform tetap ditentukan kolomnya sendiri
-- (`public.users.email_verified_at`), sedangkan kolom di sini hanya menentukan
-- boleh masuk atau tidak. Akun yang belum memverifikasi email tetap boleh
-- masuk, hanya saja halaman profilnya masih menawarkan kirim ulang tautan.
--
-- AMAN DIJALANKAN BERULANG: hanya akun yang belum punya baris di `auth.users`
-- yang dipindahkan, dan pada database tanpa skema `auth` (PostgreSQL biasa)
-- seluruh isinya dilewati.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  akun RECORD;
  dipindah INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'auth') THEN
    RAISE NOTICE 'Skema auth tidak ada (PostgreSQL biasa), pemindahan akun dilewati.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'Tabel auth.users tidak ada, pemindahan akun dilewati.';
    RETURN;
  END IF;

  FOR akun IN
    SELECT p.id, p.email, p.full_name, p.password_hash, p.email_verified_at, p.created_at
    FROM public.users p
    WHERE p.password_hash IS NOT NULL
      AND p.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = p.id)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      akun.id,
      'authenticated',
      'authenticated',
      akun.email,
      akun.password_hash,
      COALESCE(akun.email_verified_at, now()),
      -- Token dikosongkan, bukan dibiarkan NULL: penyedia identitas membaca
      -- token yang berisi sesuatu sebagai permintaan yang masih menggantung,
      -- dan akun dengan permintaan menggantung bisa ditolak masuk.
      '', '', '', '',
      -- Penanda penyedia: tanpa ini akun tidak dikenali sebagai akun email.
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', akun.full_name),
      akun.created_at,
      now()
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      akun.id::text,
      akun.id,
      jsonb_build_object(
        'sub', akun.id::text,
        'email', akun.email,
        'email_verified', akun.email_verified_at IS NOT NULL,
        'phone_verified', false
      ),
      'email',
      now(), now(), now()
    );

    dipindah := dipindah + 1;
  END LOOP;

  RAISE NOTICE '% akun dipindahkan ke Supabase Auth.', dipindah;
END $$;
