import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes'
import dashboardRoutes from '../modules/dashboard/dashboard.routes'
import favoritesRoutes from '../modules/favorites/favorites.routes'
import notificationsRoutes from '../modules/notifications/notifications.routes'
import placesRoutes from '../modules/places/places.routes'
import propertiesRoutes from '../modules/properties/properties.routes'
import roomsRoutes from '../modules/rooms/rooms.routes'
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
apiRouter.use('/dashboard', dashboardRoutes)
apiRouter.use('/favorites', favoritesRoutes)
apiRouter.use('/notifications', notificationsRoutes)
apiRouter.use('/properties', propertiesRoutes)
apiRouter.use('/rooms', roomsRoutes)
apiRouter.use('/places', placesRoutes)

export default apiRouter
