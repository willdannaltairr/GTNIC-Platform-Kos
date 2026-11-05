import { PrismaClient } from '@prisma/client'
import { env, isDevelopment } from './env'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: env.DATABASE_URL } },
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
