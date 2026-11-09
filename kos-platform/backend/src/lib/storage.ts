import { env } from '../config/env'
import { HttpError } from './httpError'

/**
 * Penyimpanan berkas di Supabase Storage.
 *
 * Backend yang memegang kunci rahasia dan yang mengunggah, browser tidak
 * pernah menerima kunci itu, dan tidak ada jalur unggah langsung dari klien.
 * Konsekuensinya seluruh berkas melewati validasi di sini lebih dulu.
 *
 * Ada tiga bucket, dan bedanya disengaja:
 *
 *   * `room-photos` publik, karena foto kamar memang ditampilkan di halaman
 *     publik dan alamatnya boleh dibagikan.
 *   * `owner-documents` privat, karena isinya KTP, swafoto dengan KTP, NPWP,
 *     dan buku rekening. URL publik tidak bisa ditarik kembali setelah bocor,
 *     jadi yang diberikan ke admin adalah URL bertanda tangan yang kedaluwarsa
 *     dalam hitungan menit.
 *   * `maintenance-photos` privat, karena isinya keadaan di dalam kamar yang
 *     sedang dihuni: kerusakan yang dilaporkan beserta barang penghuninya yang
 *     ikut terfoto. Foto kamar kosong boleh dilihat siapa saja; kamar yang
 *     sedang dihuni tidak.
 */

/** Batas ukuran satu foto. Selaraskan dengan `file_size_limit` bucket. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

/**
 * Batas ukuran satu dokumen verifikasi.
 *
 * Nilainya kebetulan sama dengan batas foto, tetapi tetap ditulis sebagai nama
 * sendiri supaya pesan galatnya bisa menyebut dokumen dan bukan foto, dan
 * supaya mengubah salah satunya tidak diam-diam mengubah yang lain.
 */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

/** Batas ukuran satu foto laporan perbaikan. */
export const MAX_MAINTENANCE_BYTES = 8 * 1024 * 1024

/** Bucket dokumen verifikasi pemilik. Privat, tidak pernah dibaca publik. */
export const DOCUMENT_BUCKET = 'owner-documents'

/** Bucket foto laporan perbaikan. Privat, sama seperti dokumen. */
export const MAINTENANCE_BUCKET = 'maintenance-photos'

/** Jenis gambar yang diterima, beserta ekstensi yang dipakai saat menyimpan. */
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export type ImageMimeType = keyof typeof IMAGE_TYPES

/**
 * Kenali jenis gambar dari beberapa byte pertama isinya.
 *
 * Content-Type yang dikirim klien tidak dipercaya: siapa pun bisa menulis
 * "image/png" di atas berkas apa saja. Yang menentukan di sini isi berkasnya,
 * sehingga yang tersimpan di bucket dijamin benar-benar gambar.
 */
export const sniffImageType = (buffer: Buffer): ImageMimeType | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return 'image/png'
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }

  return null
}

export const extensionFor = (mime: ImageMimeType): string => IMAGE_TYPES[mime]

const storageConfigured = (): boolean => Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY)

const apiBase = (): string => env.SUPABASE_URL.replace(/\/+$/, '')

/** Setiap bagian path di-encode, tetapi garis miringnya tetap jadi pemisah. */
const encodePath = (path: string): string =>
  path.split('/').map(encodeURIComponent).join('/')

/**
 * URL publik sebuah objek di bucket foto.
 *
 * Tiga bentuk `storage_path` diperlakukan berbeda, karena ketiganya memang ada
 * di database:
 *
 *   * `https://…` , URL lengkap (dipakai sebagian data lama) → diteruskan apa adanya.
 *   * `/images/…` , path publik frontend (dipakai data seed yang menunjuk
 *                    berkas di `frontend/public`) → diteruskan apa adanya.
 *   * sisanya     , path objek di dalam bucket → disusun jadi URL publik.
 *
 * Mengembalikan `null` bila URL tidak bisa disusun, supaya pemanggil bisa
 * menampilkan tempat kosong alih-alih gambar rusak.
 */
export const publicUrlFor = (storagePath: string | null): string | null => {
  if (!storagePath) return null
  if (/^https?:\/\//i.test(storagePath)) return storagePath
  if (storagePath.startsWith('/')) return storagePath
  if (!env.SUPABASE_URL) return null

  return `${apiBase()}/storage/v1/object/public/${env.STORAGE_BUCKET}/${encodePath(storagePath)}`
}

const uploadTo = async (
  bucket: string,
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> => {
  if (!storageConfigured()) {
    throw new HttpError(
      503,
      'Penyimpanan berkas belum dikonfigurasi: isi SUPABASE_URL dan SUPABASE_SECRET_KEY di backend/.env',
    )
  }

  const response = await fetch(`${apiBase()}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      'Content-Type': contentType,
      // Tanpa ini, unggahan ke path yang sudah terisi akan menimpa berkas lama.
      'x-upsert': 'false',
    },
    body: new Uint8Array(body),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    console.error('[storage] unggah gagal:', response.status, detail)
    throw new HttpError(502, 'Gagal menyimpan berkas ke penyimpanan')
  }
}

const deleteFrom = async (bucket: string, path: string): Promise<void> => {
  if (!storageConfigured()) return
  if (!path || path.startsWith('/') || /^https?:\/\//i.test(path)) return

  try {
    const response = await fetch(`${apiBase()}/storage/v1/object/${bucket}/${encodePath(path)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
    })

    if (!response.ok) {
      console.error('[storage] hapus gagal:', response.status, (await response.text()).slice(0, 200))
    }
  } catch (error) {
    console.error('[storage] hapus gagal:', (error as Error).message)
  }
}

/** Simpan satu objek di bucket foto. `path` relatif terhadap bucket. */
export const uploadObject = (path: string, body: Buffer, contentType: string): Promise<void> =>
  uploadTo(env.STORAGE_BUCKET, path, body, contentType)

/** Simpan satu dokumen verifikasi di bucket privat. */
export const uploadDocumentObject = (
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> => uploadTo(DOCUMENT_BUCKET, path, body, contentType)

/** Simpan satu foto laporan perbaikan di bucket privat. */
export const uploadMaintenanceObject = (
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> => uploadTo(MAINTENANCE_BUCKET, path, body, contentType)

/**
 * Hapus satu objek dari bucket foto.
 *
 * Kegagalan di sini tidak pernah melempar: baris database tetap dihapus, dan
 * berkas yatim di bucket jauh lebih ringan akibatnya daripada permintaan yang
 * gagal padahal datanya sudah hilang.
 */
export const deleteObject = (path: string): Promise<void> => deleteFrom(env.STORAGE_BUCKET, path)

/** Hapus satu dokumen verifikasi. Sama, kegagalannya tidak pernah melempar. */
export const deleteDocumentObject = (path: string): Promise<void> =>
  deleteFrom(DOCUMENT_BUCKET, path)

/** Hapus satu foto laporan perbaikan. Kegagalannya juga tidak melempar. */
export const deleteMaintenanceObject = (path: string): Promise<void> =>
  deleteFrom(MAINTENANCE_BUCKET, path)

/**
 * URL bertanda tangan untuk satu objek di bucket privat.
 *
 * Masa berlakunya pendek dengan sengaja: cukup untuk membuka dan memeriksa
 * berkasnya, tidak cukup untuk meninggalkan tautan yang masih bisa dibuka
 * besok. URL publik tidak bisa ditarik kembali, dan isi bucket privat adalah
 * berkas yang paling tidak boleh beredar.
 *
 * Menerima nama bucket, bukan hanya satu bucket tetap, karena sekarang ada dua
 * yang privat: dokumen identitas pemilik dan foto laporan perbaikan. Keduanya
 * butuh perlakuan yang sama, jadi menyusun URL-nya pun satu tempat.
 *
 * Mengembalikan `null` bila penyimpanan belum dikonfigurasi atau permintaannya
 * ditolak, supaya pemanggil menampilkan keterangan yang jujur alih-alih gambar
 * rusak.
 */
const signedUrlFor = async (
  bucket: string,
  path: string | null,
  expiresIn: number,
): Promise<string | null> => {
  if (!storageConfigured() || !path) return null

  try {
    const response = await fetch(
      `${apiBase()}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      },
    )

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200)
      console.error('[storage] tanda tangan berkas gagal:', response.status, detail)
      return null
    }

    const data = (await response.json()) as { signedURL?: string }
    if (!data.signedURL) return null

    return `${apiBase()}/storage/v1${data.signedURL}`
  } catch (error) {
    console.error('[storage] tanda tangan berkas gagal:', (error as Error).message)
    return null
  }
}

/** URL bertanda tangan untuk satu dokumen verifikasi pemilik. */
export const documentSignedUrl = (path: string | null, expiresIn = 300): Promise<string | null> =>
  signedUrlFor(DOCUMENT_BUCKET, path, expiresIn)

/** URL bertanda tangan untuk satu foto laporan perbaikan. */
export const maintenanceSignedUrl = (
  path: string | null,
  expiresIn = 300,
): Promise<string | null> => signedUrlFor(MAINTENANCE_BUCKET, path, expiresIn)
