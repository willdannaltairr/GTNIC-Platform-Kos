import { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/httpError'
import { authService } from '../modules/auth/auth.service'

export interface AuthUser {
  userId: string
  email: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthUser
  ownership?: {
    entityType: string
    resourceId: string | undefined
    userId: string
    userRole: string
  }
}

/** Memverifikasi access token dari cookie HttpOnly dan mengisi req.user. */
export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.access_token

  if (!token) {
    return next(new HttpError(401, 'Tidak terautentikasi, silakan login'))
  }

  try {
    req.user = authService.verifyToken(token)
    next()
  } catch {
    next(new HttpError(401, 'Token tidak valid atau kadaluarsa'))
  }
}

/**
 * Role-Based Access Control. Role selalu dibaca dari token yang sudah
 * diverifikasi server — bukan dari input pengguna.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new HttpError(401, 'Tidak terautentikasi'))
    }

    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Akses ditolak untuk peran ini'))
    }

    next()
  }
}

/**
 * Menyimpan konteks kepemilikan resource untuk diverifikasi di service layer.
 * Admin melewati pemeriksaan ini; service tetap wajib memfilter data
 * berdasarkan userId pemilik untuk peran lain.
 */
export const ownershipCheck = (entityType: string, idParam: string = 'id') => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const user = req.user
    if (!user) {
      return next(new HttpError(401, 'Tidak terautentikasi'))
    }

    if (user.role === 'ADMIN') {
      return next()
    }

    req.ownership = {
      entityType,
      resourceId: req.params[idParam],
      userId: user.userId,
      userRole: user.role,
    }

    next()
  }
}
