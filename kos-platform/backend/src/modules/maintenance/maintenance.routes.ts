import { NextFunction, Request, Response, Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { HttpError } from '../../lib/httpError'
import { MAX_MAINTENANCE_BYTES } from '../../lib/storage'
import { maintenanceController } from './maintenance.controller'

const router = Router()

/**
 * Unggahan disimpan di memori, bukan di disk.
 *
 * Berkasnya langsung diteruskan ke Supabase Storage, jadi menuliskannya ke
 * disk lebih dulu hanya menambah satu salinan sementara yang harus
 * dibersihkan, termasuk ketika prosesnya gagal di tengah jalan. Batas 8 MB
 * membuat pemakaian memorinya terbatas dan sebanding dengan ukuran foto.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MAINTENANCE_BYTES, files: 1 },
})

/**
 * Bungkus multer supaya galatnya menjadi HttpError.
 *
 * Tanpa ini, berkas yang kebesaran keluar sebagai error 500 dengan pesan
 * generik, padahal penyebabnya jelas dan bisa diperbaiki pengunggahnya.
 */
const singlePhoto = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('photo')(req, res, (error: unknown) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round(MAX_MAINTENANCE_BYTES / 1024 / 1024)
        return next(new HttpError(413, `Ukuran foto terlalu besar, maksimal ${maxMb} MB`))
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new HttpError(400, 'Kirim satu berkas saja, pada field "photo"'))
      }
    }

    next(new HttpError(400, 'Berkas foto tidak bisa dibaca'))
  })
}

// Setiap rute di sini melibatkan akun: laporan hanya terlihat oleh penghuni
// pelapornya, pemilik propertinya, dan admin. Siapa yang boleh apa diperiksa
// di service, karena hanya di sana id pemilik propertinya tersedia.
router.use(authenticate)

router.get('/', asyncHandler(maintenanceController.list))
router.post('/', asyncHandler(maintenanceController.create))
router.get('/:id', asyncHandler(maintenanceController.detail))
router.patch('/:id/status', asyncHandler(maintenanceController.updateStatus))
router.post('/:id/photos', singlePhoto, asyncHandler(maintenanceController.addPhoto))
router.delete('/:id/photos/:photoId', asyncHandler(maintenanceController.removePhoto))

export default router
