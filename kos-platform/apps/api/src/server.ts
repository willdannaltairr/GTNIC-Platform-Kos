import { createApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { prisma } from './config/prisma'
import { ensureStorageDirectories } from './utils/storage'

async function main() {
  ensureStorageDirectories()
  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Nestari API listening')
  })

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down')
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error) => {
  logger.error({ error }, 'failed to start API')
  process.exit(1)
})
