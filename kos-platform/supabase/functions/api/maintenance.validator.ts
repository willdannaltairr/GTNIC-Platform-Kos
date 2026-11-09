import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul perbaikan.
 *
 * Nilai enum disalin dari tipe database, bukan dikarang di sini: menambah nilai
 * yang tidak ada di enum hanya akan ditolak PostgreSQL sebagai galat 500, bukan
 * sebagai permintaan yang salah bentuk.
 */

export const MAINTENANCE_STATUS = [
  'OPEN',
  'REVIEWING',
  'IN_PROGRESS',
  'WAITING_FOR_PARTS',
  'RESOLVED',
  'REJECTED',
  'CLOSED',
] as const

export const MAINTENANCE_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

/**
 * Kategori laporan.
 *
 * Daftar tertutup, bukan teks bebas: kategori yang diketik sendiri akan
 * menghasilkan "listrik", "Listrik", dan "kelistrikan" pada kolom yang sama,
 * sehingga tidak ada cara menghitung berapa laporan listrik bulan ini. Yang
 * tidak masuk kategori mana pun tetap punya tempat di LAINNYA.
 */
export const MAINTENANCE_CATEGORY = [
  'ELEKTRIK',
  'AIR',
  'BANGUNAN',
  'KEBERSIHAN',
  'PERABOT',
  'KEAMANAN',
  'INTERNET',
  'LAINNYA',
] as const

/** Sebutan tiap kategori dalam bahasa yang bisa dibaca. */
export const LABEL_KATEGORI: Record<string, string> = {
  ELEKTRIK: 'Listrik dan lampu',
  AIR: 'Air dan saluran',
  BANGUNAN: 'Bangunan dan atap',
  KEBERSIHAN: 'Kebersihan',
  PERABOT: 'Perabot dan kasur',
  KEAMANAN: 'Keamanan dan kunci',
  INTERNET: 'Internet',
  LAINNYA: 'Lainnya',
}

/**
 * Sebutan tiap status saat dipakai dalam kalimat pemberitahuan.
 *
 * Ditulis sebagai keadaan ("sudah diperbaiki"), bukan sebagai nama status,
 * karena yang membacanya penghuni yang tidak pernah melihat daftar enum.
 */
export const LABEL_STATUS_PERBAIKAN: Record<string, string> = {
  OPEN: 'baru diterima',
  REVIEWING: 'sedang ditinjau',
  IN_PROGRESS: 'sedang dikerjakan',
  WAITING_FOR_PARTS: 'menunggu suku cadang',
  RESOLVED: 'sudah diperbaiki',
  REJECTED: 'ditolak',
  CLOSED: 'ditutup',
}

/**
 * Perpindahan status yang masuk akal.
 *
 * Ditulis tetap, sama seperti pada booking dan kontrak: aturan perpindahannya
 * keputusan bisnis, bukan turunan dari daftar enumnya. Dua perpindahan yang
 * sengaja dibuka supaya tidak ada jalan buntu:
 *
 *   * RESOLVED kembali ke IN_PROGRESS, karena kerusakan yang sama sering
 *     muncul lagi beberapa hari setelah dikerjakan.
 *   * REJECTED kembali ke REVIEWING, karena penghuni boleh mempertanyakan
 *     penolakan dengan keterangan tambahan.
 */
export const PERPINDAHAN_PERBAIKAN: Record<string, readonly string[]> = {
  OPEN: ['REVIEWING', 'IN_PROGRESS', 'REJECTED'],
  REVIEWING: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'REJECTED'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'RESOLVED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  REJECTED: ['CLOSED', 'REVIEWING'],
  // Status akhir: laporan yang sudah ditutup tetap terbaca sebagai catatan.
  CLOSED: [],
}

export const createMaintenanceSchema = z.object({
  propertyId: z.string().uuid('ID properti tidak valid'),
  /**
   * Kamar boleh disebut, boleh tidak. Kalau disebut, ia harus salah satu kamar
   * yang sedang disewa pelapor; kalau tidak, kamar dari kontrak aktifnya yang
   * dipakai. Kontraknya sendiri diperiksa di service, karena hanya di sana
   * terlihat siapa penyewanya.
   */
  roomId: z.string().uuid('ID kamar tidak valid').optional(),
  title: z
    .string()
    .trim()
    .min(5, 'Judul minimal 5 karakter supaya jelas apa yang rusak')
    .max(150, 'Judul maksimal 150 karakter'),
  category: z.enum(MAINTENANCE_CATEGORY, {
    message: `Kategori harus salah satu dari: ${MAINTENANCE_CATEGORY.join(', ')}`,
  }),
  description: z.string().trim().max(2000, 'Keterangan maksimal 2000 karakter').optional(),
  priority: z.enum(MAINTENANCE_PRIORITY).default('MEDIUM'),
})

/**
 * Perubahan status oleh pemilik.
 *
 * Penolakan wajib disertai alasan, dengan pertimbangan yang sama seperti
 * penolakan verifikasi pemilik: penghuni harus tahu kenapa laporannya ditolak,
 * bukan sekadar melihat statusnya berubah. Tanpa alasan, ia akan mengirim
 * laporan yang sama persis.
 */
export const updateMaintenanceStatusSchema = z
  .object({
    status: z.enum(MAINTENANCE_STATUS),
    notes: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
    /** Pemilik boleh menaikkan atau menurunkan urgensinya saat meninjau. */
    priority: z.enum(MAINTENANCE_PRIORITY).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && (!data.notes || data.notes.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message:
          'Alasan penolakan wajib diisi, minimal 10 karakter, supaya penghuni tahu kenapa laporannya ditolak',
      })
    }
  })

export const listMaintenanceQuerySchema = z.object({
  status: z.enum(MAINTENANCE_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const maintenanceIdParam = (nilai: string): string =>
  z.string().uuid('ID laporan tidak valid').parse(nilai)

export const maintenancePhotoIdParam = (nilai: string): string =>
  z.string().uuid('ID foto tidak valid').parse(nilai)

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>
export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>
export type ListMaintenanceQuery = z.infer<typeof listMaintenanceQuerySchema>
