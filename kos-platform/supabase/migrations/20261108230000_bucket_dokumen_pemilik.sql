-- ════════════════════════════════════════════════════════════════════════════
-- Bucket dokumen verifikasi pemilik, dan aturan satu dokumen per jenis.
--
-- Kenapa perlu:
--
-- Tabel `owner_verification_documents` sudah ada sejak skema awal, lengkap
-- dengan kolom `storage_path`, tetapi belum ada bucket yang menampung
-- berkasnya dan belum ada satu pun endpoint yang menulis ke tabel itu. Tanpa
-- bucket, unggahan pertama gagal; tanpa endpoint, tidak ada cara mengisinya.
--
-- Kenapa PRIVAT, berbeda dari bucket foto kamar:
--
-- Isinya KTP, swafoto dengan KTP, NPWP, izin usaha, dan buku rekening. Foto
-- kamar boleh dibaca siapa saja karena memang ditampilkan di halaman publik;
-- dokumen identitas tidak. URL publik tidak bisa ditarik kembali setelah
-- bocor, sedangkan URL bertanda tangan bisa kedaluwarsa dalam hitungan menit.
-- Karena itu `public = false`, dan admin melihat dokumennya lewat URL
-- bertanda tangan yang dibuat backend.
--
-- Sama seperti bucket foto: tidak ada satu pun policy untuk `anon` maupun
-- `authenticated`. Seluruh penulisan dan pembacaan lewat backend memakai kunci
-- rahasia, sehingga tidak ada jalur yang membiarkan pengunjung menyentuh
-- bucket ini langsung.
--
-- AMAN DIJALANKAN BERULANG: pembuatan bucket memakai ON CONFLICT, dan indeks
-- uniknya IF NOT EXISTS. Aman juga di cluster PostgreSQL biasa yang tidak
-- punya skema `storage`: bagian itu dilewati, indeksnya tetap dibuat.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    RAISE NOTICE 'Skema storage tidak ada (PostgreSQL biasa), pembuatan bucket dilewati.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'owner-documents',
    'owner-documents',
    false,
    8388608, -- 8 MiB, samakan dengan MAX_DOCUMENT_BYTES di backend
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  RAISE NOTICE 'Bucket owner-documents siap (privat).';
END $$;

-- Satu pemilik hanya punya satu dokumen per jenis.
--
-- Selain menjaga agar daftar dokumen tidak menumpuk, indeks ini yang membuat
-- unggahan ulang bisa menimpa berkas lama dengan ON CONFLICT. Tanpa itu,
-- pemilik yang memperbaiki KTP-nya akan meninggalkan KTP lama yang masih
-- tersimpan dan masih bisa dibaca admin, dan tidak ada lagi yang tahu mana
-- yang berlaku.
CREATE UNIQUE INDEX IF NOT EXISTS "owner_verification_documents_owner_type_key"
  ON "owner_verification_documents"("owner_id", "document_type");

COMMIT;
