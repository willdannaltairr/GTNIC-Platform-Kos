import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env'
import { PG_ERROR, query, queryOne, withTransaction } from '../../lib/db'
import { HttpError } from '../../lib/httpError'

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

/**
 * Payload token yang sudah diverifikasi.
 *
 * `iat` ikut dibaca karena atur ulang sandi perlu membandingkannya dengan
 * waktu ganti sandi: token yang diterbitkan sebelum sandi diganti harus
 * ditolak, dan itu hanya bisa diketahui dari waktu terbitnya.
 */
export interface VerifiedTokenPayload extends TokenPayload {
  iat: number
  exp: number
}

export interface UserRow {
  id: string
  full_name: string
  email: string
  role: string
  account_status: string
  password_hash: string | null
  created_at: Date
}

/**
 * Sidik jari token atur ulang sandi.
 *
 * Yang disimpan di database adalah hash-nya, bukan tokennya sendiri. Tautan
 * atur ulang sandi adalah kunci akun selama satu jam; kalau isi tabelnya bocor
 * (dump, backup, log query), token mentah berarti siapa pun bisa mengambil alih
 * akun yang tokennya masih berlaku. Hash-nya tidak bisa dipakai untuk itu.
 */
const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS)
  },

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  },

  async createUser(data: {
    fullName: string
    email: string
    password: string
    role: 'TENANT' | 'OWNER'
  }) {
    const passwordHash = await this.hashPassword(data.password)

    // Keunikan email dijaga indeks unik di database, bukan oleh pemeriksaan
    // terpisah, supaya dua permintaan yang datang bersamaan tidak bisa
    // sama-sama lolos.
    try {
      const rows = await query<{
        id: string
        full_name: string
        email: string
        role: string
        account_status: string
        created_at: Date
      }>(
        `INSERT INTO users (full_name, email, password_hash, role, account_status)
         VALUES ($1, $2, $3, $4, 'ACTIVE')
         RETURNING id, full_name, email, role, account_status, created_at`,
        [data.fullName, data.email, passwordHash, data.role],
      )

      return rows[0]
    } catch (error) {
      if ((error as { code?: string }).code === PG_ERROR.UNIQUE_VIOLATION) {
        throw new HttpError(409, 'Email sudah terdaftar')
      }
      throw error
    }
  },

  /**
   * Cari akun berdasarkan email untuk alur atur ulang sandi.
   *
   * Mengembalikan null untuk akun yang tidak ada maupun yang sudah dihapus,
   * tanpa membedakan keduanya: pemanggilnya memang tidak boleh tahu bedanya,
   * karena perbedaan itu yang membocorkan email mana yang terdaftar.
   */
  async findByEmail(email: string) {
    return queryOne<{ id: string; full_name: string; email: string }>(
      `SELECT id, full_name, email
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    )
  },

  /**
   * Terbitkan token atur ulang sandi baru.
   *
   * Tabel `password_reset_tokens` hanya menyimpan SATU baris per akun (indeks
   * unik `password_reset_tokens_user_id_key`), jadi permintaan kedua tidak
   * boleh menyisipkan baris baru, melainkan menimpa baris yang ada. Itu
   * sekaligus memberi perilaku yang diinginkan: hanya tautan terbaru yang
   * berlaku, dan permintaan berulang tidak meninggalkan kunci aktif yang tidak
   * lagi diketahui pemiliknya.
   *
   * `created_at` ikut diperbarui supaya barisnya mencerminkan kapan tautan
   * terakhir diterbitkan, dan `used_at` dikosongkan kembali karena tokennya
   * memang belum dipakai.
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url')

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, now() + interval '60 minutes')
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
   * Ganti sandi memakai token atur ulang.
   *
   * Tiga hal terjadi sekaligus dan harus berhasil bersama: sandi diganti, token
   * ditandai terpakai, dan seluruh sesi lama dihapus. Kalau salah satunya
   * tertinggal, penggantian sandi tidak benar-benar mengusir siapa pun.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const row = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > now()`,
      [hashToken(token)],
    )

    if (!row) {
      throw new HttpError(400, 'Tautan atur ulang sandi tidak berlaku atau sudah kedaluwarsa')
    }

    const passwordHash = await this.hashPassword(password)

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE users
         SET password_hash = $2, password_changed_at = now(), updated_at = now()
         WHERE id = $1`,
        [row.user_id, passwordHash],
      )

      await client.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [row.id])

      await client.query(`DELETE FROM refresh_sessions WHERE user_id = $1`, [row.user_id])
    })
  },

  async validateUser(email: string, password: string) {
    const user = await queryOne<UserRow>(
      `SELECT id, full_name, email, role, account_status, password_hash, created_at
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    )

    if (!user || !user.password_hash) return null

    const isMatch = await this.comparePassword(password, user.password_hash)
    if (!isMatch) return null

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id])

    const { password_hash: _passwordHash, ...userWithoutPassword } = user
    return userWithoutPassword
  },

  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    }
    return jwt.sign(payload, env.JWT_SECRET, options)
  },

  /**
   * Muat ulang pemilik sesi dari database saat sesi diperpanjang.
   *
   * Token yang masih sah belum tentu akunnya masih boleh dipakai: akun bisa
   * dinonaktifkan atau dihapus setelah token diterbitkan. Tanpa pemeriksaan
   * ini, sesi yang diperpanjang terus hidup di atas akun yang sudah ditutup,
   * dan pemiliknya tidak pernah diminta berhenti.
   */
  async findSessionUser(userId: string) {
    const user = await queryOne<{
      id: string
      full_name: string
      email: string
      role: string
      account_status: string
      password_changed_at: Date | null
    }>(
      `SELECT id, full_name, email, role, account_status, password_changed_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    )

    if (!user) {
      throw new HttpError(401, 'Sesi tidak berlaku lagi, silakan masuk kembali')
    }

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    return user
  },

  generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    }
    return jwt.sign(payload, env.JWT_SECRET, options)
  },

  verifyToken(token: string): VerifiedTokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as VerifiedTokenPayload
  },
}
