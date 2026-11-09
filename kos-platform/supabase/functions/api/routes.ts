import { authenticate, authorize, optionalAuthenticate } from './_shared/auth.ts'
import { bacaCookie, COOKIE_ACCESS, COOKIE_REFRESH, cookieHapusSesi, cookieSesi } from './_shared/cookies.ts'
import { HttpError, jsonError, jsonOk, modePengembangan, readJson, tokenPengembangan } from './_shared/http.ts'
import {
  MAX_DOCUMENT_BYTES,
  MAX_MAINTENANCE_BYTES,
  MAX_PHOTO_BYTES,
  bacaBerkas,
  bacaBerkasDariFormulir,
  bacaFormulir,
} from './_shared/storage.ts'
import { buildVerifyUrl, sendEmailVerificationEmail } from './_shared/mailer.ts'
import { Router, type Ctx } from './_shared/router.ts'
import { idParam, kueriObjek } from './_shared/validasi.ts'
import { adminService } from './admin.service.ts'
import {
  listActivityQuerySchema,
  listAdminPropertiesQuerySchema,
  listAdminUsersQuerySchema,
  setUserStatusSchema,
  verifyPropertySchema,
} from './admin.validator.ts'
import { authService } from './auth.service.ts'
import { bookingsService } from './bookings.service.ts'
import {
  bookingIdParam,
  createBookingSchema,
  listBookingsQuerySchema,
  updateBookingStatusSchema,
} from './bookings.validator.ts'
import { contractsService } from './contracts.service.ts'
import {
  contractIdParam,
  createContractSchema,
  listContractsQuerySchema,
  updateContractStatusSchema,
} from './contracts.validator.ts'
import { conversationsService } from './conversations.service.ts'
import {
  kirimPesanSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  mulaiPercakapanSchema,
  percakapanIdParam,
} from './conversations.validator.ts'
import { dashboardService } from './dashboard.service.ts'
import { favoritesService } from './favorites.service.ts'
import { addFavoriteSchema, propertyIdParam } from './favorites.validator.ts'
import { invoicesService } from './invoices.service.ts'
import {
  cancelInvoiceSchema,
  createInvoiceSchema,
  invoiceIdParam,
  listInvoicesQuerySchema,
} from './invoices.validator.ts'
import { notificationsService } from './notifications.service.ts'
import { listNotificationsQuerySchema, notificationIdParam } from './notifications.validator.ts'
import { reviewsService } from './reviews.service.ts'
import {
  createReviewSchema,
  listReviewsQuerySchema,
  moderateReviewSchema,
  reviewIdParam,
  updateReviewSchema,
} from './reviews.validator.ts'
import { maintenanceService } from './maintenance.service.ts'
import {
  createMaintenanceSchema,
  listMaintenanceQuerySchema,
  maintenanceIdParam,
  maintenancePhotoIdParam,
  updateMaintenanceStatusSchema,
} from './maintenance.validator.ts'
import { ownerVerificationService } from './owner-verification.service.ts'
import {
  listOwnersQuerySchema,
  uploadDocumentSchema,
  verifyOwnerSchema,
} from './owner-verification.validator.ts'
import { paymentsService } from './payments.service.ts'
import {
  createPaymentSchema,
  listPaymentsQuerySchema,
  paymentIdParam,
  webhookSchema,
} from './payments.validator.ts'
import { placesService } from './places.service.ts'
import { listCampusesQuerySchema, listRegionsQuerySchema } from './places.validator.ts'
import { propertiesService } from './properties.service.ts'
import {
  createPropertySchema,
  listMyPropertiesQuerySchema,
  listPropertiesQuerySchema,
  setPublicationSchema,
  updatePropertySchema,
} from './properties.validator.ts'
import { roomsService } from './rooms.service.ts'
import {
  createRoomSchema,
  listRoomsQuerySchema,
  updateRoomSchema,
  uploadPhotoMetaSchema,
} from './rooms.validator.ts'
import { usersService } from './users.service.ts'
import { visitsService } from './visits.service.ts'
import {
  checklistSchema,
  createVisitSchema,
  listVisitsQuerySchema,
  toggleChecklistSchema,
  updateVisitSchema,
  visitIdParam,
  visitNoteSchema,
} from './visits.validator.ts'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validator.ts'
import { updateProfileSchema } from './users.validator.ts'

/**
 * Daftar endpoint, satu berkas untuk seluruh modul.
 *
 * Jalurnya sengaja tidak diubah satu pun sejak backend lama: empat belas berkas
 * klien di frontend memanggil alamat-alamat ini, dan mengubahnya berarti
 * menulis ulang seluruh lapisan data di sisi web tanpa manfaat apa pun.
 */
export const router = new Router()

// ─── Autentikasi ────────────────────────────────────────────────────────────

router.post('/auth/register', async ({ req }) => {
  const input = registerSchema.parse(await readJson(req))
  const hasil = await authService.register(input)

  return jsonOk(
    req,
    {
      message: 'Registrasi berhasil',
      data: {
        user: hasil.user,
        // Token mentah hanya untuk pengembangan, sama seperti alur lupa sandi,
        // supaya alurnya bisa dicoba tanpa penyedia email.
        ...(tokenPengembangan() ? { verifyToken: hasil.verifyToken } : {}),
      },
    },
    201,
  )
})

router.post('/auth/login', async ({ req }) => {
  const input = loginSchema.parse(await readJson(req))
  const hasil = await authService.login(input)

  // Token dikirim hanya lewat cookie HttpOnly, tidak dikembalikan di badan
  // jawaban agar tidak tergoda disimpan di penyimpanan peramban.
  return jsonOk(req, { message: 'Login berhasil', data: { user: hasil.user } }, 200, cookieSesi(req, hasil.token))
})

router.post('/auth/forgot-password', async ({ req }) => {
  const input = forgotPasswordSchema.parse(await readJson(req))
  const token = await authService.forgotPassword(input)

  // Jawabannya selalu sama, terdaftar atau tidak: kalau endpoint ini membalas
  // "email tidak ditemukan", siapa pun bisa memakainya untuk memeriksa email
  // mana yang punya akun di sini.
  return jsonOk(req, {
    message: 'Kalau email itu terdaftar, kami sudah mengirim tautan atur ulang sandi.',
    ...(tokenPengembangan() && token ? { data: { devToken: token } } : {}),
  })
})

router.post('/auth/reset-password', async ({ req }) => {
  const input = resetPasswordSchema.parse(await readJson(req))
  await authService.resetPassword(input.token, input.password)

  // Cookie di peramban yang sedang dipakai ikut dibersihkan supaya pengunjung
  // tidak ditinggal dalam keadaan seolah masih masuk, padahal semua sesinya
  // sudah diakhiri di sisi server.
  return jsonOk(
    req,
    { message: 'Sandi berhasil diperbarui, silakan masuk dengan sandi baru' },
    200,
    cookieHapusSesi(req),
  )
})

router.post('/auth/verify-email', async ({ req }) => {
  const input = verifyEmailSchema.parse(await readJson(req))
  await authService.verifyEmail(input.token)

  return jsonOk(req, { message: 'Email berhasil diverifikasi' })
})

router.post('/auth/resend-verification', async ({ req }) => {
  const user = await authenticate(req)
  const profil = await usersService.getProfile(user.userId)

  if (profil.email_verified_at) {
    throw new HttpError(400, 'Email akun ini sudah diverifikasi')
  }

  // Alamatnya diambil dari sesi, bukan dari isi permintaan: kalau alamatnya
  // boleh ditentukan pengirim, endpoint ini berubah menjadi alat mengirim email
  // ke sembarang orang atas nama platform.
  const token = await authService.createEmailVerificationToken(profil.id)

  await sendEmailVerificationEmail({
    to: profil.email,
    fullName: profil.full_name,
    verifyUrl: buildVerifyUrl(token),
  })

  return jsonOk(req, {
    message: 'Tautan verifikasi sudah dikirim ulang ke email Anda',
    ...(tokenPengembangan() ? { data: { devToken: token } } : {}),
  })
})

router.post('/auth/refresh', async ({ req }) => {
  const refreshToken = bacaCookie(req, COOKIE_REFRESH)

  if (!refreshToken) {
    throw new HttpError(401, 'Tidak ada sesi untuk diperpanjang')
  }

  const hasil = await authService.refresh(refreshToken)

  return jsonOk(
    req,
    { message: 'Sesi diperpanjang', data: { user: hasil.user } },
    200,
    cookieSesi(req, hasil.token),
  )
})

router.post('/auth/logout', async ({ req }) => {
  await authService.logout(bacaCookie(req, COOKIE_ACCESS))
  return jsonOk(req, { message: 'Logout berhasil' }, 200, cookieHapusSesi(req))
})

router.get('/auth/me', async ({ req }) => {
  const user = await authenticate(req)
  const profil = await usersService.getProfile(user.userId)

  return jsonOk(req, { message: 'Data pengguna', data: { user: profil } })
})

// ─── Profil pengguna ────────────────────────────────────────────────────────

router.patch('/users/me', async ({ req }) => {
  const user = await authenticate(req)
  const input = updateProfileSchema.parse(await readJson(req))
  const profil = await usersService.updateProfile(user.userId, input)

  return jsonOk(req, { message: 'Profil diperbarui', data: { user: profil } })
})

router.get('/users', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')

  const query = ctx.url.searchParams
  const hasil = await usersService.list({
    q: query.get('q') ?? undefined,
    role: query.get('role') ?? undefined,
    page: Number(query.get('page') ?? 1) || 1,
    limit: Math.min(Number(query.get('limit') ?? 20) || 20, 50),
  })

  return jsonOk(ctx.req, { message: 'Daftar pengguna', data: hasil.items, meta: hasil.meta })
})

// ─── Acuan peta lokasi ──────────────────────────────────────────────────────

/**
 * Kampus, daerah, dan fasilitas.
 *
 * Ketiganya publik dan hanya membaca data acuan yang diisi lewat seed. Tidak
 * ada jalur tulis di sini.
 */
router.get('/places/campuses', async (ctx: Ctx) => {
  const query = listCampusesQuerySchema.parse(Object.fromEntries(ctx.url.searchParams))
  const data = await placesService.listCampuses(
    query,
    query.nearLat !== undefined && query.nearLng !== undefined
      ? { lat: query.nearLat, lng: query.nearLng }
      : undefined,
  )

  return jsonOk(ctx.req, {
    message: 'Daftar kampus',
    data,
    meta: { total: data.length, radiusKm: query.radiusKm },
  })
})

router.get('/places/regions', async (ctx: Ctx) => {
  const query = listRegionsQuerySchema.parse(Object.fromEntries(ctx.url.searchParams))
  const data = await placesService.listRegions(query)

  return jsonOk(ctx.req, { message: 'Daftar daerah', data, meta: { total: data.length } })
})

router.get('/places/facilities', async (ctx: Ctx) => {
  // `category` hanya menerima dua nilai enum kolomnya. Nilai lain ditolak
  // dengan 400, bukan diam-diam diabaikan: permintaan yang salah bentuk harus
  // terlihat salah, bukan menghasilkan daftar lengkap tanpa penjelasan.
  const kategori = ctx.url.searchParams.get('category') ?? undefined
  if (kategori !== undefined && kategori !== 'PROPERTY' && kategori !== 'ROOM') {
    throw new HttpError(400, 'Kategori fasilitas harus PROPERTY atau ROOM')
  }

  const data = await placesService.listFacilities(kategori)

  return jsonOk(ctx.req, { message: 'Daftar fasilitas', data, meta: { total: data.length } })
})

// ─── Notifikasi ─────────────────────────────────────────────────────────────

router.get('/notifications', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listNotificationsQuerySchema.parse(Object.fromEntries(ctx.url.searchParams))
  const hasil = await notificationsService.list(user.userId, params)

  return jsonOk(ctx.req, { message: 'Daftar notifikasi', data: hasil.items, meta: hasil.meta })
})

// Dua aksi massal diletakkan sebelum rute berparameter supaya "read-all" tidak
// pernah terbaca sebagai sebuah id.
router.post('/notifications/read-all', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const hasil = await notificationsService.markAllRead(user.userId)

  return jsonOk(ctx.req, { message: 'Semua notifikasi ditandai sudah dibaca', data: hasil })
})

router.patch('/notifications/:id/read', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const hasil = await notificationsService.markRead(user.userId, notificationIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Notifikasi ditandai sudah dibaca', data: hasil })
})

router.delete('/notifications/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const hasil = await notificationsService.remove(user.userId, notificationIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Notifikasi dihapus', data: hasil })
})

// ─── Properti ───────────────────────────────────────────────────────────────

/**
 * Endpoint pengelolaan milik pemilik didaftarkan SEBELUM `/:slug`, karena
 * pencocokan rute mengikuti urutan pendaftaran: kalau `/:slug` lebih dulu,
 * permintaan ke `/mine` akan dibaca sebagai detail properti dengan slug "mine"
 * dan jawabannya 404 yang membingungkan, bukan daftar properti pemilik.
 *
 * Kepemilikan yang sebenarnya diperiksa di service, karena hanya di sana id
 * properti sudah diterjemahkan menjadi id pemiliknya.
 */
router.get('/properties/mine', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  // Admin melihat properti miliknya sendiri lewat endpoint ini, sama seperti
  // pemilik. Meninjau properti orang lain punya endpointnya sendiri di modul
  // admin, supaya batas kewenangannya terlihat dari rutenya.
  const query = listMyPropertiesQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await propertiesService.listMine(user.userId, query)

  return jsonOk(ctx.req, { message: 'Properti Anda', data: hasil.items, meta: hasil.meta })
})

router.get('/properties/mine/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const properti = await propertiesService.detailMine(
    user,
    idParam(ctx.params.id, 'ID properti'),
  )

  return jsonOk(ctx.req, { message: 'Detail properti Anda', data: properti })
})

router.post('/properties', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const input = createPropertySchema.parse(await readJson(ctx.req))
  const properti = await propertiesService.create(user, input)

  return jsonOk(
    ctx.req,
    { message: 'Properti berhasil ditambahkan sebagai draf', data: properti },
    201,
  )
})

router.patch('/properties/mine/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const input = updatePropertySchema.parse(await readJson(ctx.req))
  const properti = await propertiesService.update(user, idParam(ctx.params.id, 'ID properti'), input)

  return jsonOk(ctx.req, { message: 'Properti berhasil diperbarui', data: properti })
})

router.post('/properties/mine/:id/submit', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const properti = await propertiesService.submitForReview(
    user,
    idParam(ctx.params.id, 'ID properti'),
  )

  return jsonOk(ctx.req, { message: 'Properti diajukan untuk ditinjau admin', data: properti })
})

router.post('/properties/mine/:id/publication', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const input = setPublicationSchema.parse(await readJson(ctx.req))
  const properti = await propertiesService.setPublication(
    user,
    idParam(ctx.params.id, 'ID properti'),
    input.publicationStatus,
  )

  return jsonOk(ctx.req, {
    message:
      input.publicationStatus === 'PUBLISHED'
        ? 'Properti diterbitkan'
        : 'Properti ditarik dari daftar publik',
    data: properti,
  })
})

// Endpoint publik: hanya properti yang sudah terverifikasi dan dipublikasikan
// yang pernah keluar dari service ini.
router.get('/properties', async (ctx: Ctx) => {
  const query = listPropertiesQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await propertiesService.listPublic(query)

  return jsonOk(ctx.req, { message: 'Daftar properti', data: hasil.items, meta: hasil.meta })
})

router.get('/properties/:slug', async (ctx: Ctx) => {
  const properti = await propertiesService.detailPublic(ctx.params.slug)

  return jsonOk(ctx.req, { message: 'Detail properti', data: properti })
})

// ─── Kamar ──────────────────────────────────────────────────────────────────

// Endpoint baca boleh diakses tanpa login. Token yang ikut dikirim, misalnya
// dari dashboard pemilik, hanya memperluas isinya, tidak diwajibkan.
router.get('/rooms', async (ctx: Ctx) => {
  const query = listRoomsQuerySchema.parse(kueriObjek(ctx.url))
  const user = await optionalAuthenticate(ctx.req)
  const hasil = await roomsService.list(query, user)

  return jsonOk(ctx.req, { message: 'Daftar kamar', data: hasil.items, meta: hasil.meta })
})

router.get('/rooms/:id', async (ctx: Ctx) => {
  const user = await optionalAuthenticate(ctx.req)
  const kamar = await roomsService.detail(idParam(ctx.params.id, 'ID kamar'), user)

  return jsonOk(ctx.req, { message: 'Detail kamar', data: kamar })
})

// Endpoint tulis khusus pemilik properti dan admin.
router.post('/rooms', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const input = createRoomSchema.parse(await readJson(ctx.req))
  const kamar = await roomsService.create(user, input)

  return jsonOk(ctx.req, { message: 'Kamar berhasil ditambahkan', data: kamar }, 201)
})

router.patch('/rooms/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const input = updateRoomSchema.parse(await readJson(ctx.req))
  const kamar = await roomsService.update(user, idParam(ctx.params.id, 'ID kamar'), input)

  return jsonOk(ctx.req, { message: 'Kamar berhasil diperbarui', data: kamar })
})

router.delete('/rooms/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const hasil = await roomsService.remove(user, idParam(ctx.params.id, 'ID kamar'))

  return jsonOk(ctx.req, { message: 'Kamar berhasil dihapus', data: hasil })
})

router.post('/rooms/:id/photos', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  // Meta dibaca dari kueri, berkasnya dari isi multipart, sama seperti
  // pemisahan yang dipakai backend lama.
  const meta = uploadPhotoMetaSchema.parse(kueriObjek(ctx.url))
  const berkas = await bacaBerkas(ctx.req, 'photo', MAX_PHOTO_BYTES, 'foto')
  const foto = await roomsService.addPhoto(user, idParam(ctx.params.id, 'ID kamar'), berkas, meta)

  return jsonOk(ctx.req, { message: 'Foto kamar berhasil diunggah', data: foto }, 201)
})

router.delete('/rooms/:id/photos/:photoId', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const hasil = await roomsService.removePhoto(
    user,
    idParam(ctx.params.id, 'ID kamar'),
    idParam(ctx.params.photoId, 'ID foto'),
  )

  return jsonOk(ctx.req, { message: 'Foto kamar berhasil dihapus', data: hasil })
})

// ─── Dashboard ──────────────────────────────────────────────────────────────

// Kedua endpoint hanya membaca dan selalu menyaring dengan id pengguna dari
// token, jadi tidak ada pemeriksaan kepemilikan tambahan yang diperlukan.
router.get('/dashboard/tenant', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await dashboardService.tenant(user.userId)

  return jsonOk(ctx.req, { message: 'Dashboard penghuni', data })
})

router.get('/dashboard/owner', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER', 'ADMIN')

  const data = await dashboardService.owner(user.userId)

  return jsonOk(ctx.req, { message: 'Dashboard pemilik kos', data })
})

// ─── Favorit ────────────────────────────────────────────────────────────────

/**
 * Seluruh endpoint favorit menuntut sesi. Daftar favorit adalah data pribadi,
 * dan tamu tidak punya tempat menyimpannya.
 *
 * Id pengguna selalu diambil dari sesi, tidak pernah dari permintaan: menerima
 * id pengguna dari klien berarti siapa pun bisa membaca atau mengubah daftar
 * favorit orang lain.
 */
router.get('/favorites', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const hasil = await favoritesService.list(user.userId)

  return jsonOk(ctx.req, { message: 'Daftar favorit', data: hasil.items, meta: hasil.meta })
})

router.post('/favorites', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = addFavoriteSchema.parse(await readJson(ctx.req))
  const hasil = await favoritesService.add(user.userId, input.propertyId)

  return jsonOk(ctx.req, { message: 'Ditambahkan ke favorit', data: hasil }, 201)
})

router.delete('/favorites/:propertyId', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const hasil = await favoritesService.remove(user.userId, propertyIdParam(ctx.params.propertyId))

  return jsonOk(ctx.req, { message: 'Dihapus dari favorit', data: hasil })
})

// ─── Kunjungan ──────────────────────────────────────────────────────────────

// Kunjungan selalu milik seseorang, jadi tidak ada endpoint tamu di sini.
// Pemilik properti juga memakai rute yang sama untuk melihat jadwal kunjungan
// ke propertinya, dan penyaring perannya ada di service.
router.get('/visits', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listVisitsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await visitsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar kunjungan', data: hasil.items, meta: hasil.meta })
})

router.post('/visits', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createVisitSchema.parse(await readJson(ctx.req))
  const data = await visitsService.create(user, input)

  return jsonOk(ctx.req, { message: 'Kunjungan terjadwal', data }, 201)
})

router.get('/visits/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await visitsService.detail(user, visitIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail kunjungan', data })
})

router.patch('/visits/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = updateVisitSchema.parse(await readJson(ctx.req))
  const data = await visitsService.update(user, visitIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Kunjungan diperbarui', data })
})

router.delete('/visits/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await visitsService.remove(user, visitIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Jadwal kunjungan dihapus', data })
})

router.post('/visits/:id/checklist', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = checklistSchema.parse(await readJson(ctx.req))
  const data = await visitsService.addChecklist(user, visitIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Butir periksa tersimpan', data }, 201)
})

router.patch('/visits/:id/checklist/:itemId', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = toggleChecklistSchema.parse(await readJson(ctx.req))
  const data = await visitsService.toggleChecklist(
    user,
    visitIdParam(ctx.params.id),
    idParam(ctx.params.itemId, 'ID butir periksa'),
    input.checked,
    input.catatan,
  )

  return jsonOk(ctx.req, { message: 'Butir periksa diperbarui', data })
})

router.post('/visits/:id/notes', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = visitNoteSchema.parse(await readJson(ctx.req))
  const data = await visitsService.addNote(user, visitIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Catatan tersimpan', data }, 201)
})

// ─── Booking ────────────────────────────────────────────────────────────────

/**
 * Booking selalu melibatkan akun. Penghuni memakai rute ini untuk mengajukan
 * dan membatalkan, pemilik properti untuk memutuskan; siapa yang boleh apa
 * diperiksa di service, karena hanya di sana id pemilik properti tersedia.
 */
router.get('/bookings', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listBookingsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await bookingsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar booking', data: hasil.items, meta: hasil.meta })
})

router.post('/bookings', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createBookingSchema.parse(await readJson(ctx.req))
  const data = await bookingsService.create(user, input)

  return jsonOk(ctx.req, { message: 'Booking berhasil diajukan', data }, 201)
})

router.get('/bookings/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await bookingsService.detail(user, bookingIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail booking', data })
})

router.patch('/bookings/:id/status', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = updateBookingStatusSchema.parse(await readJson(ctx.req))
  const data = await bookingsService.updateStatus(user, bookingIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Status booking diperbarui', data })
})

// ─── Kontrak ────────────────────────────────────────────────────────────────

// Kontrak selalu melibatkan akun, dan siapa yang boleh apa diperiksa di
// service: hanya di sana id pemilik propertinya tersedia.
router.get('/contracts', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listContractsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await contractsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar kontrak', data: hasil.items, meta: hasil.meta })
})

/**
 * Pembuatan kontrak hanya untuk pemilik propertinya.
 *
 * Batasnya tidak diperiksa lewat peran saja karena admin juga perlu bisa
 * membuatkannya saat menengahi masalah, dan pemeriksaan yang sebenarnya adalah
 * kepemilikan atas bookingnya, bukan perannya.
 */
router.post('/contracts', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createContractSchema.parse(await readJson(ctx.req))
  const data = await contractsService.create(user, input)

  return jsonOk(ctx.req, { message: 'Kontrak dibuat', data }, 201)
})

router.get('/contracts/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await contractsService.detail(user, contractIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail kontrak', data })
})

router.patch('/contracts/:id/status', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = updateContractStatusSchema.parse(await readJson(ctx.req))
  const data = await contractsService.updateStatus(user, contractIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Status kontrak diperbarui', data })
})

// ─── Tagihan ────────────────────────────────────────────────────────────────

// Tagihan selalu melibatkan akun. Penghuni melihat yang ditagihkan kepadanya,
// pemilik melihat yang ia tagihkan; siapa yang boleh apa diperiksa di service,
// karena hanya di sana id pemilik dan penghuninya tersedia.
router.get('/invoices', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listInvoicesQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await invoicesService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar tagihan', data: hasil.items, meta: hasil.meta })
})

router.post('/invoices', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createInvoiceSchema.parse(await readJson(ctx.req))
  const data = await invoicesService.create(user, input)

  return jsonOk(ctx.req, { message: 'Tagihan dibuat sebagai draf', data }, 201)
})

router.get('/invoices/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await invoicesService.detail(user, invoiceIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail tagihan', data })
})

router.post('/invoices/:id/kirim', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await invoicesService.kirim(user, invoiceIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Tagihan dikirim ke penghuni', data })
})

router.post('/invoices/:id/batalkan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = cancelInvoiceSchema.parse(await readJson(ctx.req))
  const data = await invoicesService.batalkan(user, invoiceIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Tagihan dibatalkan', data })
})

// ─── Pembayaran ─────────────────────────────────────────────────────────────

/**
 * Notifikasi penyedia pembayaran.
 *
 * Tidak memakai sesi, dan itu disengaja: yang mengirim notifikasi ini server
 * penyedia, yang tidak punya sesi di sini. Keasliannya dibuktikan tanda tangan
 * pada isi notifikasinya, bukan cookie. Alamatnya juga tidak boleh bergantung
 * pada sesi: kalau butuh login, satu pun pembayaran tidak akan pernah tercatat
 * lunas.
 */
router.post('/payments/webhook', async (ctx: Ctx) => {
  const input = webhookSchema.parse(await readJson(ctx.req))
  const hasil = await paymentsService.webhook(input)

  return jsonOk(ctx.req, { message: 'Notifikasi diproses', data: hasil })
})

// Sisanya selalu melibatkan akun: penghuni membuat dan melihat pembayarannya,
// pemilik melihat pembayaran yang masuk ke tagihannya, admin melihat semuanya.
router.get('/payments/konfigurasi', async (ctx: Ctx) => {
  await authenticate(ctx.req)

  return jsonOk(ctx.req, { message: 'Konfigurasi pembayaran', data: paymentsService.konfigurasi() })
})

router.get('/payments', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listPaymentsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await paymentsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar pembayaran', data: hasil.items, meta: hasil.meta })
})

router.post('/payments', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createPaymentSchema.parse(await readJson(ctx.req))
  const data = await paymentsService.create(user, input)

  return jsonOk(
    ctx.req,
    {
      message: data.providerReady
        ? 'Pembayaran dibuat, lanjutkan ke halaman pembayaran'
        : 'Pembayaran dibuat, tautan pembayaran belum tersedia',
      data,
    },
    201,
  )
})

router.get('/payments/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await paymentsService.detail(user, paymentIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail pembayaran', data })
})

/**
 * Simulasi pembayaran berhasil, hanya di pengembangan.
 *
 * Rutenya tidak didaftarkan sama sekali di produksi, bukan sekadar menolak di
 * dalam handlernya: satu jalur yang bisa menandai uang masuk tanpa bukti tidak
 * boleh ada di sana dengan alasan apa pun.
 */
if (modePengembangan()) {
  router.post('/payments/:id/simulasi', async (ctx: Ctx) => {
    const user = await authenticate(ctx.req)
    const data = await paymentsService.simulasi(user, paymentIdParam(ctx.params.id))

    return jsonOk(ctx.req, { message: 'Pembayaran ditandai berhasil (simulasi pengembangan)', data })
  })
}

// ─── Perbaikan ──────────────────────────────────────────────────────────────

// Setiap rute di sini melibatkan akun: laporan hanya terlihat oleh penghuni
// pelapornya, pemilik propertinya, dan admin. Siapa yang boleh apa diperiksa
// di service, karena hanya di sana id pemilik propertinya tersedia.
router.get('/perbaikan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listMaintenanceQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await maintenanceService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar laporan perbaikan', data: hasil.items, meta: hasil.meta })
})

router.post('/perbaikan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createMaintenanceSchema.parse(await readJson(ctx.req))
  const data = await maintenanceService.create(user, input)

  return jsonOk(ctx.req, { message: 'Laporan perbaikan dikirim ke pemilik kos', data }, 201)
})

router.get('/perbaikan/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await maintenanceService.detail(user, maintenanceIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Detail laporan perbaikan', data })
})

router.patch('/perbaikan/:id/status', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = updateMaintenanceStatusSchema.parse(await readJson(ctx.req))
  const data = await maintenanceService.updateStatus(user, maintenanceIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Status perbaikan diperbarui', data })
})

router.post('/perbaikan/:id/photos', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const berkas = await bacaBerkas(ctx.req, 'photo', MAX_MAINTENANCE_BYTES, 'foto')
  const data = await maintenanceService.addPhoto(user, maintenanceIdParam(ctx.params.id), berkas)

  return jsonOk(ctx.req, { message: 'Foto laporan ditambahkan', data }, 201)
})

router.delete('/perbaikan/:id/photos/:photoId', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const data = await maintenanceService.removePhoto(
    user,
    maintenanceIdParam(ctx.params.id),
    maintenancePhotoIdParam(ctx.params.photoId),
  )

  return jsonOk(ctx.req, { message: 'Foto laporan dihapus', data })
})

// ─── Verifikasi pemilik ─────────────────────────────────────────────────────

/**
 * Seluruh rute di sini khusus pemilik kos.
 *
 * Admin tidak lewat sini: peninjauannya ada di `/admin/pemilik`, dengan
 * pemeriksaan peran yang sama tetapi alur yang berbeda.
 */
router.get('/owner-verification', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER')
  const data = await ownerVerificationService.getMine(user)

  return jsonOk(ctx.req, { message: 'Status verifikasi pemilik', data })
})

router.post('/owner-verification/documents', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER')

  // Isi formulir dibaca sekali untuk keduanya: satu permintaan multipart
  // membawa berkas dokumen sekaligus jenis dokumennya, dan isi permintaan
  // adalah aliran yang habis setelah dibaca pertama kali.
  const form = await bacaFormulir(ctx.req)
  const input = uploadDocumentSchema.parse({ documentType: form.get('documentType') })
  const berkas = await bacaBerkasDariFormulir(form, 'document', MAX_DOCUMENT_BYTES, 'dokumen')
  const data = await ownerVerificationService.uploadDocument(user, input, berkas)

  return jsonOk(ctx.req, { message: 'Dokumen tersimpan', data }, 201)
})

router.delete('/owner-verification/documents/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER')
  const data = await ownerVerificationService.removeDocument(
    user,
    idParam(ctx.params.id, 'ID dokumen'),
  )

  return jsonOk(ctx.req, { message: 'Dokumen dihapus', data })
})

router.post('/owner-verification/submit', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'OWNER')
  const data = await ownerVerificationService.submit(user)

  return jsonOk(ctx.req, {
    message: 'Pengajuan verifikasi terkirim, menunggu tinjauan admin',
    data,
  })
})

// ─── Admin ──────────────────────────────────────────────────────────────────

/**
 * Seluruh endpoint panel admin.
 *
 * Dua batas dipasang di setiap rute, bukan diwariskan dari satu tempat:
 * `authenticate` memastikan pemanggilnya punya sesi yang sah, dan
 * `authorize(user, 'ADMIN')` memastikan perannya admin. Perannya dibaca dari
 * database, jadi tidak ada satu pun endpoint di sini yang bisa dibuka dengan
 * mengirim peran dari klien.
 *
 * Batas kedua tetap ditulis di tiap rute meski seluruh blok ini memang untuk
 * admin, supaya rute yang ditambahkan nanti tidak ikut terbuka hanya karena
 * berada di blok yang sama.
 */
router.get('/admin/ringkasan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')

  return jsonOk(ctx.req, { message: 'Ringkasan platform', data: await adminService.ringkasan() })
})

router.get('/admin/properti', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const params = listAdminPropertiesQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await adminService.listProperties(params)

  return jsonOk(ctx.req, { message: 'Daftar properti', data: hasil.items, meta: hasil.meta })
})

router.post('/admin/properti/:id/verifikasi', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const input = verifyPropertySchema.parse(await readJson(ctx.req))
  const data = await adminService.verifyProperty(
    user,
    idParam(ctx.params.id, 'ID properti'),
    input,
  )

  return jsonOk(ctx.req, { message: 'Status verifikasi properti diperbarui', data })
})

router.get('/admin/pengguna', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const params = listAdminUsersQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await adminService.listUsers(params)

  return jsonOk(ctx.req, { message: 'Daftar pengguna', data: hasil.items, meta: hasil.meta })
})

router.patch('/admin/pengguna/:id/status', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const input = setUserStatusSchema.parse(await readJson(ctx.req))
  const data = await adminService.setUserStatus(user, idParam(ctx.params.id, 'ID pengguna'), input)

  return jsonOk(ctx.req, { message: 'Status akun diperbarui', data })
})

router.get('/admin/aktivitas', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const params = listActivityQuerySchema.parse(kueriObjek(ctx.url))

  return jsonOk(ctx.req, { message: 'Catatan aktivitas', data: await adminService.listActivity(params) })
})

/**
 * Verifikasi pemilik kos.
 *
 * Aturan kelengkapan dokumen (KTP dan swafoto wajib ada) tinggal di modul
 * owner-verification karena dipakai bersama oleh sisi pemilik dan sisi admin.
 * Menyalinnya ke sini berarti dua tempat yang harus diubah bersamaan setiap
 * kali syaratnya berubah.
 */
router.get('/admin/pemilik', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const params = listOwnersQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await ownerVerificationService.listOwners(params)

  return jsonOk(ctx.req, { message: 'Daftar pemilik', data: hasil.items, meta: hasil.meta })
})

router.get('/admin/pemilik/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const data = await ownerVerificationService.ownerDetail(idParam(ctx.params.id, 'ID pemilik'))

  return jsonOk(ctx.req, { message: 'Detail pemilik', data })
})

router.post('/admin/pemilik/:id/verifikasi', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const input = verifyOwnerSchema.parse(await readJson(ctx.req))
  const data = await ownerVerificationService.verifyOwner(
    user,
    idParam(ctx.params.id, 'ID pemilik'),
    input,
  )

  return jsonOk(ctx.req, {
    message:
      input.status === 'VERIFIED'
        ? 'Pemilik ditandai terverifikasi'
        : 'Pengajuan pemilik ditolak, alasannya tersimpan',
    data,
  })
})

// ─── Percakapan ─────────────────────────────────────────────────────────────

/**
 * Percakapan penghuni dengan pemilik kos.
 *
 * Seluruh rutenya menuntut akun, dan siapa yang boleh melihat atau mengirim
 * diperiksa di service: hanya di sana keanggotaan percakapannya diketahui.
 */
router.get('/percakapan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listConversationsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await conversationsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar percakapan', data: hasil.items, meta: hasil.meta })
})

/**
 * Mulai percakapan tentang satu properti, atau ambil yang sudah ada.
 *
 * Pendaftarannya sebelum `/:id` supaya "mulai" tidak pernah terbaca sebagai
 * sebuah id.
 */
router.post('/percakapan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = mulaiPercakapanSchema.parse(await readJson(ctx.req))
  const data = await conversationsService.mulai(user, input)

  return jsonOk(ctx.req, { message: 'Percakapan dibuka', data }, 201)
})

router.get('/percakapan/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const params = listMessagesQuerySchema.parse(kueriObjek(ctx.url))
  const data = await conversationsService.detail(user, percakapanIdParam(ctx.params.id), params)

  return jsonOk(ctx.req, { message: 'Percakapan', data })
})

router.post('/percakapan/:id/pesan', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = kirimPesanSchema.parse(await readJson(ctx.req))
  const data = await conversationsService.kirim(user, percakapanIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, { message: 'Pesan terkirim', data }, 201)
})

// ─── Ulasan ─────────────────────────────────────────────────────────────────

/**
 * Ulasan penghuni atas kos yang pernah ia sewa.
 *
 * Daftar dan detailnya boleh dibuka tanpa sesi: ulasan yang sudah tayang
 * memang untuk dibaca calon penghuni berikutnya. Yang membedakan apa yang
 * terlihat adalah perannya, dan itu diputuskan di service — halaman properti
 * hanya melihat yang sudah lolos tinjauan, penghuni melihat ulasannya sendiri
 * beserta catatan moderasinya, dan admin melihat antrean moderasi.
 */
router.get('/reviews', async (ctx: Ctx) => {
  const user = await optionalAuthenticate(ctx.req)
  const params = listReviewsQuerySchema.parse(kueriObjek(ctx.url))
  const hasil = await reviewsService.list(user, params)

  return jsonOk(ctx.req, { message: 'Daftar ulasan', data: hasil.items, meta: hasil.meta })
})

/**
 * Tulis ulasan dari kontrak yang sedang atau sudah dijalani.
 *
 * Rutenya menuntut sesi, dan peran penghuni diperiksa di service bersama
 * pemeriksaan kontraknya.
 */
router.post('/reviews', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = createReviewSchema.parse(await readJson(ctx.req))
  const data = await reviewsService.create(user, input)

  return jsonOk(
    ctx.req,
    { message: 'Ulasan terkirim dan menunggu tinjauan admin', data },
    201,
  )
})

router.get('/reviews/:id', async (ctx: Ctx) => {
  const user = await optionalAuthenticate(ctx.req)
  const data = await reviewsService.detail(user, reviewIdParam(ctx.params.id))

  return jsonOk(ctx.req, { message: 'Ulasan', data })
})

router.patch('/reviews/:id', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  const input = updateReviewSchema.parse(await readJson(ctx.req))
  const data = await reviewsService.update(user, reviewIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, {
    message: 'Ulasan diperbarui dan kembali menunggu tinjauan admin',
    data,
  })
})

/**
 * Keputusan moderasi ada di blok admin, bukan di blok ulasan, supaya batas
 * kewenangannya terlihat dari alamatnya. `authorize(user, 'ADMIN')` tetap
 * ditulis di rutenya sendiri, sama seperti seluruh rute /admin yang lain.
 */
router.post('/admin/ulasan/:id/moderasi', async (ctx: Ctx) => {
  const user = await authenticate(ctx.req)
  authorize(user, 'ADMIN')
  const input = moderateReviewSchema.parse(await readJson(ctx.req))
  const data = await reviewsService.moderate(user, reviewIdParam(ctx.params.id), input)

  return jsonOk(ctx.req, {
    message:
      input.status === 'APPROVED'
        ? 'Ulasan disetujui dan tayang di halaman kosnya'
        : input.status === 'REJECTED'
          ? 'Ulasan ditolak, alasannya tersimpan dan dikirim ke penulisnya'
          : 'Ulasan disembunyikan dari halaman kosnya',
    data,
  })
})

export { jsonError }
