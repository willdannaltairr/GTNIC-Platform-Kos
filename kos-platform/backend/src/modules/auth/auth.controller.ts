import { Request, Response } from 'express'
import { env } from '../../config/env'
import { HttpError } from '../../lib/httpError'
import type { AuthRequest } from '../../middleware/auth'
import { usersService } from '../users/users.service'
import { authService, type TokenPayload } from './auth.service'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './auth.validator'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 menit, samakan dengan JWT_ACCESS_EXPIRES_IN
}

/**
 * Masa berlaku cookie refresh.
 *
 * Cookie access yang cuma 15 menit membuat sesi terasa "hilang" setiap kali
 * pengunjung menutup tab lalu kembali, padahal refresh token-nya masih sah.
 * Nilai di sini harus sejalan dengan JWT_REFRESH_EXPIRES_IN; kalau lebih
 * pendek, cookie-nya mati lebih dulu daripada token yang dibawanya dan
 * pengunjung diminta masuk lagi tanpa alasan.
 */
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000 // 30 hari

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const data: RegisterInput = registerSchema.parse(req.body)

    const user = await authService.createUser({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
    })

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      data: user,
    })
  },

  async login(req: Request, res: Response): Promise<void> {
    const data: LoginInput = loginSchema.parse(req.body)

    const user = await authService.validateUser(data.email, data.password)

    if (!user) {
      throw new HttpError(401, 'Email atau password salah')
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    // Token dikirim hanya lewat cookie HttpOnly, tidak dikembalikan di body
    // agar tidak tergoda disimpan di localStorage oleh klien.
    res.cookie('access_token', authService.generateAccessToken(tokenPayload), COOKIE_OPTIONS)
    res.cookie('refresh_token', authService.generateRefreshToken(tokenPayload), {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    })

    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    })
  },

  /**
   * Perpanjang sesi memakai cookie refresh.
   *
   * Tanpa endpoint ini, cookie access yang berumur 15 menit membuat pengunjung
   * diminta masuk lagi hanya karena menutup tab sebentar, padahal refresh
   * token-nya masih berlaku berhari-hari dan tidak ada yang memakainya.
   *
   * Kedua cookie disetel ulang dengan masa berlaku penuh, sehingga sesi yang
   * terus dipakai tidak mati hanya karena sudah lewat 30 hari sejak login
   * pertama. Yang tidak pernah kembali, tentu saja tetap berakhir.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token

    if (!token) {
      throw new HttpError(401, 'Tidak ada sesi untuk diperpanjang')
    }

    let payload: TokenPayload
    try {
      payload = authService.verifyToken(token)
    } catch {
      throw new HttpError(401, 'Sesi sudah berakhir, silakan masuk kembali')
    }

    const user = await authService.findSessionUser(payload.userId)

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    res.cookie('access_token', authService.generateAccessToken(tokenPayload), COOKIE_OPTIONS)
    res.cookie('refresh_token', authService.generateRefreshToken(tokenPayload), {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    })

    res.json({
      success: true,
      message: 'Sesi diperpanjang',
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    })
  },

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('access_token', { path: '/' })
    res.clearCookie('refresh_token', { path: '/' })
    res.json({
      success: true,
      message: 'Logout berhasil',
    })
  },

  async me(req: Request, res: Response): Promise<void> {
    const userId = (req as AuthRequest).user!.userId
    const user = await usersService.getProfile(userId)

    res.json({
      success: true,
      message: 'Data pengguna',
      data: { user },
    })
  },
}
