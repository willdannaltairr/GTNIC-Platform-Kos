import { Router } from 'express'
import adminRoutes from '../modules/admin/admin.routes'
import authRoutes from '../modules/auth/auth.routes'
import bookingsRoutes from '../modules/bookings/bookings.routes'
import contractsRoutes from '../modules/contracts/contracts.routes'
import dashboardRoutes from '../modules/dashboard/dashboard.routes'
import favoritesRoutes from '../modules/favorites/favorites.routes'
import invoicesRoutes from '../modules/invoices/invoices.routes'
import maintenanceRoutes from '../modules/maintenance/maintenance.routes'
import notificationsRoutes from '../modules/notifications/notifications.routes'
import paymentsRoutes from '../modules/payments/payments.routes'
import ownerVerificationRoutes from '../modules/owner-verification/owner-verification.routes'
import placesRoutes from '../modules/places/places.routes'
import propertiesRoutes from '../modules/properties/properties.routes'
import roomsRoutes from '../modules/rooms/rooms.routes'
import usersRoutes from '../modules/users/users.routes'
import visitsRoutes from '../modules/visits/visits.routes'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API kos-platform siap',
    time: new Date().toISOString(),
  })
})

apiRouter.use('/auth', authRoutes)
apiRouter.use('/admin', adminRoutes)
apiRouter.use('/users', usersRoutes)
apiRouter.use('/dashboard', dashboardRoutes)
apiRouter.use('/favorites', favoritesRoutes)
apiRouter.use('/notifications', notificationsRoutes)
apiRouter.use('/visits', visitsRoutes)
apiRouter.use('/bookings', bookingsRoutes)
apiRouter.use('/contracts', contractsRoutes)
apiRouter.use('/invoices', invoicesRoutes)
apiRouter.use('/payments', paymentsRoutes)
apiRouter.use('/perbaikan', maintenanceRoutes)
apiRouter.use('/properties', propertiesRoutes)
apiRouter.use('/rooms', roomsRoutes)
apiRouter.use('/places', placesRoutes)
apiRouter.use('/owner-verification', ownerVerificationRoutes)

export default apiRouter
