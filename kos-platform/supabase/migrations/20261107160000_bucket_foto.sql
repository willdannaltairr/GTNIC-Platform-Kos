-- ════════════════════════════════════════════════════════════════════════════
-- Bucket penyimpanan foto kamar.
--
-- Kenapa perlu:
--
-- Tabel `room_images` sudah ada dan menyimpan `storage_path`, tetapi belum ada
-- bucket yang menampung berkasnya. Tanpa bucket, kolom itu tidak punya tujuan:
-- unggahan pertama gagal dan foto kamar tidak pernah bisa tampil. Berkas ini
-- yang menyiapkan rumahnya.
--
-- Sifat:
--
--   * Publik untuk dibaca. Foto kamar memang ditampilkan di halaman publik;
--     kalau privat, tiap tampilan butuh URL bertanda tangan yang kedaluwarsa
--     dan gambarnya hilang begitu waktunya habis.
--   * Tidak ada satu pun policy untuk `anon`/`authenticated`. Seluruh penulisan
--     lewat backend memakai kunci rahasia (melewati RLS), sehingga tidak ada
--     jalur yang membiarkan pengunjung mengunggah langsung ke bucket ini —
--     sejalan dengan migration kunci_akses_public.
--   * Batas 8 MiB dan daftar MIME di sini adalah batas kedua; backend sudah
--     menolak lebih dulu berdasarkan isi berkasnya, bukan berdasarkan
--     Content-Type yang dikirim klien.
--   * Aman dijalankan berulang (ON CONFLICT) dan aman di cluster PostgreSQL
--     biasa yang tidak punya skema `storage` — bagian itu dilewati.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    RAISE NOTICE 'Skema storage tidak ada (PostgreSQL biasa) — pembuatan bucket dilewati.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'room-photos',
    'room-photos',
    true,
    8388608, -- 8 MiB — samakan dengan batas unggah di backend
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  RAISE NOTICE 'Bucket room-photos siap.';
END $$;

COMMIT;
