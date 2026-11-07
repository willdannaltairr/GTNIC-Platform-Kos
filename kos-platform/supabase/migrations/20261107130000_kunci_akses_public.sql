-- ════════════════════════════════════════════════════════════════════════════
-- Kunci akses langsung ke skema public.
--
-- Kenapa perlu:
--
-- Supabase mengekspos skema `public` sebagai REST API (PostgREST) yang bisa
-- dipanggil siapa saja yang memegang kunci publik proyek — kunci itu memang
-- dirancang untuk ikut terkirim ke browser. Pada tabel yang dibuat lewat SQL
-- migration, Row Level Security TIDAK menyala otomatis. Akibatnya, tanpa
-- berkas ini, seluruh isi tabel — termasuk kolom `password_hash` — bisa dibaca
-- dan diubah lewat REST API tanpa login.
--
-- Aplikasi ini tidak memakai PostgREST sama sekali: semua akses lewat backend
-- Express dengan koneksi PostgreSQL langsung sebagai pemilik tabel. Pemilik
-- tabel melewati RLS, jadi menyalakan RLS tanpa satu pun policy membuat jalur
-- REST API tertutup rapat sementara backend tetap bekerja seperti biasa.
--
-- Bila nanti ada fitur yang memang perlu mengakses data langsung dari browser,
-- tambahkan policy khusus untuk tabel itu — jangan matikan RLS-nya.
--
-- Aman dijalankan di PostgreSQL biasa: peran `anon`/`authenticated` hanya ada
-- di Supabase, jadi bagian REVOKE dilewati bila perannya tidak ada.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Nyalakan RLS di setiap tabel skema public.
DO $$
DECLARE
  tabel record;
BEGIN
  FOR tabel IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabel.tablename);
  END LOOP;
END $$;

-- 2. Cabut hak akses peran Supabase (anon = pengunjung tanpa login,
--    authenticated = pengguna yang login lewat Supabase Auth, yang tidak
--    dipakai proyek ini).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    RAISE NOTICE 'Hak akses anon/authenticated dicabut dari skema public.';
  ELSE
    RAISE NOTICE 'Peran anon/authenticated tidak ada (PostgreSQL biasa) — pencabutan dilewati.';
  END IF;
END $$;

-- 3. Catatan: daftar skema yang diekspos REST API diatur di dashboard Supabase
--    (Project Settings → API → Exposed schemas), bukan lewat SQL — jadi tidak
--    ada perintah di sini yang bisa salah nama. Bila skema ini tidak dipakai
--    lewat REST sama sekali, keluarkan `public` dari daftar itu.

COMMIT;
