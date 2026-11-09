/**
 * Bentuk jawaban HTTP yang sama dengan backend Express.
 *
 * Kesamaan ini bukan kerapian, melainkan syarat: seluruh halaman frontend
 * membaca `data`, `meta`, dan `errors` dengan nama yang sama, dan alamat
 * `/api/v1` beserta bentuk amplopnya dipertahankan supaya memindahkan backend
 * tidak berarti menulis ulang empat belas berkas klien di frontend.
 */

export class HttpError extends Error {
  readonly statusCode: number
  /**
   * Kode galat dari penyedia, bila ada, mis. `email_exists` dari Supabase Auth.
   *
   * Dipakai untuk mengambil keputusan berdasarkan kode, bukan dengan mencocokkan
   * kalimat pesannya: pesan penyedia bisa berubah atau diterjemahkan kapan saja,
   * dan aturan yang bergantung padanya akan diam-diam berhenti bekerja.
   */
  readonly code: string | null

  constructor(statusCode: number, message: string, code: string | null = null) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
  }
}

/**
 * Origin yang boleh memanggil API.
 *
 * Daftarnya dari `FRONTEND_URL` yang dipisah koma, sama seperti backend lama.
 * Bila tidak diisi, hanya alamat pengembangan yang diizinkan: membiarkan
 * semuanya terbuka berarti setiap situs bisa memakai sesi pengunjung yang
 * sedang masuk lewat permintaan lintas-origin.
 */
const allowedOrigins = (): string[] =>
  (Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

/**
 * Header CORS untuk satu permintaan.
 *
 * `credentials: true` di klien hanya dihormati bila originnya disebut persis,
 * bukan `*`. Karena itu origin yang tidak dikenal tidak diberi header sama
 * sekali, dan peramban yang menolaknya.
 */
export const corsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get('origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }

  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Jawaban sukses, dengan amplop yang sama seperti backend Express.
 *
 * Cookie dikirim sebagai daftar, bukan satu nilai yang digabung: peramban
 * memisahkan header `Set-Cookie`, dan menggabungkan dua cookie dengan koma
 * membuat yang kedua hilang tanpa pesan apa pun.
 */
export const jsonOk = (
  req: Request,
  body: Record<string, unknown>,
  status = 200,
  cookies: string[] = [],
): Response =>
  new Response(JSON.stringify({ success: true, ...body }), {
    status,
    headers: susunHeader(req, cookies),
  })

/**
 * Susun header jawaban.
 *
 * Bentuk daftar pasangan dipakai, bukan objek atau `Headers`, karena hanya
 * bentuk itu yang mengizinkan `Set-Cookie` muncul lebih dari sekali. `Headers`
 * sendiri menolak nama itu sama sekali di sebagian runtime Deno.
 */
const susunHeader = (req: Request, cookies: string[] = []): [string, string][] => [
  ['Content-Type', 'application/json; charset=utf-8'],
  ...Object.entries(corsHeaders(req)),
  ...cookies.map((cookie): [string, string] => ['Set-Cookie', cookie]),
]

/**
 * Ubah galat apa pun menjadi jawaban, tanpa pernah membocorkan isi server.
 *
 * - `HttpError` dan galat 4xx lain: pesannya memang ditujukan ke pengguna.
 * - `ZodError`: 400 dengan daftar field yang gagal, sama seperti backend lama.
 * - Sisanya: 500 dengan pesan generik; detailnya hanya masuk log.
 */
export const jsonError = (req: Request, error: unknown): Response => {
  const headers: [string, string][] = susunHeader(req)
  // `susunHeader` mengembalikan `Content-Type` lebih dulu; pada galat isinya
  // tetap JSON, jadi tidak ada yang perlu diganti.

  // `ZodError` dikenali dari bentuknya, bukan dari `instanceof`: modul zod
  // dimuat terpisah oleh bundler, dan memeriksa kelasnya bisa gagal walau
  // objeknya jelas berasal dari sana.
  const mungkinZod = error as { issues?: { path: (string | number)[]; message: string }[] }
  if (Array.isArray(mungkinZod?.issues)) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Validasi gagal',
        errors: mungkinZod.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }),
      { status: 400, headers },
    )
  }

  const status = (error as { statusCode?: number }).statusCode ?? 500
  const isOperational = error instanceof HttpError || status < 500

  if (!isOperational) {
    console.error('[api:error]', error)
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: isOperational ? (error as Error).message : 'Terjadi kesalahan pada server',
      errors: [],
    }),
    { status, headers },
  )
}

/** Baca body JSON; badan kosong dianggap objek kosong, bukan galat. */
export const readJson = async (req: Request): Promise<Record<string, unknown>> => {
  const teks = await req.text()
  if (!teks.trim()) return {}

  try {
    const nilai = JSON.parse(teks)
    return nilai && typeof nilai === 'object' ? (nilai as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, 'Isi permintaan bukan JSON yang sah')
  }
}
