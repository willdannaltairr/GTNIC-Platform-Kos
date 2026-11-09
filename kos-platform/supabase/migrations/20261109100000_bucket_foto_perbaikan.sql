-- ════════════════════════════════════════════════════════════════════════════
-- Bucket foto laporan perbaikan, dan indeks tabelnya.
--
-- Kenapa perlu:
--
-- Tabel `maintenance_requests`, `maintenance_images`, dan
-- `maintenance_status_histories` sudah ada sejak skema awal, dan dashboard
-- penghuni maupun pemilik sudah menampilkan bagian "Perbaikan terbuka" dari
-- tabel itu, tetapi belum ada satu pun cara mengisinya: tidak ada endpoint
-- membuat laporan, tidak ada tempat menyimpan fotonya. Bagian di dashboard itu
-- karena itu selalu kosong, bukan karena tidak ada kerusakan.
--
-- Kenapa PRIVAT, berbeda dari bucket foto kamar:
--
-- Isinya keadaan di dalam kamar yang sedang dihuni: kerusakan yang dilaporkan,
-- sekaligus barang penghuninya yang ikut terfoto. Foto kamar kosong boleh
-- dibaca siapa saja karena memang ditampilkan di halaman publik; kamar yang
-- sedang dihuni tidak. Karena itu `public = false`, dan yang berhak melihat
-- menerima URL bertanda tangan yang dibuat backend.
--
-- Sama seperti dua bucket sebelumnya: tidak ada satu pun policy untuk `anon`
-- maupun `authenticated`. Seluruh penulisan dan pembacaan lewat backend memakai
-- kunci rahasia, sehingga tidak ada jalur yang membiarkan pengunjung menyentuh
-- bucket ini langsung.
--
-- AMAN DIJALANKAN BERULANG: pembuatan bucket memakai ON CONFLICT, dan seluruh
-- indeksnya IF NOT EXISTS. Aman juga di cluster PostgreSQL biasa yang tidak
-- punya skema `storage`: bagian bucket dilewati, indeksnya tetap dibuat.
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
    'maintenance-photos',
    'maintenance-photos',
    false,
    8388608, -- 8 MiB, samakan dengan MAX_MAINTENANCE_BYTES di backend
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  RAISE NOTICE 'Bucket maintenance-photos siap (privat).';
END $$;

-- Indeks untuk pembacaan yang benar-benar dilakukan aplikasi.
--
-- Tiap daftar laporan disaring per pihaknya lalu diurutkan dari yang terbaru,
-- jadi yang dipakai adalah indeks gabungan, bukan indeks kolom tunggal: dengan
-- begitu pengurutan tidak perlu menyortir ulang seluruh baris yang cocok.
-- Kolom anaknya juga diindeks karena setiap foto dan setiap langkah riwayat
-- dibaca lewat id laporannya, dan penghapusan berantai ikut memakainya.
CREATE INDEX IF NOT EXISTS "maintenance_requests_tenant_created_idx"
  ON "maintenance_requests"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "maintenance_requests_owner_created_idx"
  ON "maintenance_requests"("owner_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "maintenance_requests_status_idx"
  ON "maintenance_requests"("status");

CREATE INDEX IF NOT EXISTS "maintenance_images_request_idx"
  ON "maintenance_images"("maintenance_request_id");

CREATE INDEX IF NOT EXISTS "maintenance_status_histories_request_idx"
  ON "maintenance_status_histories"("maintenance_request_id");

COMMIT;
