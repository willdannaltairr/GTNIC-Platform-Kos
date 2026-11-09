import { Router } from 'express'
import { env } from '../../config/env'
import { asyncHandler } from '../../middleware/asyncHandler'
import { authenticate } from '../../middleware/auth'
import { paymentsController } from './payments.controller'

const router = Router()

/**
 * Notifikasi penyedia pembayaran.
 *
 * Didaftarkan SEBELUM `router.use(authenticate)`, dan itu disengaja: yang
 * mengirim notifikasi ini server penyedia, yang tidak punya sesi di sini.
 * Keasliannya dibuktikan tanda tangan pada isi notifikasinya, bukan cookie.
 *
 * Alamatnya juga tidak boleh bergantung pada sesi: kalau butuh login, satu
 * pun pembayaran tidak akan pernah tercatat lunas.
 */
router.post('/webhook', asyncHandler(paymentsController.webhook))

// Sisanya selalu melibatkan akun: penghuni membuat dan melihat pembayarannya,
// pemilik melihat pembayaran yang masuk ke tagihannya, admin melihat semuanya.
router.use(authenticate)

router.get('/konfigurasi', asyncHandler(paymentsController.konfigurasi))
router.get('/', asyncHandler(paymentsController.list))
router.post('/', asyncHandler(paymentsController.create))
router.get('/:id', asyncHandler(paymentsController.detail))

/**
 * Simulasi pembayaran berhasil, hanya di pengembangan.
 *
 * Rutenya tidak didaftarkan sama sekali di produksi, bukan sekadar menolak di
 * dalam handlernya: satu jalur yang bisa menandai uang masuk tanpa bukti tidak
 * boleh ada di sana dengan alasan apa pun.
 */
if (env.NODE_ENV !== 'production') {
  router.post('/:id/simulasi', asyncHandler(paymentsController.simulasi))
}

export default router
