import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@nestari/shared'
import { hashPassword, verifyPassword } from '../../utils/password'
import { generateToken, hashToken } from '../../utils/tokens'
import { addDays, addMinutes } from '../../utils/dates'
import { BadRequestError, ConflictError, UnauthorizedError } from '../../utils/errors'
import { logger } from '../../config/logger'
import { sendPasswordResetEmail, sendVerificationEmail } from '../../utils/email'
import { writeAuditLog } from '../../utils/audit'
import type { Request } from 'express'

const DUMMY_HASH = '$2b$12$5vh2Xt6FSVF.DQfY6oPvAeQGz8Gkbk.wrNj1VQ1SFt5S2nj5vHOgm'

export interface SessionResult {
  token: string
  expiresAt: Date
}

function publicUser(user: {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  avatarUrl: string | null
  role: string
  accountStatus: string
  emailVerifiedAt: Date | null
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  }
}

async function createSession(userId: string, meta: { ip?: string; userAgent?: string }): Promise<SessionResult> {
  const token = generateToken(32)
  const expiresAt = addDays(new Date(), env.SESSION_TTL_DAYS)
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  })
  return { token, expiresAt }
}

async function issueVerificationToken(userId: string, email: string) {
  const token = generateToken(32)
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: addMinutes(new Date(), env.EMAIL_VERIFICATION_TTL_HOURS * 60),
    },
  })
  await sendVerificationEmail(email, token).catch((error) =>
    logger.warn({ error }, 'verification email could not be sent'),
  )
}

export async function register(
  input: RegisterInput,
  meta: { ip?: string; userAgent?: string },
  req: Request,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN')
  }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phoneNumber: input.phoneNumber ?? null,
        role: input.role,
        accountStatus: 'ACTIVE',
        notificationPreference: { create: {} },
        ...(input.role === 'OWNER'
          ? { ownerProfile: { create: {} } }
          : { tenantProfile: { create: {} } }),
      },
      include: { ownerProfile: true, tenantProfile: true },
    })

    await tx.auditLog.create({
      data: {
        actorId: created.id,
        action: 'AUTH_REGISTER',
        entityType: 'USER',
        entityId: created.id,
        newValues: { email: created.email, role: created.role },
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    })

    return created
  })

  await issueVerificationToken(user.id, user.email)
  const session = await createSession(user.id, meta)

  return { user: publicUser(user), session }
}

export async function login(
  input: LoginInput,
  meta: { ip?: string; userAgent?: string },
  req: Request,
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH)

  if (!user || !passwordMatches || user.deletedAt) {
    throw new UnauthorizedError('Email or password is incorrect', 'INVALID_CREDENTIALS')
  }
  if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'BANNED') {
    throw new UnauthorizedError('This account is not available', 'ACCOUNT_UNAVAILABLE')
  }

  const session = await createSession(user.id, meta)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await writeAuditLog(req, {
    actorId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'USER',
    entityId: user.id,
  })

  return { user: publicUser(user), session }
}

export async function logout(token: string | undefined) {
  if (!token) return
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownerProfile: true,
      tenantProfile: true,
      notificationPreference: true,
      _count: { select: { favorites: true, notifications: { where: { isRead: false } } } },
    },
  })
  if (!user) throw new UnauthorizedError('Account not found', 'ACCOUNT_NOT_FOUND')

  return {
    ...publicUser(user),
    ownerProfile: user.ownerProfile
      ? {
          businessName: user.ownerProfile.businessName,
          description: user.ownerProfile.description,
          identityVerificationStatus: user.ownerProfile.identityVerificationStatus,
          verifiedAt: user.ownerProfile.verifiedAt?.toISOString() ?? null,
        }
      : null,
    tenantProfile: user.tenantProfile
      ? {
          occupation: user.tenantProfile.occupation,
          institutionName: user.tenantProfile.institutionName,
          emergencyContactName: user.tenantProfile.emergencyContactName,
          emergencyContactPhone: user.tenantProfile.emergencyContactPhone,
        }
      : null,
    notificationPreference: user.notificationPreference,
    unreadNotificationCount: user._count.notifications,
    favoriteCount: user._count.favorites,
  }
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  const genericMessage =
    'If an account exists for that email, a password reset link has been sent.'

  if (!user || user.deletedAt) return { message: genericMessage }

  const token = generateToken(32)
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: addMinutes(new Date(), env.PASSWORD_RESET_TTL_MINUTES),
      },
    }),
  ])

  await sendPasswordResetEmail(user.email, token).catch((error) =>
    logger.warn({ error }, 'password reset email could not be sent'),
  )
  return { message: genericMessage }
}

export async function resetPassword(input: ResetPasswordInput, req: Request) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { user: true },
  })
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new BadRequestError('This reset link is invalid or has expired', 'INVALID_RESET_TOKEN')
  }

  const passwordHash = await hashPassword(input.password)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  await writeAuditLog(req, {
    actorId: record.userId,
    action: 'AUTH_PASSWORD_RESET',
    entityType: 'USER',
    entityId: record.userId,
  })

  return { message: 'Password has been reset. Please sign in with your new password.' }
}

export async function verifyEmail(token: string, req: Request) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new BadRequestError('This verification link is invalid or has expired', 'INVALID_VERIFICATION_TOKEN')
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])

  await writeAuditLog(req, {
    actorId: record.userId,
    action: 'AUTH_EMAIL_VERIFIED',
    entityType: 'USER',
    entityId: record.userId,
  })

  return { message: 'Email verified successfully.' }
}

export async function resendVerification(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new UnauthorizedError('Account not found')
  if (user.emailVerifiedAt) throw new BadRequestError('Email is already verified', 'EMAIL_ALREADY_VERIFIED')

  await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } })
  await issueVerificationToken(user.id, user.email)
  return { message: 'A new verification link has been sent.' }
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  sessionId: string | undefined,
  req: Request,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new UnauthorizedError('Account not found')

  const matches = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!matches) throw new BadRequestError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD')

  const passwordHash = await hashPassword(input.newPassword)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(sessionId ? { id: { not: sessionId } } : {}) },
      data: { revokedAt: new Date() },
    }),
  ])

  await writeAuditLog(req, {
    action: 'AUTH_PASSWORD_CHANGED',
    entityType: 'USER',
    entityId: userId,
  })

  return { message: 'Password updated successfully.' }
}
