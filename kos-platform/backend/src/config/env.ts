import dotenv from 'dotenv'

dotenv.config()

const required = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} wajib diisi`)
  }
  return value
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL ?? 'http://localhost:4000',
  API_PREFIX: process.env.API_PREFIX ?? '/api/v1',
  DATABASE_URL: required('DATABASE_URL'),
  DIRECT_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  JWT_SECRET: required('JWT_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
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
