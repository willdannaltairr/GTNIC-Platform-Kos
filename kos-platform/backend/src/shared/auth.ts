import { bacaCookie, COOKIE_ACCESS } from './cookies.ts'
import { queryOne } from './db.ts'
import { HttpError } from './http.ts'
import { verifikasiAkses } from './jwt.ts'

/**
 * Pemeriksaan sesi untuk seluruh rute yang membutuhkan akun.
 *
 * Perannya dibaca dari `public.users`, bukan dari token. Token yang membawa
 * peran lama akan terus mengaku pemilik kos atau admin walaupun perannya sudah
 * diubah, dan database satu-satunya tempat di mana peran bisa dipercaya.
 */

export interface AuthUser {
  userId: string
  email: string
  role: string
}

/**
 * Ambil pengguna dari id yang ada di token.
 *
 * Dijalankan pada setiap permintaan yang butuh sesi. Akun yang dinonaktifkan
 * atau dihapus langsung tertolak, walaupun tokennya sendiri masih berlaku.
 */
const penggunaDariId = async (id: string): Promise<AuthUser> => {
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

const penggunaDariToken = async (token: string): Promise<AuthUser> =>
  penggunaDariId(verifikasiAkses(token))

export const authenticate = async (req: Request): Promise<AuthUser> => {
  const token = bacaCookie(req, COOKIE_ACCESS)

  if (!token) {
    throw new HttpError(401, 'Tidak terautentikasi, silakan login')
  }

  return penggunaDariToken(token)
}

/**
 * Seperti `authenticate`, tetapi tamu diizinkan lewat.
 *
 * Dipakai endpoint publik yang isinya berbeda untuk pemiliknya, misalnya daftar
 * kamar: boleh dibaca siapa saja, tetapi pemilik propertinya juga perlu melihat
 * kamar yang belum terbit. Token yang sudah mati diperlakukan sebagai tamu,
 * bukan sebagai galat.
 */
export const optionalAuthenticate = async (req: Request): Promise<AuthUser | null> => {
  const token = bacaCookie(req, COOKIE_ACCESS)
  if (!token) return null

  try {
    return await penggunaDariToken(token)
  } catch {
    return null
  }
}

/** Batasi rute ke peran tertentu. Peran datang dari database, bukan dari klien. */
export const authorize = (user: AuthUser, ...roles: string[]): void => {
  if (!roles.includes(user.role)) {
    throw new HttpError(403, 'Akses ditolak untuk peran ini')
  }
}

export { penggunaDariId }
