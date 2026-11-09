import { authenticate, authorize, optionalAuthenticate } from './_shared/auth.ts'
import { bacaCookie, COOKIE_ACCESS, COOKIE_REFRESH, cookieHapusSesi, cookieSesi } from './_shared/cookies.ts'
import { HttpError, jsonError, jsonOk, readJson } from './_shared/http.ts'
import { buildVerifyUrl, sendEmailVerificationEmail } from './_shared/mailer.ts'
import { Router, type Ctx } from './_shared/router.ts'
import { MAX_PHOTO_BYTES, bacaBerkas } from './_shared/storage.ts'
import { idParam, kueriObjek } from './_shared/validasi.ts'
import { authService } from './auth.service.ts'
import { notificationsService } from './notifications.service.ts'
import { listNotificationsQuerySchema, notificationIdParam } from './notifications.validator.ts'
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
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validator.ts'
import { updateProfileSchema } from './users.validator.ts'

/**
 * Daftar endpoint, disusun berdampingan dengan backend Express yang digantikan.
 *
 * Jalurnya sengaja tidak diubah satu pun: empat belas berkas klien di frontend
 * memanggil alamat-alamat ini, dan mengubahnya berarti memindahkan backend
 * sekaligus menulis ulang seluruh lapisan data di sisi web.
 */
export const router = new Router()

/** Apakah token pengembangan boleh ikut dikirim di jawaban. */
const modePengembangan = (): boolean => Deno.env.get('ENVIRONMENT') !== 'production'

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
        ...(modePengembangan() ? { verifyToken: hasil.verifyToken } : {}),
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
    ...(modePengembangan() && token ? { data: { devToken: token } } : {}),
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
    ...(modePengembangan() ? { data: { devToken: token } } : {}),
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

export { jsonError }
