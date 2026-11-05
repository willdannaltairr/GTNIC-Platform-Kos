import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../../config/env'
import { HttpError } from '../../lib/httpError'
import { prisma } from '../../lib/prisma'

export interface TokenPayload {
  userId: string
  email: string
  role: string
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
    const existing = await prisma.users.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      throw new HttpError(409, 'Email sudah terdaftar')
    }

    const passwordHash = await this.hashPassword(data.password)

    const user = await prisma.users.create({
      data: {
        full_name: data.fullName,
        email: data.email,
        password_hash: passwordHash,
        role: data.role,
        account_status: 'ACTIVE',
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        account_status: true,
        created_at: true,
      },
    })

    return user
  },

  async validateUser(email: string, password: string) {
    const user = await prisma.users.findFirst({
      where: { email, deleted_at: null },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        password_hash: true,
        account_status: true,
      },
    })

    if (!user) return null

    if (!user.password_hash) return null

    const isMatch = await this.comparePassword(password, user.password_hash)
    if (!isMatch) return null

    if (user.account_status !== 'ACTIVE') {
      throw new HttpError(403, 'Akun tidak aktif')
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    })

    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  },

  generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    }
    return jwt.sign(payload, env.JWT_SECRET, options)
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
