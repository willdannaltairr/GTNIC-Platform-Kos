import jwt from 'jsonwebtoken'

import { env, envWajib } from '../env.ts'
import { HttpError } from './http.ts'

/**
 * Penerbitan dan pemeriksaan token sesi.
 *
 * Menggantikan Supabase Auth. Bentuk tokennya sekarang milik server ini
 * sendiri: dua token, satu berumur pendek untuk setiap permintaan dan satu
 * berumur panjang untuk memperpanjang sesi. Peran sengaja tidak dipakai dari
 * token — peran dibaca dari database di `auth.ts` — sehingga pencabutan peran
 * langsung berlaku tanpa menunggu token kedaluwarsa.
 */

export interface TokenSesi {
  accessToken: string
  refreshToken: string
}

interface IsiToken {
  sub: string
  jenis: 'access' | 'refresh'
}

const kunci = (): string => envWajib('JWT_SECRET')

/** Umur token akses, dalam bentuk yang diterima `jsonwebtoken` (mis. `1h`). */
const umurAkses = (): string => env('JWT_ACCESS_TTL', '1h')

/** Umur token penyegar. */
const umurRefresh = (): string => env('JWT_REFRESH_TTL', '30d')

const terbitkan = (userId: string, jenis: IsiToken['jenis'], umur: string): string =>
  // Tipe `expiresIn` menuntut bentuk literal seperti `1h`; nilainya datang dari
  // `.env`, jadi diperiksa saat dipakai, bukan saat kompilasi.
  jwt.sign({ sub: userId, jenis }, kunci(), { expiresIn: umur as jwt.SignOptions['expiresIn'] })

/** Terbitkan sepasang token untuk satu pengguna. */
export const buatSesi = (userId: string): TokenSesi => ({
  accessToken: terbitkan(userId, 'access', umurAkses()),
  refreshToken: terbitkan(userId, 'refresh', umurRefresh()),
})

const periksa = (token: string, jenis: IsiToken['jenis']): string => {
  let isi: jwt.JwtPayload
  try {
    isi = jwt.verify(token, kunci()) as jwt.JwtPayload
  } catch {
    throw new HttpError(401, 'Token tidak valid atau kadaluarsa')
  }

  // Token penyegar tidak boleh dipakai sebagai token akses, walaupun
  // tanda tangannya sah: keduanya ditandatangani kunci yang sama.
  if (isi.jenis !== jenis || typeof isi.sub !== 'string') {
    throw new HttpError(401, 'Token tidak valid atau kadaluarsa')
  }

  return isi.sub
}

/** Periksa token akses, kembalikan id penggunanya. */
export const verifikasiAkses = (token: string): string => periksa(token, 'access')

/** Periksa token penyegar, kembalikan id penggunanya. */
export const verifikasiRefresh = (token: string): string => periksa(token, 'refresh')
