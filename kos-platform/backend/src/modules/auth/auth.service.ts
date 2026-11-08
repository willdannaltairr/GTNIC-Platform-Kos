import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env'
import { PG_ERROR, query, queryOne } from '../../lib/db'
import { HttpError } from '../../lib/httpError'

export interface TokenPayload {
  userId: string
  email: string
  role: string
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
    }>(
      `SELECT id, full_name, email, role, account_status
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

  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload
  },
}
