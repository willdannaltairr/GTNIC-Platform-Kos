import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

import { query, queryOne, withTransaction } from '../shared/db.ts'
import { HttpError } from '../shared/http.ts'
import { buatSesi, verifikasiRefresh } from '../shared/jwt.ts'
import {
  buildResetUrl,
  buildVerifyUrl,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from '../shared/mailer.ts'
import { usersService } from './users.service.ts'
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
} from './auth.validator.ts'

/**
 * Autentikasi.
 *
 * Kata sandi dan sesi sekarang dipegang server ini sendiri: sandi di-hash
 * dengan bcrypt dan disimpan di `users.password_hash`, sesi diterbitkan sebagai
 * JWT. Sebelumnya keduanya dititipkan ke Supabase Auth, dan pemindahan ini
 * menghapus ketergantungan itu sepenuhnya.
 *
 * Bentuk jawaban, nama cookie, dan seluruh perilaku yang terlihat pengunjung
 * tidak berubah: halaman masuk, daftar, profil, dan alur lupa sandi memanggil
 * alamat yang sama dan membaca `data.user` yang sama seperti sebelumnya.
 *
 * Verifikasi email tetap alur platform sendiri: yang ditandai terverifikasi
 * adalah `users.email_verified_at`, dan tautannya memakai token platform.
 */

/** Sidik jari token: yang disimpan hash-nya, bukan tokennya. */
const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

/** Lama berlaku tautan atur ulang sandi, dalam menit. */
const MENIT_TAUTAN_SANDI = 60

/** Biaya hashing bcrypt. Sepuluh cukup untuk kata sandi biasa dan masih cepat. */
const BCRYPT_ROUNDS = 10

/** Profil ringkas yang dikembalikan setelah masuk. */
const PROFIL_SESI = `id, full_name, email, role`

export const authService = {
  /**
   * Daftar akun baru.
   *
   * Urutannya: periksa email, hash sandi, lalu tulis profil, kos pertama, dan
   * fasilitasnya dalam SATU transaksi. Ketiganya saling bergantung: pemilik
   * yang mendaftar sambil mengisi kosnya harus mendapat ketiganya sekaligus.
   *
   * Peran dibatasi TENANT dan OWNER oleh validator. ADMIN tidak bisa dipilih
   * dari sini.
   */
  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase()

    const sudahAda = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    )
    if (sudahAda) {
      throw new HttpError(409, 'Email sudah terdaftar')
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    try {
      const { profil, kos } = await withTransaction(async (client) => {
        const id = crypto.randomUUID()

        const barisProfil = await client.query<{
          id: string
          full_name: string
          email: string
          role: string
          account_status: string
          created_at: Date
        }>(
          `INSERT INTO users (id, full_name, email, role, password_hash, account_status)
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
           RETURNING id, full_name, email, role, account_status, created_at`,
          [id, input.fullName, email, input.role, passwordHash],
        )

        // Peran TENANT yang mengirim data kos tidak membuat kos apa pun: field
        // itu hanya bermakna bagi pemilik.
        if (input.role !== 'OWNER' || !input.property) {
          return { profil: barisProfil, kos: null }
        }

        const properti = input.property
        const propertiId = crypto.randomUUID()

        const dasar =
          properti.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'kos'

        const [terpakai] = await client.query<{ ada: boolean }>(
          `SELECT true AS ada FROM properties WHERE slug = $1 LIMIT 1`,
          [dasar],
        )
        const slug = terpakai ? `${dasar}-${propertiId.slice(0, 8)}` : dasar

        await client.query(
          `INSERT INTO properties (
             id, owner_id, name, slug, description, address, province, city, district,
             subdistrict, postal_code, property_type, gender_policy,
             verification_status, publication_status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING', 'DRAFT')`,
          [
            propertiId,
            id,
            properti.name,
            slug,
            properti.description ?? null,
            properti.address,
            properti.province,
            properti.city,
            properti.district,
            properti.subdistrict ?? null,
            properti.postalCode ?? null,
            properti.propertyType,
            properti.genderPolicy,
          ],
        )

        if (properti.facilitySlugs && properti.facilitySlugs.length > 0) {
          await client.query(
            `INSERT INTO property_facilities (property_id, facility_id)
             SELECT $1, f.id FROM facilities f WHERE f.slug = ANY($2::text[])`,
            [propertiId, properti.facilitySlugs],
          )
        }

        return {
          profil: barisProfil,
          kos: { id: propertiId, name: properti.name, slug },
        }
      })

      // Tautan verifikasi dikirim saat mendaftar, bukan menunggu pengunjung
      // mencarinya sendiri.
      const token = await this.createEmailVerificationToken(profil[0].id)

      await sendEmailVerificationEmail({
        to: profil[0].email,
        fullName: profil[0].full_name,
        verifyUrl: buildVerifyUrl(token),
      })

      return { user: profil[0], property: kos, verifyToken: token }
    } catch (error) {
      // Dua pendaftaran bersamaan dengan email sama tetap ditangkap di sini.
      if ((error as { code?: string }).code === '23505') {
        throw new HttpError(409, 'Email sudah terdaftar')
      }
      throw error
    }
  },

  /**
   * Masuk dengan email dan sandi.
   *
   * Sandi diperiksa bcrypt, dan kegagalannya diseragamkan menjadi satu
   * kalimat. Membedakan "email tidak terdaftar" dari "sandi salah" akan
   * memberi tahu penebak email mana yang punya akun di platform ini.
   */
  async login(input: LoginInput): Promise<{
    user: { id: string; full_name: string; email: string; role: string }
    token: { accessToken: string; refreshToken: string }
  }> {
    const akun = await queryOne<{ id: string; password_hash: string | null }>(
      `SELECT id, password_hash FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [input.email.trim().toLowerCase()],
    )

    // Waktu hashing tetap dijalankan walau akunnya tidak ada, supaya lama
    // jawaban tidak membocorkan email mana yang terdaftar.
    const cocok = akun?.password_hash
      ? await bcrypt.compare(input.password, akun.password_hash)
      : await bcrypt.compare(input.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin')

    if (!akun || !cocok) {
      throw new HttpError(401, 'Email atau password salah')
    }

    const user = await usersService.getProfile(akun.id)

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])

    return {
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      token: buatSesi(user.id),
    }
  },

  /**
   * Perpanjang sesi memakai cookie refresh.
   *
   * Tanpa langkah ini, pengunjung diminta masuk lagi setiap kali token
   * aksesnya habis, padahal sesi penyegarnya masih berlaku berhari-hari.
   */
  async refresh(refreshToken: string): Promise<{
    user: { id: string; full_name: string; email: string; role: string }
    token: { accessToken: string; refreshToken: string }
  }> {
    let userId: string
    try {
      userId = verifikasiRefresh(refreshToken)
    } catch {
      throw new HttpError(401, 'Sesi sudah berakhir, silakan masuk kembali')
    }

    const user = await usersService.getProfile(userId)

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    return {
      user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      token: buatSesi(user.id),
    }
  },

  /**
   * Akhiri sesi.
   *
   * JWT bersifat stateless, jadi tidak ada yang perlu dicabut di server: yang
   * mengakhiri sesi adalah cookie yang dihapus pemanggilnya. Fungsi ini
   * dipertahankan supaya rute logout tidak perlu tahu soal itu.
   */
  async logout(): Promise<void> {
    // Sengaja kosong.
  },

  findByEmail(email: string) {
    return queryOne<{ id: string; full_name: string; email: string }>(
      `SELECT id, full_name, email FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.trim().toLowerCase()],
    )
  },

  /**
   * Terbitkan token atur ulang sandi.
   *
   * Tabelnya hanya menyimpan satu baris per akun, jadi permintaan kedua menimpa
   * baris yang ada: hanya tautan terbaru yang berlaku.
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, now() + interval '${MENIT_TAUTAN_SANDI} minutes')
       ON CONFLICT (user_id) DO UPDATE
       SET token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           used_at = NULL,
           created_at = now()`,
      [userId, hashToken(token)],
    )

    return token
  },

  /**
   * Ganti sandi memakai token.
   *
   * Dua hal harus berhasil bersama: sandi baru disimpan sebagai hash, dan
   * tokennya ditandai terpakai. Kalau hanya salah satunya, tautan yang sama
   * bisa dipakai berulang.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const row = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)],
    )

    if (!row) {
      throw new HttpError(400, 'Tautan atur ulang sandi tidak berlaku atau sudah kedaluwarsa')
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users
         SET password_hash = $2, password_changed_at = now(), updated_at = now()
         WHERE id = $1`,
        [row.user_id, passwordHash],
      )
      await client.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [row.id])
    })
  },

  /**
   * Terbitkan token verifikasi email.
   *
   * Sebentuk dengan token sandi, bedanya hanya masa berlaku: 24 jam.
   */
  async createEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')

    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, now() + interval '24 hours')
       ON CONFLICT (user_id) DO UPDATE
       SET token = EXCLUDED.token,
           expires_at = EXCLUDED.expires_at,
           used_at = NULL,
           created_at = now()`,
      [userId, hashToken(token)],
    )

    return token
  },

  /**
   * Tandai email pemilik token sebagai terverifikasi.
   *
   * Tautan yang sudah dipakai tetap dijawab sukses selama emailnya memang sudah
   * terverifikasi: halaman yang dimuat ulang setelah verifikasi berhasil tidak
   * boleh berubah menjadi pesan gagal.
   */
  async verifyEmail(token: string): Promise<void> {
    const row = await queryOne<{
      id: string
      user_id: string
      used_at: Date | null
      kedaluwarsa: boolean
      email_verified_at: Date | null
    }>(
      `SELECT t.id, t.user_id, t.used_at, t.expires_at <= now() AS kedaluwarsa,
              u.email_verified_at
       FROM email_verification_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token = $1`,
      [hashToken(token)],
    )

    if (!row || row.kedaluwarsa) {
      throw new HttpError(400, 'Tautan verifikasi email tidak berlaku atau sudah kedaluwarsa')
    }

    if (row.used_at) {
      if (row.email_verified_at) return
      throw new HttpError(400, 'Tautan verifikasi email tidak berlaku atau sudah kedaluwarsa')
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users SET email_verified_at = now(), updated_at = now()
         WHERE id = $1 AND email_verified_at IS NULL`,
        [row.user_id],
      )
      await client.query(`UPDATE email_verification_tokens SET used_at = now() WHERE id = $1`, [row.id])
    })
  },

  /** Isi permintaan lupa sandi: token mentah hanya untuk pengembangan. */
  async forgotPassword(input: ForgotPasswordInput): Promise<string | null> {
    const user = await this.findByEmail(input.email)
    if (!user) return null

    const token = await this.createPasswordResetToken(user.id)

    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.full_name,
      resetUrl: buildResetUrl(token),
    })

    return token
  },
}
