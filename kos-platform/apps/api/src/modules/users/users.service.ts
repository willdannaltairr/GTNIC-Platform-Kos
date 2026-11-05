import type { Request } from 'express'
import type {
  NotificationPreferenceInput,
  UpdateOwnerProfileInput,
  UpdateProfileInput,
  UpdateTenantProfileInput,
} from '@nestari/shared'
import { prisma } from '../../config/prisma'
import { ForbiddenError, NotFoundError } from '../../utils/errors'
import { writeAuditLog } from '../../utils/audit'
import { removeStorageFile, storagePathForPublicUrl } from '../../utils/storage'

export async function updateProfile(userId: string, input: UpdateProfileInput, req: Request) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, phoneNumber: true, avatarUrl: true },
  })
  if (!current) throw new NotFoundError('Account not found')

  const data: UpdateProfileInput = {}
  if (input.fullName !== undefined) data.fullName = input.fullName
  if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneNumber: true,
      avatarUrl: true,
      role: true,
      accountStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  })

  if (input.avatarUrl !== undefined && current.avatarUrl && current.avatarUrl !== input.avatarUrl) {
    removeStorageFile(storagePathForPublicUrl(current.avatarUrl))
  }

  await writeAuditLog(req, {
    action: 'USER_PROFILE_UPDATED',
    entityType: 'USER',
    entityId: userId,
    oldValues: { fullName: current.fullName, phoneNumber: current.phoneNumber, avatarUrl: current.avatarUrl },
    newValues: {
      fullName: updated.fullName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: updated.avatarUrl,
    },
  })

  return updated
}

export async function updateAvatar(userId: string, avatarUrl: string, req: Request) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  })
  if (!current) throw new NotFoundError('Account not found')

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } })

  if (current.avatarUrl && current.avatarUrl !== avatarUrl) {
    removeStorageFile(storagePathForPublicUrl(current.avatarUrl))
  }

  await writeAuditLog(req, {
    action: 'USER_AVATAR_UPDATED',
    entityType: 'USER',
    entityId: userId,
    oldValues: { avatarUrl: current.avatarUrl },
    newValues: { avatarUrl },
  })

  return { avatarUrl }
}

export async function updateOwnerProfile(userId: string, input: UpdateOwnerProfileInput, req: Request) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, ownerProfile: true },
  })
  if (!user) throw new NotFoundError('Account not found')
  if (user.role !== 'OWNER') {
    throw new ForbiddenError('Only owner accounts have an owner profile')
  }

  const updated = await prisma.ownerProfile.upsert({
    where: { userId },
    create: {
      userId,
      businessName: input.businessName ?? null,
      description: input.description ?? null,
    },
    update: {
      ...(input.businessName !== undefined ? { businessName: input.businessName } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  })

  await writeAuditLog(req, {
    action: 'OWNER_PROFILE_UPDATED',
    entityType: 'OWNER_PROFILE',
    entityId: updated.id,
    oldValues: user.ownerProfile
      ? { businessName: user.ownerProfile.businessName, description: user.ownerProfile.description }
      : null,
    newValues: { businessName: updated.businessName, description: updated.description },
  })

  return {
    businessName: updated.businessName,
    description: updated.description,
    identityVerificationStatus: updated.identityVerificationStatus,
    verifiedAt: updated.verifiedAt,
  }
}

export async function updateTenantProfile(userId: string, input: UpdateTenantProfileInput, req: Request) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantProfile: true },
  })
  if (!user) throw new NotFoundError('Account not found')
  if (user.role !== 'TENANT') {
    throw new ForbiddenError('Only tenant accounts have a tenant profile')
  }

  const data = {
    ...(input.occupation !== undefined ? { occupation: input.occupation } : {}),
    ...(input.institutionName !== undefined ? { institutionName: input.institutionName } : {}),
    ...(input.emergencyContactName !== undefined
      ? { emergencyContactName: input.emergencyContactName }
      : {}),
    ...(input.emergencyContactPhone !== undefined
      ? { emergencyContactPhone: input.emergencyContactPhone }
      : {}),
  }

  const profile = await prisma.tenantProfile.upsert({
    where: { userId },
    create: {
      userId,
      occupation: input.occupation ?? null,
      institutionName: input.institutionName ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
    },
    update: data,
  })

  await writeAuditLog(req, {
    action: 'TENANT_PROFILE_UPDATED',
    entityType: 'TENANT_PROFILE',
    entityId: profile.id,
    oldValues: user.tenantProfile
      ? {
          occupation: user.tenantProfile.occupation,
          institutionName: user.tenantProfile.institutionName,
          emergencyContactName: user.tenantProfile.emergencyContactName,
          emergencyContactPhone: user.tenantProfile.emergencyContactPhone,
        }
      : null,
    newValues: {
      occupation: profile.occupation,
      institutionName: profile.institutionName,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
    },
  })

  return profile
}

export async function getNotificationPreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.notificationPreference.create({ data: { userId } })
}

export async function updateNotificationPreferences(
  userId: string,
  input: NotificationPreferenceInput,
  req: Request,
) {
  const previous = await getNotificationPreferences(userId)
  const updated = await prisma.notificationPreference.update({
    where: { userId },
    data: input,
  })

  await writeAuditLog(req, {
    action: 'NOTIFICATION_PREFERENCES_UPDATED',
    entityType: 'NOTIFICATION_PREFERENCE',
    entityId: updated.id,
    oldValues: {
      emailEnabled: previous.emailEnabled,
      pushEnabled: previous.pushEnabled,
      bookingNotifications: previous.bookingNotifications,
      paymentNotifications: previous.paymentNotifications,
      maintenanceNotifications: previous.maintenanceNotifications,
      marketingNotifications: previous.marketingNotifications,
    },
    newValues: {
      emailEnabled: updated.emailEnabled,
      pushEnabled: updated.pushEnabled,
      bookingNotifications: updated.bookingNotifications,
      paymentNotifications: updated.paymentNotifications,
      maintenanceNotifications: updated.maintenanceNotifications,
      marketingNotifications: updated.marketingNotifications,
    },
  })

  return updated
}

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: 'true' | 'false'; page: number; limit: number },
) {
  const where = {
    userId,
    ...(options.unreadOnly === 'true' ? { isRead: false } : {}),
  }

  const [items, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        relatedEntityType: true,
        relatedEntityId: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return { items, total, unreadCount }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) throw new NotFoundError('Notification not found')
  if (notification.isRead) return notification

  return prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true, readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  })
  return { updatedCount: result.count }
}
