import type { Prisma, PrismaClient } from '@prisma/client'
import type { Request } from 'express'
import { logger } from '../config/logger'
import { prisma } from '../config/prisma'

type AuditWriter = PrismaClient | Prisma.TransactionClient

export interface AuditEntry {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  oldValues?: Prisma.InputJsonValue | null
  newValues?: Prisma.InputJsonValue | null
  ipAddress?: string | null
  userAgent?: string | null
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? null
  return req.ip ?? null
}

export async function writeAuditLog(
  req: Request,
  entry: AuditEntry,
  db: AuditWriter = prisma,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? req.user?.id ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        oldValues: entry.oldValues ?? undefined,
        newValues: entry.newValues ?? undefined,
        ipAddress: entry.ipAddress ?? clientIp(req),
        userAgent: entry.userAgent ?? req.headers['user-agent'] ?? null,
      },
    })
  } catch (error) {
    logger.error({ error, action: entry.action }, 'failed to write audit log')
  }
}
