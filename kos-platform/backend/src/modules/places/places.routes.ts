import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler'
import { placesController } from './places.controller'

const router = Router()

// Keduanya endpoint publik dan hanya membaca data acuan, tidak ada jalur tulis
// di modul ini, karena isinya diisi lewat seed, bukan oleh pengguna aplikasi.
//
// Pembatas lajunya TIDAK dipasang lagi di sini: `apiLimiter` sudah dipasang
// untuk seluruh prefix /api/v1 di src/index.ts. Memasangnya dua kali membuat
// satu permintaan dihitung dua kali terhadap batas yang sama, sehingga kuota
// efektif endpoint ini jadi separuh dari endpoint lain tanpa alasan.
router.get('/campuses', asyncHandler(placesController.campuses))
router.get('/regions', asyncHandler(placesController.regions))
router.get('/facilities', asyncHandler(placesController.facilities))

export default router
