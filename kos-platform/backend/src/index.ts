import express from 'express'
import helmet from 'helmet'
import path from 'node:path'

import { env, envWajib } from './env.ts'
import { keWebRequest, kirimWebResponse } from './adaptor.ts'
import { router } from './api/routes.ts'
import { corsHeaders, jsonError, jsonOk } from './shared/http.ts'
import { STORAGE_BUCKET, privateFilePath, signedUrlValid, UPLOAD_ROOT } from './shared/storage.ts'

/**
 * Server API HuniKos.
 *
 * Bentuk alamatnya dipertahankan persis seperti sebelumnya, `/api/v1/...`,
 * supaya 14 berkas klien di frontend tidak perlu diubah selain alamat
 * tujuannya. Hal yang sama berlaku untuk amplop jawabannya.
 */

envWajib('JWT_SECRET')

const app = express()

app.disable('x-powered-by')

// Gambar disajikan dari domain ini dan dimuat oleh halaman di domain lain,
// jadi kebijakan bawaan Helmet yang mengunci resource ke asal yang sama
// dilonggarkan untuk berkas unggahan.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

/**
 * Body mentah untuk semua jenis isi.
 *
 * `express.json` tidak dipakai karena `Request.formData()` di adaptor butuh
 * byte multipart apa adanya, termasuk batasnya. Batas 8 MB mengikuti batas
 * satu berkas (lihat `storage.ts`); permintaan JSON jauh lebih kecil dari itu.
 */
app.use(express.raw({ type: () => true, limit: '10mb' }))

/** Foto kamar bersifat publik. Bucket privat tidak pernah disajikan dari sini. */
app.use(`/uploads/${STORAGE_BUCKET}`, express.static(path.join(UPLOAD_ROOT, STORAGE_BUCKET)))

/**
 * Berkas privat hanya bisa dibuka lewat tautan bertanda tangan.
 *
 * Tanda tangannya memuat bucket, path, dan waktu kedaluwarsa, sehingga
 * mengubah salah satunya membuat tautannya tidak sah. Tanpa pemeriksaan ini,
 * KTP pemilik dan foto kamar yang sedang dihuni bisa dibuka siapa saja yang
 * menebak alamatnya.
 */
app.get('/uploads/privat/:bucket/*', (req, res) => {
  const bucket = String(req.params.bucket)
  // Express 4 menaruh sisa jalur wildcard di `params[0]`.
  const jalur = String((req.params as Record<string, string>)['0'] ?? '')
  const exp = Number(req.query.exp)
  const sig = String(req.query.sig ?? '')

  if (!signedUrlValid(bucket, jalur, exp, sig)) {
    res.status(403).json({ success: false, message: 'Tautan berkas tidak berlaku', errors: [] })
    return
  }

  res.sendFile(privateFilePath(bucket, jalur), (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ success: false, message: 'Berkas tidak ditemukan', errors: [] })
    }
  })
})

/** Pemeriksaan lintas asal, dijawab sebelum autentikasi. */
app.options('/api/v1/*', (req, res) => {
  res.status(204)
  for (const [nama, nilai] of Object.entries(corsHeaders(keWebRequest(req)))) {
    res.setHeader(nama, nilai)
  }
  res.end()
})

const jalurApi = (originalUrl: string): string => {
  const tanpaAwalan = originalUrl.replace(/^\/api\/v1/, '')
  const tanpaKueri = tanpaAwalan.split('?')[0]
  return tanpaKueri || '/'
}

/** Satu pintu untuk seluruh rute: semuanya lewat router yang sama. */
const tanganiApi = async (req: express.Request, res: express.Response): Promise<void> => {
  const webReq = keWebRequest(req)
  const jalur = jalurApi(req.originalUrl)

  try {
    if (jalur === '/health') {
      await kirimWebResponse(
        res,
        jsonOk(webReq, { message: 'API kos-platform siap', time: new Date().toISOString() }),
      )
      return
    }

    const jawaban = await router.handle({
      req: webReq,
      path: jalur,
      url: new URL(webReq.url),
      params: {},
    })

    if (jawaban) {
      await kirimWebResponse(res, jawaban)
      return
    }

    await kirimWebResponse(
      res,
      jsonError(webReq, Object.assign(new Error(`Alamat ${jalur} tidak ada`), { statusCode: 404 })),
    )
  } catch (error) {
    await kirimWebResponse(res, jsonError(webReq, error))
  }
}

app.all('/api/v1/*', tanganiApi)

// Alamat tanpa awalan tetap dilayani, sama seperti fungsi lama yang menerima
// pemanggilan `.../api/health` juga.
app.all('/health', tanganiApi)

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Alamat ${req.originalUrl} tidak ada`, errors: [] })
})

const port = Number(env('PORT', '4000'))

app.listen(port, () => {
  console.log(`[api] HuniKos siap di http://localhost:${port}/api/v1 (midtrans ${env('MIDTRANS_IS_PRODUCTION') === 'true' ? 'PRODUCTION' : 'SANDBOX'})`)
})

export { app }
