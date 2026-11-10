import { bacaCookie, COOKIE_ACCESS } from './cookies.ts'
import { HttpError } from './http.ts'
import type { AuthUser } from './supabase.ts'
import { penggunaDariToken } from './supabase.ts'

/**
 * Tipe pengguna yang sedang masuk, diterbitkan ulang dari sini.
 *
 * Seluruh service mengimpornya bersama `authenticate`, dan satu sumber impor
 * untuk pasangan yang selalu dipakai bersamaan membuat berkasnya tidak perlu
 * tahu dari mana tipenya berasal.
 */
export type { AuthUser }

/**
 * Pemeriksaan sesi untuk seluruh rute yang membutuhkan akun.
 *
 * Perannya dibaca dari `public.users`, bukan dari token. Token yang membawa
 * peran lama akan terus mengaku pemilik kos atau admin walaupun perannya sudah
 * diubah, dan itu satu-satunya tempat di mana peran bisa dipercaya.
 */
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
 * bukan sebagai galat, karena halamannya memang boleh diakses tanpa masuk.
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
