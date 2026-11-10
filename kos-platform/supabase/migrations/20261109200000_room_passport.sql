-- ════════════════════════════════════════════════════════════════════════════
-- Room Passport: catatan kondisi kamar saat masuk dan keluar.
--
-- Kenapa perlu:
--
-- Tabel `room_condition_reports` beserta foto, daftar periksa, dan
-- persetujuannya sudah ada sejak skema awal, tetapi belum ada satu pun cara
-- mengisinya. Akibatnya pertanyaan yang paling sering jadi sengketa antara
-- penghuni dan pemilik — "goresan meja ini sudah ada sejak awal atau tidak" —
-- tidak punya jawaban yang bisa diperiksa siapa pun.
--
-- Bedanya dengan laporan perbaikan: laporan perbaikan mencatat apa yang RUSAK
-- dan siapa yang memperbaikinya. Room Passport mencatat bagaimana keadaan
-- kamarnya pada satu titik waktu, dan disetujui kedua pihak. Kerusakan yang
-- sudah ada sejak awal karena itu tidak perlu diperdebatkan lagi nanti.
--
-- Bucket fotonya PRIVAT, sama seperti foto perbaikan: isinya keadaan di dalam
-- kamar yang sedang dihuni, termasuk barang penghuninya yang ikut terfoto.
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
    'room-condition-photos',
    'room-condition-photos',
    false,
    8388608, -- 8 MiB, samakan dengan MAX_ROOM_CONDITION_BYTES di fungsi
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE
    SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  RAISE NOTICE 'Bucket room-condition-photos siap (privat).';
END $$;

-- Daftar laporan dibaca per pihak lalu diurutkan dari yang terbaru, sama
-- seperti laporan perbaikan: yang dipakai indeks gabungan, bukan kolom tunggal.
CREATE INDEX IF NOT EXISTS "room_condition_reports_tenant_created_idx"
  ON "room_condition_reports"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "room_condition_reports_owner_created_idx"
  ON "room_condition_reports"("owner_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "room_condition_reports_contract_idx"
  ON "room_condition_reports"("contract_id");

-- Kolom anaknya juga diindeks karena setiap foto, butir periksa, dan
-- persetujuan dibaca lewat id laporannya, dan penghapusan berantai ikut
-- memakainya.
CREATE INDEX IF NOT EXISTS "room_condition_images_report_idx"
  ON "room_condition_images"("report_id");

CREATE INDEX IF NOT EXISTS "room_condition_checklist_report_idx"
  ON "room_condition_checklist_items"("report_id");

CREATE INDEX IF NOT EXISTS "room_condition_ack_report_idx"
  ON "room_condition_acknowledgements"("report_id");

-- Satu pemeriksaan masuk dan satu pemeriksaan keluar per kontrak.
--
-- Tanpa batas ini, penghuni yang menekan "Catat kondisi kamar" dua kali
-- menghasilkan dua pemeriksaan masuk untuk sewa yang sama, dan tidak ada cara
-- menentukan mana yang berlaku. Pemeriksaan berkala sengaja tidak dibatasi:
-- kos yang dihuni bertahun-tahun wajar diperiksa beberapa kali.
CREATE UNIQUE INDEX IF NOT EXISTS "room_condition_reports_contract_type_key"
  ON "room_condition_reports"("contract_id", "report_type")
  WHERE "contract_id" IS NOT NULL AND "report_type" <> 'PERIODIC_INSPECTION';

-- Jenis notifikasi untuk pencatatan kondisi kamar.
DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_CONDITION_SUBMITTED';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_CONDITION_ACKNOWLEDGED';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROOM_CONDITION_DISPUTED';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Tipe NotificationType tidak ada, penambahan jenis dilewati.';
END $$;

COMMIT;
