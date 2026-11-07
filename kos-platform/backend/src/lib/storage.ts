import { env } from '../config/env'
import { HttpError } from './httpError'

/**
 * Penyimpanan foto di Supabase Storage.
 *
 * Backend yang memegang kunci rahasia dan yang mengunggah — browser tidak
 * pernah menerima kunci itu, dan tidak ada jalur unggah langsung dari klien.
 * Konsekuensinya seluruh berkas melewati validasi di sini lebih dulu.
 */

/** Batas ukuran satu berkas. Selaraskan dengan `file_size_limit` bucket. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

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

/**
 * URL publik sebuah objek di bucket.
 *
 * Tiga bentuk `storage_path` diperlakukan berbeda, karena ketiganya memang ada
 * di database:
 *
 *   * `https://…`  — URL lengkap (dipakai sebagian data lama) → diteruskan apa adanya.
 *   * `/images/…`  — path publik frontend (dipakai data seed yang menunjuk
 *                    berkas di `frontend/public`) → diteruskan apa adanya.
 *   * sisanya      — path objek di dalam bucket → disusun jadi URL publik.
 *
 * Mengembalikan `null` bila URL tidak bisa disusun, supaya pemanggil bisa
 * menampilkan tempat kosong alih-alih gambar rusak.
 */
export const publicUrlFor = (storagePath: string | null): string | null => {
  if (!storagePath) return null
  if (/^https?:\/\//i.test(storagePath)) return storagePath
  if (storagePath.startsWith('/')) return storagePath
  if (!env.SUPABASE_URL) return null

  const encoded = storagePath.split('/').map(encodeURIComponent).join('/')
  return `${apiBase()}/storage/v1/object/public/${env.STORAGE_BUCKET}/${encoded}`
}

/** Simpan satu objek. `path` relatif terhadap bucket, tanpa garis miring di depan. */
export const uploadObject = async (
  path: string,
  body: Buffer,
  contentType: string,
): Promise<void> => {
  if (!storageConfigured()) {
    throw new HttpError(
      503,
      'Penyimpanan foto belum dikonfigurasi: isi SUPABASE_URL dan SUPABASE_SECRET_KEY di backend/.env',
    )
  }

  const response = await fetch(`${apiBase()}/storage/v1/object/${env.STORAGE_BUCKET}/${path}`, {
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
    throw new HttpError(502, 'Gagal menyimpan foto ke penyimpanan')
  }
}

/**
 * Hapus satu objek.
 *
 * Kegagalan di sini tidak pernah melempar: baris database tetap dihapus, dan
 * berkas yatim di bucket jauh lebih ringan akibatnya daripada permintaan yang
 * gagal padahal datanya sudah hilang.
 */
export const deleteObject = async (path: string): Promise<void> => {
  if (!storageConfigured()) return
  if (!path || path.startsWith('/') || /^https?:\/\//i.test(path)) return

  try {
    const response = await fetch(`${apiBase()}/storage/v1/object/${env.STORAGE_BUCKET}/${path}`, {
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
