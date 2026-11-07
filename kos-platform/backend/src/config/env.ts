import dotenv from 'dotenv'

dotenv.config()

const required = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} wajib diisi`)
  }
  return value
}

/**
 * Origin frontend yang diizinkan mengakses API.
 *
 * Boleh lebih dari satu, dipisah koma — mis. ketika dev server web jatuh ke
 * port lain karena 3000 sudah dipakai. Browser memblokir permintaan
 * lintas-origin yang tidak terdaftar di sini, termasuk login dan daftar.
 */
const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  FRONTEND_URL: allowedOrigins,
  BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:4000',
  API_PREFIX: process.env.API_PREFIX ?? '/api/v1',
  DATABASE_URL: required('DATABASE_URL'),
  /**
   * Mode TLS ke database.
   *
   * `auto` (default) menyalakan TLS hanya untuk host non-lokal — Supabase wajib
   * terenkripsi, sedangkan cluster PostgreSQL di mesin sendiri umumnya tidak
   * menyediakan TLS. Isi `disable` atau `require` untuk memaksa salah satunya.
   */
  DB_SSL: (process.env.DB_SSL ?? 'auto') as 'auto' | 'disable' | 'require',
  JWT_SECRET: required('JWT_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  /**
   * Penyimpanan foto (Supabase Storage).
   *
   * Boleh kosong: seluruh endpoint selain unggah foto tetap bekerja, dan
   * unggahan gagal dengan pesan yang menyebut variabel mana yang belum diisi —
   * bukan dengan galat samar dari driver.
   */
  SUPABASE_URL: process.env.SUPABASE_URL ?? '',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? '',
  STORAGE_BUCKET: process.env.STORAGE_BUCKET ?? 'room-photos',
  MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY ?? '',
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '',
  MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',
}
