import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul autentikasi.
 *
 * Pesannya ditulis untuk dibaca pengunjung: halaman daftar dan masuk
 * menampilkan `errors[0].message` apa adanya, dan mengubah kalimatnya berarti
 * mengubah apa yang dibaca pengunjung tanpa alasan.
 */

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['TENANT', 'OWNER'], {
    required_error: 'Pilih peran pengguna (tenant atau owner)',
  }),
})

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Token atur ulang sandi tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Token verifikasi email tidak valid'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
