import { z } from 'npm:zod@3'

/**
 * Validasi untuk modul autentikasi.
 *
 * Pesannya ditulis untuk dibaca pengunjung: halaman daftar dan masuk
 * menampilkan `errors[0].message` apa adanya, dan mengubah kalimatnya berarti
 * mengubah apa yang dibaca pengunjung tanpa alasan.
 */

/**
 * Data kos yang diisi pemilik saat mendaftar.
 *
 * Isiannya sengaja hanya yang benar-benar dipakai platform untuk menampilkan
 * kos: nama, alamat, jenis, dan fasilitas. Jumlah kamar, harga, dan foto tidak
 * diminta di sini karena ketiganya diisi di halaman pengelolaan properti
 * setelah akunnya jadi, dan menanyakannya saat mendaftar membuat formulir
 * pendaftaran berubah menjadi formulir properti yang menghentikan orang di
 * tengah jalan.
 *
 * Batas panjangnya disamakan dengan `properties.validator.ts` supaya isian yang
 * lolos di sini tidak ditolak lagi saat pemiliknya memperbarui kosnya nanti.
 */
export const propertyPendaftaranSchema = z.object({
  name: z.string().trim().min(3, 'Nama kos minimal 3 karakter').max(120),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().min(5, 'Alamat kos minimal 5 karakter').max(300),
  province: z.string().trim().min(1, 'Provinsi wajib diisi').max(80),
  city: z.string().trim().min(1, 'Kota wajib diisi').max(80),
  district: z.string().trim().min(1, 'Kecamatan wajib diisi').max(80),
  subdistrict: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(10).optional(),
  propertyType: z.enum(['KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR'], {
    message: 'Jenis kos harus salah satu dari: KOS_PUTRA, KOS_PUTRI, KOS_CAMPUR',
  }),
  genderPolicy: z.enum(['putra', 'putri', 'campur'], {
    message: 'Kebijakan penghuni harus salah satu dari: putra, putri, campur',
  }),
  /** Slug fasilitas dari tabel master; yang tidak dikenal dilewati. */
  facilitySlugs: z.array(z.string().trim().min(1)).max(30).optional(),
})

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['TENANT', 'OWNER'], {
    required_error: 'Pilih peran pengguna (tenant atau owner)',
  }),
  /**
   * Kos pertama milik pemilik yang baru mendaftar.
   *
   * Opsional, dan hanya bermakna untuk peran OWNER: pemilik yang ingin
   * mengenalkan kosnya sambil mendaftar mengisinya, sedangkan pemilik yang
   * belum siap boleh melewatinya dan menambah kosnya kapan saja. Peran TENANT
   * yang mengirimkannya tidak membuat kos apa pun.
   */
  property: propertyPendaftaranSchema.optional(),
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
export type PropertyPendaftaranInput = z.infer<typeof propertyPendaftaranSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
