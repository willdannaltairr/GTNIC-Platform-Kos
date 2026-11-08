import { NextFunction, Request, Response, Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth'
import { HttpError } from '../../lib/httpError'
import { MAX_PHOTO_BYTES } from '../../lib/storage'
import { roomsController } from './rooms.controller'

const router = Router()

/**
 * Unggahan disimpan di memori, bukan di disk.
 *
 * Berkasnya langsung diteruskan ke Supabase Storage, jadi menuliskannya ke
 * disk lebih dulu hanya menambah satu salinan sementara yang harus dibersihkan
 *, termasuk ketika prosesnya gagal di tengah jalan. Batas 8 MB membuat
 * pemakaian memorinya terbatas dan sebanding dengan ukuran foto kamar.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
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
        const maxMb = Math.round(MAX_PHOTO_BYTES / 1024 / 1024)
        return next(new HttpError(413, `Ukuran foto terlalu besar, maksimal ${maxMb} MB`))
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new HttpError(400, 'Kirim satu berkas saja, pada field "photo"'))
      }
    }

    next(new HttpError(400, 'Berkas foto tidak bisa dibaca'))
  })
}

// Endpoint baca boleh diakses tanpa login; token yang ikut dikirim, misalnya
// dari dashboard pemilik, hanya memperluas isinya, tidak diwajibkan.
router.get('/', optionalAuthenticate, asyncHandler(roomsController.list))
router.get('/:id', optionalAuthenticate, asyncHandler(roomsController.detail))

// Endpoint tulis khusus pemilik properti dan admin. Pemeriksaan kepemilikan
// yang sebenarnya ada di service, karena hanya di sana id kamar sudah
// diterjemahkan menjadi id pemilik properti.
router.post('/', authenticate, authorize('OWNER', 'ADMIN'), asyncHandler(roomsController.create))
router.patch('/:id', authenticate, authorize('OWNER', 'ADMIN'), asyncHandler(roomsController.update))
router.delete(
  '/:id',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(roomsController.remove),
)

router.post(
  '/:id/photos',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  singlePhoto,
  asyncHandler(roomsController.addPhoto),
)
router.delete(
  '/:id/photos/:photoId',
  authenticate,
  authorize('OWNER', 'ADMIN'),
  asyncHandler(roomsController.removePhoto),
)

export default router
