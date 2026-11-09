import { queryOne } from './db.ts'
import { HttpError } from './http.ts'

/**
 * Jembatan ke Supabase Auth.
 *
 * Kata sandi dan sesi pindah ke Supabase Auth; peran dan profil tetap di
 * `public.users`. Pemisahan itu bukan pilihan gaya: seluruh foreign key di
 * database ini (properti, booking, kontrak, tagihan) menunjuk ke
 * `public.users`, sehingga mengganti tabelnya dengan `auth.users` akan memutus
 * setiap relasi yang sudah ada.
 *
 * Karena itu satu akun punya dua baris dengan id yang sama: satu di
 * `auth.users` yang menyimpan kata sandi dan sesinya, satu di `public.users`
 * yang menyimpan nama, peran, dan statusnya.
 */

export interface AuthUser {
  userId: string
  email: string
  role: string
}

/**
 * Kunci Supabase.
 *
 * Bentuk barunya satu variabel berisi kamus JSON, dan yang lama satu variabel
 * berisi kunci tunggal. Keduanya dibaca supaya fungsi yang sama tetap jalan di
 * proyek yang belum dipindah ke kunci baru.
 */
const dariKamus = (namaBaru: string, namaLama: string): string => {
  const kamus = Deno.env.get(namaBaru)
  if (kamus) {
    try {
      const isi = JSON.parse(kamus) as Record<string, string>
      const nilai = isi.default ?? Object.values(isi)[0]
      if (nilai) return nilai
    } catch {
      console.error(`[auth] ${namaBaru} bukan JSON yang sah`)
    }
  }

  return Deno.env.get(namaLama) ?? ''
}

export const kunciPublik = (): string => dariKamus('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')

/** Kunci rahasia: hanya boleh dipakai di sisi server, tidak pernah dikirim ke klien. */
export const kunciRahasia = (): string => dariKamus('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')

export const supabaseUrl = (): string => (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '')

/** Panggilan ke API Auth Supabase, dengan kunci yang sesuai keperluannya. */
export const authFetch = async (
  path: string,
  init: RequestInit & { kunci?: 'publik' | 'rahasia' } = {},
): Promise<Response> => {
  const { kunci = 'publik', ...rest } = init
  const token = kunci === 'rahasia' ? kunciRahasia() : kunciPublik()

  if (!token) {
    throw new HttpError(500, 'Kunci Supabase belum tersedia di lingkungan fungsi ini')
  }

  const headers = new Headers(rest.headers)
  headers.set('apikey', token)
  headers.set('Authorization', `Bearer ${token}`)
  if (rest.body) headers.set('Content-Type', 'application/json')

  return fetch(`${supabaseUrl()}/auth/v1${path}`, { ...rest, headers })
}

/** Isi balasan Supabase Auth bila berhasil; pesannya diangkat bila ditolak. */
export const authJson = async <T>(response: Response, pesanGagal: string): Promise<T> => {
  const teks = await response.text()
  const isi = teks ? (JSON.parse(teks) as Record<string, unknown>) : {}

  if (!response.ok) {
    const pesan = (isi.msg ?? isi.message ?? isi.error_description ?? isi.error) as string | undefined
    // `error_code` lebih dulu daripada `code`: pada sebagian balasan, `code`
    // justru berisi status HTTP-nya, bukan nama galatnya.
    const kode = isi.error_code

    throw new HttpError(
      response.status === 400 ? 400 : response.status,
      pesan ?? pesanGagal,
      kode === undefined || kode === null ? null : String(kode),
    )
  }

  return isi as T
}

export interface SesiSupabase {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string; email: string | null }
}

/**
 * Periksa token akses dan ambil pemiliknya.
 *
 * Pemeriksaannya lewat Supabase, bukan dengan memeriksa tanda tangan sendiri:
 * dengan begitu kunci penandatangan tidak perlu ada di sini sama sekali, dan
 * token yang sudah dicabut ikut tertolak. Harganya satu permintaan tambahan
 * per panggilan API, dan itu sebanding dengan kejelasan jawabannya.
 */
export const userDariToken = async (token: string): Promise<{ id: string; email: string | null }> => {
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: {
      apikey: kunciPublik(),
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new HttpError(401, 'Token tidak valid atau kadaluarsa')
  }

  const isi = (await response.json()) as { id: string; email: string | null }
  return { id: isi.id, email: isi.email }
}

/**
 * Pengguna yang sedang masuk, lengkap dengan perannya.
 *
 * Peran dibaca dari `public.users`, bukan dari token, karena di sanalah
 * kebenarannya dan di sana pula admin mengubahnya. Token yang membawa peran
 * lama akan terus mengaku admin walaupun perannya sudah dicabut.
 */
export const penggunaDariToken = async (token: string): Promise<AuthUser> => {
  const akun = await userDariToken(token)
  return penggunaDariId(akun.id)
}

export const penggunaDariId = async (id: string): Promise<AuthUser> => {
  const row = await queryOne<{ id: string; email: string; role: string; account_status: string }>(
    `SELECT id, email, role, account_status FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )

  if (!row) {
    throw new HttpError(403, 'Akun ini belum punya profil di platform, hubungi pengelola')
  }

  if (row.account_status !== 'ACTIVE') {
    throw new HttpError(403, 'Akun tidak aktif')
  }

  return { userId: row.id, email: row.email, role: row.role }
}
