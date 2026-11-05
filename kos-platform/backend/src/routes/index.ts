import { Router } from 'express'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API kos-platform siap',
    time: new Date().toISOString(),
  })
})

export default apiRouter
