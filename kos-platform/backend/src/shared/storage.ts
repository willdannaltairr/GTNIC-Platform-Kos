import { createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '../env.ts'
import { HttpError } from './http.ts'

/**
 * Penyimpanan berkas di folder server sendiri.
 *
 * Menggantikan Supabase Storage. Bentuk fungsi dan nama ekspornya sengaja
 * dipertahankan sama persis, supaya lima service yang memakainya tidak perlu
 * diubah satu baris pun: yang berubah hanya tujuannya, dari bucket daring ke
 * folder di dalam `backend/uploads`.
 *
 * Pembagiannya tetap seperti sebelumnya, dan alasannya tetap sama:
 *
 *   * `room-photos` publik, karena foto kamar memang ditampilkan di halaman
 *     publik dan alamatnya boleh dibagikan.
 *   * `owner-documents` privat, karena isinya KTP, swafoto dengan KTP, NPWP,
 *     dan buku rekening.
 *   * `maintenance-photos` dan `room-condition-photos` privat, karena isinya
 *     keadaan di dalam kamar yang sedang dihuni.
 *
 * Bucket privat tidak disajikan sebagai berkas statis. Yang diberikan ke
 * admin adalah tautan bertanda tangan yang kedaluwarsa dalam hitungan menit,
 * dan tanda tangannya diperiksa oleh rute `/uploads/privat/...` di server.
 */

/** Batas ukuran satu foto. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

/** Batas ukuran satu dokumen verifikasi. */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

/** Batas ukuran satu foto laporan perbaikan. */
export const MAX_MAINTENANCE_BYTES = 8 * 1024 * 1024

/** Batas ukuran satu foto kondisi kamar. */
export const MAX_ROOM_CONDITION_BYTES = 8 * 1024 * 1024

/** Bucket foto kamar. Publik. */
export const STORAGE_BUCKET = env('STORAGE_BUCKET', 'room-photos')

/** Bucket dokumen verifikasi pemilik. Privat. */
export const DOCUMENT_BUCKET = 'owner-documents'

/** Bucket foto laporan perbaikan. Privat. */
export const MAINTENANCE_BUCKET = 'maintenance-photos'

/** Bucket foto kondisi kamar (Room Passport). Privat. */
export const ROOM_CONDITION_BUCKET = 'room-condition-photos'

/** Folder akar seluruh unggahan, relatif terhadap folder kerja backend. */
export const UPLOAD_ROOT = path.resolve(process.cwd(), env('UPLOAD_DIR', 'uploads'))

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
 * "image/png" di atas berkas apa saja. Yang menentukan di sini isi berkasnya.
 */
export const sniffImageType = (bytes: Uint8Array): ImageMimeType | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= 8 && PNG_MAGIC.every((nilai, i) => bytes[i] === nilai)) {
    return 'image/png'
  }

  const teks = (awal: number, akhir: number): string =>
    String.fromCharCode(...bytes.subarray(awal, akhir))

  if (bytes.length >= 12 && teks(0, 4) === 'RIFF' && teks(8, 12) === 'WEBP') {
    return 'image/webp'
  }

  return null
}

export const extensionFor = (mime: ImageMimeType): string => IMAGE_TYPES[mime]

/** Alamat publik server ini, dipakai menyusun alamat berkas. */
const apiBase = (): string => env('API_BASE_URL', 'http://localhost:4000').replace(/\/+$/, '')

/** Setiap bagian path di-encode, tetapi garis miringnya tetap jadi pemisah. */
const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/')

/**
 * Cegah path keluar dari folder bucketnya.
 *
 * Nama berkas selalu dibuat server, tetapi path yang tersimpan di database
 * datang dari data lama juga, jadi pemeriksaan ini tetap dipasang.
 */
const safeSegments = (input: string): string[] => {
  const segments = input.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    throw new HttpError(400, 'Nama berkas tidak sah')
  }
  return segments
}

/**
 * URL publik sebuah foto kamar.
 *
 * Tiga bentuk `storage_path` diperlakukan berbeda, karena ketiganya memang ada
 * di database:
 *
 *   * `https://...` , URL lengkap (data lama) → diteruskan apa adanya.
 *   * `/images/...` , path publik frontend (data seed) → diteruskan apa adanya.
 *   * sisanya      , path berkas di dalam bucket → disusun jadi URL `/uploads`.
 */
export const publicUrlFor = (storagePath: string | null): string | null => {
  if (!storagePath) return null
  if (/^https?:\/\//i.test(storagePath)) return storagePath
  if (storagePath.startsWith('/')) return storagePath

  return `${apiBase()}/uploads/${STORAGE_BUCKET}/${encodePath(storagePath)}`
}

const filePathFor = (bucket: string, objectPath: string): string =>
  path.join(UPLOAD_ROOT, bucket, ...safeSegments(objectPath))

const uploadTo = async (
  bucket: string,
  objectPath: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> => {
  const target = filePathFor(bucket, objectPath)

  if (!target.startsWith(path.join(UPLOAD_ROOT, bucket) + path.sep)) {
    throw new HttpError(400, 'Nama berkas tidak sah')
  }

  try {
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, body)
  } catch (error) {
    console.error('[storage] unggah gagal:', (error as Error).message)
    throw new HttpError(502, 'Gagal menyimpan berkas ke penyimpanan')
  }

  // Content-Type tidak disimpan di disk; server menyimpulkannya dari ekstensi
  // saat menyajikan berkas. Parameter ini dipertahankan supaya pemanggilnya
  // tidak perlu diubah.
  void contentType
}

const deleteFrom = async (bucket: string, objectPath: string): Promise<void> => {
  if (!objectPath || objectPath.startsWith('/') || /^https?:\/\//i.test(objectPath)) return

  try {
    await unlink(filePathFor(bucket, objectPath))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[storage] hapus gagal:', (error as Error).message)
    }
  }
}

/** Simpan satu objek di bucket foto kamar. `path` relatif terhadap bucket. */
export const uploadObject = (path: string, body: Uint8Array, contentType: string): Promise<void> =>
  uploadTo(STORAGE_BUCKET, path, body, contentType)

/** Simpan satu dokumen verifikasi di bucket privat. */
export const uploadDocumentObject = (
  path: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> => uploadTo(DOCUMENT_BUCKET, path, body, contentType)

/** Simpan satu foto laporan perbaikan di bucket privat. */
export const uploadMaintenanceObject = (
  path: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> => uploadTo(MAINTENANCE_BUCKET, path, body, contentType)

/** Simpan satu foto kondisi kamar di bucket privat. */
export const uploadRoomConditionObject = (
  path: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> => uploadTo(ROOM_CONDITION_BUCKET, path, body, contentType)

/** Hapus satu objek dari bucket foto. Kegagalannya tidak pernah melempar. */
export const deleteObject = (path: string): Promise<void> => deleteFrom(STORAGE_BUCKET, path)

/** Hapus satu dokumen verifikasi. Sama, kegagalannya tidak pernah melempar. */
export const deleteDocumentObject = (path: string): Promise<void> =>
  deleteFrom(DOCUMENT_BUCKET, path)

/** Hapus satu foto laporan perbaikan. */
export const deleteMaintenanceObject = (path: string): Promise<void> =>
  deleteFrom(MAINTENANCE_BUCKET, path)

/** Hapus satu foto kondisi kamar. */
export const deleteRoomConditionObject = (path: string): Promise<void> =>
  deleteFrom(ROOM_CONDITION_BUCKET, path)

/**
 * Kunci tanda tangan tautan berkas privat.
 *
 * Dipisahkan dari kunci sesi supaya mengganti salah satunya tidak diam-diam
 * membatalkan yang lain. Bila tidak diisi, kunci sesi dipakai: keduanya tidak
 * pernah keluar dari server, dan proyek yang baru dipasang tetap jalan.
 */
const signingKey = (): string => env('FILE_SIGNING_SECRET') || env('JWT_SECRET') || 'kos-platform'

const signatureFor = (bucket: string, objectPath: string, expiresAt: number): string =>
  createHmac('sha256', signingKey())
    .update(`${bucket}\n${objectPath}\n${expiresAt}`)
    .digest('base64url')

/**
 * URL bertanda tangan untuk satu objek di bucket privat.
 *
 * Masa berlakunya pendek dengan sengaja: cukup untuk membuka dan memeriksa
 * berkasnya, tidak cukup untuk meninggalkan tautan yang masih bisa dibuka
 * besok.
 */
const signedUrlFor = async (
  bucket: string,
  path: string | null,
  expiresIn: number,
): Promise<string | null> => {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || path.startsWith('/')) return path

  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn
  const signature = signatureFor(bucket, path, expiresAt)

  return `${apiBase()}/uploads/privat/${bucket}/${encodePath(path)}?exp=${expiresAt}&sig=${signature}`
}

/** Periksa tanda tangan tautan berkas privat. Dipakai rute `/uploads/privat`. */
export const signedUrlValid = (
  bucket: string,
  objectPath: string,
  expiresAt: number,
  signature: string,
): boolean => {
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return false

  const expected = Buffer.from(signatureFor(bucket, objectPath, expiresAt))
  const given = Buffer.from(signature)
  if (expected.length !== given.length) return false

  return timingSafeEqual(expected, given)
}

/** Lokasi berkas privat di disk, untuk disajikan setelah tanda tangan diperiksa. */
export const privateFilePath = (bucket: string, objectPath: string): string =>
  filePathFor(bucket, objectPath)

/** URL bertanda tangan untuk satu dokumen verifikasi pemilik. */
export const documentSignedUrl = (path: string | null, expiresIn = 300): Promise<string | null> =>
  signedUrlFor(DOCUMENT_BUCKET, path, expiresIn)

/** URL bertanda tangan untuk satu foto laporan perbaikan. */
export const maintenanceSignedUrl = (
  path: string | null,
  expiresIn = 300,
): Promise<string | null> => signedUrlFor(MAINTENANCE_BUCKET, path, expiresIn)

/** URL bertanda tangan untuk satu foto kondisi kamar. */
export const roomConditionSignedUrl = (
  path: string | null,
  expiresIn = 300,
): Promise<string | null> => signedUrlFor(ROOM_CONDITION_BUCKET, path, expiresIn)

/** Satu berkas yang sudah dibaca dari isi permintaan multipart. */
export interface BerkasUnggahan {
  bytes: Uint8Array
  /** Ukuran yang dilaporkan peramban, dipakai memeriksa batas sebelum dibaca. */
  size: number
  name: string
}

/**
 * Baca isi formulir unggahan, sekali saja.
 *
 * Isi permintaan multipart adalah aliran yang habis setelah dibaca, jadi
 * `req.formData()` hanya boleh dipanggil satu kali. Adaptor Express sudah
 * menyiapkan `Request` Web lengkap dengan isinya, sehingga pemanggilan ini
 * bekerja sama seperti di Edge Function.
 */
export const bacaFormulir = async (req: Request): Promise<FormData> => {
  try {
    return await req.formData()
  } catch {
    throw new HttpError(400, 'Isi permintaan bukan formulir unggahan yang sah')
  }
}

/** Ambil satu berkas dari formulir yang sudah dibaca. */
export const bacaBerkasDariFormulir = async (
  form: FormData,
  namaField: string,
  batas: number,
  label: string,
): Promise<BerkasUnggahan> => {
  const berkas = form.get(namaField)
  if (!(berkas instanceof File)) {
    throw new HttpError(400, `Berkas ${label} wajib dikirim pada field "${namaField}"`)
  }

  if (berkas.size > batas) {
    const maxMb = Math.round(batas / 1024 / 1024)
    throw new HttpError(413, `Ukuran ${label} terlalu besar, maksimal ${maxMb} MB`)
  }

  const bytes = new Uint8Array(await berkas.arrayBuffer())

  if (bytes.byteLength > batas) {
    const maxMb = Math.round(batas / 1024 / 1024)
    throw new HttpError(413, `Ukuran ${label} terlalu besar, maksimal ${maxMb} MB`)
  }

  if (bytes.byteLength === 0) {
    throw new HttpError(400, `Berkas ${label} kosong`)
  }

  return { bytes, size: bytes.byteLength, name: berkas.name }
}

/** Baca satu berkas dari isi permintaan `multipart/form-data`. */
export const bacaBerkas = async (
  req: Request,
  namaField: string,
  batas: number,
  label: string,
): Promise<BerkasUnggahan> =>
  bacaBerkasDariFormulir(await bacaFormulir(req), namaField, batas, label)
