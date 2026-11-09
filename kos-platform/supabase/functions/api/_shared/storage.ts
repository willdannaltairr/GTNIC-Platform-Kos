import { HttpError } from './http.ts'
import { kunciRahasia, supabaseUrl } from './supabase.ts'

/**
 * Penyimpanan berkas di Supabase Storage, dari dalam Edge Function.
 *
 * Yang mengunggah tetap sisi server, bukan peramban: kunci rahasia tidak
 * pernah sampai ke klien, dan tidak ada jalur unggah langsung. Konsekuensinya
 * seluruh berkas melewati validasi di sini lebih dulu.
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

/** Bucket foto kamar. Publik. */
export const STORAGE_BUCKET = Deno.env.get('STORAGE_BUCKET') ?? 'room-photos'

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

const apiBase = (): string => supabaseUrl()

/** Setiap bagian path di-encode, tetapi garis miringnya tetap jadi pemisah. */
const encodePath = (path: string): string =>
  path.split('/').map(encodeURIComponent).join('/')

/**
 * URL publik sebuah objek di bucket foto kamar.
 *
 * Tiga bentuk `storage_path` diperlakukan berbeda, karena ketiganya memang ada
 * di database:
 *
 *   * `https://...` , URL lengkap (dipakai sebagian data lama) → diteruskan apa adanya.
 *   * `/images/...` , path publik frontend (dipakai data seed yang menunjuk
 *                     berkas di `frontend/public`) → diteruskan apa adanya.
 *   * sisanya      , path objek di dalam bucket → disusun jadi URL publik.
 *
 * Mengembalikan `null` bila URL tidak bisa disusun, supaya pemanggil bisa
 * menampilkan tempat kosong alih-alih gambar rusak.
 */
export const publicUrlFor = (storagePath: string | null): string | null => {
  if (!storagePath) return null
  if (/^https?:\/\//i.test(storagePath)) return storagePath
  if (storagePath.startsWith('/')) return storagePath
  if (!apiBase()) return null

  return `${apiBase()}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePath(storagePath)}`
}

const uploadTo = async (
  bucket: string,
  path: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> => {
  const kunci = kunciRahasia()
  if (!kunci) {
    throw new HttpError(503, 'Kunci penyimpanan belum tersedia di lingkungan fungsi ini')
  }

  const response = await fetch(`${apiBase()}/storage/v1/object/${bucket}/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kunci}`,
      'Content-Type': contentType,
      // Tanpa ini, unggahan ke path yang sudah terisi akan menimpa berkas lama.
      'x-upsert': 'false',
    },
    // `Uint8Array` dikirim apa adanya sebagai isi permintaan. Pemerannya sama
    // dengan `Buffer` di backend lama: keduanya tampilan lain dari deretan byte
    // yang sama, dan menyalinnya ke bentuk lain hanya menambah satu salinan
    // penuh di memori untuk berkas yang bisa mencapai delapan megabyte.
    body: body as BodyInit,
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    console.error('[storage] unggah gagal:', response.status, detail)
    throw new HttpError(502, 'Gagal menyimpan berkas ke penyimpanan')
  }
}

const deleteFrom = async (bucket: string, path: string): Promise<void> => {
  const kunci = kunciRahasia()
  if (!kunci) return
  if (!path || path.startsWith('/') || /^https?:\/\//i.test(path)) return

  try {
    const response = await fetch(`${apiBase()}/storage/v1/object/${bucket}/${encodePath(path)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${kunci}` },
    })

    if (!response.ok) {
      console.error('[storage] hapus gagal:', response.status, (await response.text()).slice(0, 200))
    }
  } catch (error) {
    console.error('[storage] hapus gagal:', (error as Error).message)
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

/**
 * Hapus satu objek dari bucket foto.
 *
 * Kegagalan di sini tidak pernah melempar: baris database tetap dihapus, dan
 * berkas yatim di bucket jauh lebih ringan akibatnya daripada permintaan yang
 * gagal padahal datanya sudah hilang.
 */
export const deleteObject = (path: string): Promise<void> => deleteFrom(STORAGE_BUCKET, path)

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
 * Mengembalikan `null` bila permintaannya ditolak, supaya pemanggil
 * menampilkan keterangan yang jujur alih-alih gambar rusak.
 */
const signedUrlFor = async (
  bucket: string,
  path: string | null,
  expiresIn: number,
): Promise<string | null> => {
  const kunci = kunciRahasia()
  if (!kunci || !path) return null

  try {
    const response = await fetch(
      `${apiBase()}/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kunci}`,
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

/** Satu berkas yang sudah dibaca dari isi permintaan multipart. */
export interface BerkasUnggahan {
  bytes: Uint8Array
  /** Ukuran yang dilaporkan peramban, dipakai memeriksa batas sebelum dibaca. */
  size: number
  name: string
}

/**
 * Baca satu berkas dari isi permintaan `multipart/form-data`.
 *
 * Pengganti peran multer di backend Express. Bedanya, di sini isi permintaan
 * dibaca sekaligus ke memori, jadi batas ukurannya diperiksa dua kali: dari
 * ukuran yang dilaporkan sebelum isinya dibaca, lalu dari panjang isi yang
 * benar-benar terbaca. Yang pertama menolak lebih awal, yang kedua menutup
 * ketidaksesuaian antara yang dilaporkan dan yang dikirim.
 *
 * Nama field-nya tetap sama seperti sebelumnya ("photo", "document"), karena
 * formulir di frontend mengirimnya dengan nama itu.
 */
export const bacaBerkas = async (
  req: Request,
  namaField: string,
  batas: number,
  label: string,
): Promise<BerkasUnggahan> => {
  let form: FormData

  try {
    form = await req.formData()
  } catch {
    throw new HttpError(400, 'Isi permintaan bukan formulir unggahan yang sah')
  }

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
