-- ════════════════════════════════════════════════════════════════════════════
-- Naikkan database lama ke skema sekarang — tanpa menghapus data.
--
-- Untuk apa:
--
-- Database yang dibuat sebelum proyek pindah ke SQL langsung (waktu itu schema
-- dipegang Prisma) tidak punya tiga hal yang sekarang diandalkan kode:
--
--   1. `id` tanpa DEFAULT. Prisma dulu yang membuat UUID di aplikasi, jadi
--      INSERT yang tidak menyebut id akan gagal "null value in column id".
--   2. `updated_at` tanpa DEFAULT dan tanpa trigger. Kode sekarang tidak lagi
--      mengisi kolom ini di UPDATE, sehingga setiap UPDATE akan gagal.
--   3. RLS belum menyala (lihat migration kunci_akses_public untuk alasannya).
--
-- Berkas ini memperbaiki nomor 1 dan 2 pada database yang sudah berisi tabel.
-- Seluruh pernyataannya idempoten: aman dijalankan berulang, dan pada database
-- yang sudah benar ia tidak mengubah apa pun.
--
-- Pemakaian pada database lama:
--
--   node backend/scripts/db-sql.mjs supabase/migrations/20261107130000_kunci_akses_public.sql
--   node backend/scripts/db-sql.mjs supabase/migrations/20261107150000_naikkan_database_lama.sql
--
-- Migration `init` TIDAK dijalankan pada database lama — tabelnya sudah ada.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. UUID otomatis untuk kolom id ───────────────────────────────────────
-- Hanya kolom yang benar-benar belum punya default yang disentuh, supaya
-- database yang sudah beres tidak berubah.

DO $$
DECLARE
  kolom record;
  jumlah int := 0;
BEGIN
  FOR kolom IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_tables t
      ON t.schemaname = c.table_schema AND t.tablename = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND c.column_default IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT gen_random_uuid()',
      kolom.table_name, kolom.column_name
    );
    jumlah := jumlah + 1;
  END LOOP;

  RAISE NOTICE 'DEFAULT gen_random_uuid() dipasang di % kolom id.', jumlah;
END $$;

-- ─── 2. created_at dan updated_at terisi sendiri ───────────────────────────

DO $$
DECLARE
  kolom record;
  jumlah int := 0;
BEGIN
  FOR kolom IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_tables t
      ON t.schemaname = c.table_schema AND t.tablename = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('created_at', 'updated_at')
      AND c.column_default IS NULL
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()',
      kolom.table_name, kolom.column_name
    );
    jumlah := jumlah + 1;
  END LOOP;

  RAISE NOTICE 'DEFAULT now() dipasang di % kolom waktu.', jumlah;
END $$;

-- ─── 3. Trigger updated_at ─────────────────────────────────────────────────
-- updated_at diurus database, bukan pemanggil query.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tabel record;
  jumlah int := 0;
BEGIN
  FOR tabel IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN pg_tables t
      ON t.schemaname = c.table_schema AND t.tablename = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                   tabel.table_name || '_set_updated_at', tabel.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tabel.table_name || '_set_updated_at', tabel.table_name
    );
    jumlah := jumlah + 1;
  END LOOP;

  RAISE NOTICE 'Trigger updated_at dipasang di % tabel.', jumlah;
END $$;

COMMIT;
