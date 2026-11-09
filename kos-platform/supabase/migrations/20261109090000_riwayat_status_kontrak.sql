-- ════════════════════════════════════════════════════════════════════════════
-- Riwayat status kontrak sewa.
--
-- Kenapa perlu:
--
-- Tabel `contracts` menyimpan status sekarang, tetapi tidak menyimpan bagaimana
-- statusnya sampai ke sana. Booking, perbaikan, dan pembayaran masing-masing
-- punya tabel riwayatnya (booking_status_histories, maintenance_status_histories,
-- payment_status_histories); kontrak justru tidak, padahal kontrak adalah
-- kesepakatan dua pihak yang paling sering dipersoalkan kemudian: kapan
-- ditandatangani, siapa yang mengakhiri, dan dengan alasan apa.
--
-- Bentuknya sengaja dibuat sebentuk dengan tiga tabel riwayat yang sudah ada:
-- `changed_by` menunjuk siapa yang mengubah, dan `notes` menyimpan alasannya.
-- Tanpa `changed_by`, pertanyaan "siapa yang membatalkan kontrak ini" tidak
-- punya jawaban sama sekali.
--
-- AMAN DIJALANKAN BERULANG: seluruh pernyataannya `IF NOT EXISTS` atau dijaga
-- pemeriksaan, sehingga aman dijalankan di database yang sudah punya tabelnya.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "contract_status_histories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "previous_status" "ContractStatus",
    "new_status" "ContractStatus" NOT NULL,
    "changed_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "contract_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_status_histories_contract_id_idx"
  ON "contract_status_histories"("contract_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_status_histories_contract_id_fkey'
  ) THEN
    ALTER TABLE "contract_status_histories"
      ADD CONSTRAINT "contract_status_histories_contract_id_fkey"
      FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- ON DELETE SET NULL, bukan RESTRICT: riwayatnya harus tetap ada walau akun
  -- yang mengubahnya kemudian dihapus. Menghapus satu akun tidak boleh menghapus
  -- catatan kesepakatan yang pernah terjadi.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_status_histories_changed_by_fkey'
  ) THEN
    ALTER TABLE "contract_status_histories"
      ADD CONSTRAINT "contract_status_histories_changed_by_fkey"
      FOREIGN KEY ("changed_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "contract_status_histories" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."contract_status_histories" FROM anon, authenticated;
    RAISE NOTICE 'RLS dinyalakan dan hak anon/authenticated dicabut dari contract_status_histories.';
  ELSE
    RAISE NOTICE 'Peran anon/authenticated tidak ada (PostgreSQL biasa), RLS tetap dinyalakan.';
  END IF;
END $$;

-- Jenis notifikasi untuk perubahan status kontrak.
--
-- Ditambahkan ke enum, bukan memakai `CONTRACT_EXPIRING` yang sudah ada:
-- jenis itu berarti "kontrak segera berakhir", dan memakainya untuk kontrak
-- yang baru aktif atau yang dibatalkan akan menyesatkan siapa pun yang membaca
-- data notifikasi berdasarkan jenisnya.
DO $$
BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONTRACT_UPDATED';
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Tipe NotificationType tidak ada, penambahan jenis dilewati.';
END $$;

COMMIT;
