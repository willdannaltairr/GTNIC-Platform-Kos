import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

/**
 * Jembatan antara Express dan `Request`/`Response` Web standar.
 *
 * Seluruh 115 rute di `api/routes.ts` sudah menerima `Request` Web dan
 * mengembalikan `Response` Web — bentuk itu dipilih karena Edge Function
 * memakainya. Daripada menulis ulang 1.500 baris rute, Express cukup menyiapkan
 * objek yang bentuknya sama, lalu menuliskan jawabannya kembali.
 *
 * Body diambil dari `req.body` berupa Buffer (dipasang `express.raw` di
 * `index.ts`), bukan dibaca ulang dari stream: stream Express sudah habis
 * sebelum handler sempat membacanya.
 */

/** Header hop-by-hop dan header yang dihitung ulang oleh Node tidak diteruskan. */
const HEADER_DILEWATI = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'accept-encoding',
])

/** Susun `Request` Web dari permintaan Express. */
export const keWebRequest = (req: ExpressRequest): Request => {
  const alamat = `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`
  const headers = new Headers()

  for (const [nama, nilai] of Object.entries(req.headers)) {
    if (!nilai || HEADER_DILEWATI.has(nama)) continue
    if (Array.isArray(nilai)) {
      for (const satu of nilai) headers.append(nama, satu)
    } else {
      headers.set(nama, nilai)
    }
  }

  const metode = req.method.toUpperCase()
  const bolehBerbadan = metode !== 'GET' && metode !== 'HEAD'

  // `Buffer` adalah turunan `Uint8Array`, jadi bisa dipakai langsung sebagai body.
  const badan = bolehBerbadan && Buffer.isBuffer(req.body) && req.body.length > 0
    ? new Uint8Array(req.body)
    : undefined

  return new Request(alamat, { method: metode, headers, body: badan })
}

/**
 * Tulis `Response` Web ke objek jawaban Express.
 *
 * `Set-Cookie` ditangani terpisah: Express menulisnya sebagai larik, sedangkan
 * `headers.forEach` menggabungkan semuanya menjadi satu baris — dan cookie
 * kedua yang digabung dengan koma hilang tanpa pesan apa pun.
 */
export const kirimWebResponse = async (
  res: ExpressResponse,
  web: Response,
): Promise<void> => {
  res.status(web.status)

  web.headers.forEach((nilai, nama) => {
    if (nama.toLowerCase() === 'set-cookie') return
    res.setHeader(nama, nilai)
  })

  const cookies = typeof web.headers.getSetCookie === 'function'
    ? web.headers.getSetCookie()
    : []
  if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)

  if (web.status === 204 || web.status === 304) {
    res.end()
    return
  }

  const isi = Buffer.from(await web.arrayBuffer())
  res.end(isi)
}
