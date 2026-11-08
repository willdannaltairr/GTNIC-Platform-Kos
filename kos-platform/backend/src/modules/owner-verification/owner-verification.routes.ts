import { NextFunction, Request, Response, Router } from 'express'
import multer from 'multer'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate, authorize } from '../../middleware/auth'
import { HttpError } from '../../lib/httpError'
import { MAX_DOCUMENT_BYTES } from '../../lib/storage'
import { ownerVerificationController } from './owner-verification.controller'

const router = Router()

/**
 * Unggahan disimpan di memori, bukan di disk.
 *
 * Berkasnya langsung diteruskan ke Supabase Storage, jadi menuliskannya ke
 * disk lebih dulu hanya menambah satu salinan sementara yang harus
 * dibersihkan, termasuk ketika prosesnya gagal di tengah jalan. Batas 8 MB
 * membuat pemakaian memorinya terbatas dan sebanding dengan ukuran foto
 * dokumen.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
})

/**
 * Bungkus multer supaya galatnya menjadi HttpError.
 *
 * Tanpa ini, berkas yang kebesaran keluar sebagai error 500 dengan pesan
 * generik, padahal penyebabnya jelas dan bisa diperbaiki pengunggahnya.
 */
const singleDocument = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('document')(req, res, (error: unknown) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const maxMb = Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)
        return next(new HttpError(413, `Ukuran dokumen terlalu besar, maksimal ${maxMb} MB`))
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new HttpError(400, 'Kirim satu berkas saja, pada field "document"'))
      }
    }

    next(new HttpError(400, 'Berkas dokumen tidak bisa dibaca'))
  })
}

/**
 * Seluruh rute di sini khusus pemilik kos.
 *
 * Admin tidak lewat sini: peninjauannya ada di `/admin/pemilik`, dengan
 * pemeriksaan peran yang sama tetapi alur yang berbeda.
 */
router.use(authenticate, authorize('OWNER'))

router.get('/', asyncHandler(ownerVerificationController.getMine))
router.post('/documents', singleDocument, asyncHandler(ownerVerificationController.uploadDocument))
router.delete('/documents/:id', asyncHandler(ownerVerificationController.removeDocument))
router.post('/submit', asyncHandler(ownerVerificationController.submit))

export default router
