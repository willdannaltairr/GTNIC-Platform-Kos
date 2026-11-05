import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes'
import usersRoutes from '../modules/users/users.routes'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API kos-platform siap',
    time: new Date().toISOString(),
  })
})

apiRouter.use('/auth', authRoutes)
apiRouter.use('/users', usersRoutes)

export default apiRouter
