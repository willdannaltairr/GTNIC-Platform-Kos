import { corsHeaders, jsonError, jsonOk } from './_shared/http.ts'
import { router } from './routes.ts'

/**
 * Satu Edge Function untuk seluruh API.
 *
 * Fungsi tunggal, bukan satu fungsi per modul, dengan dua alasan. Pertama,
 * rutenya jadi bisa dipindah apa adanya dari backend Express: satu tempat
 * memegang seluruh daftar alamat, jadi tidak ada jalur yang tercecer di
 * belasan tempat. Kedua, satu fungsi berarti satu kali pemuatan modul dan satu
 * kumpulan koneksi database untuk semua permintaan, bukan satu per modul.
 *
 * Alamat yang dilayani mempertahankan bentuk lamanya, `/api/v1/...`, sehingga
 * klien di frontend tidak perlu tahu bahwa backendnya berpindah. Segmen
 * `/functions/v1/api` yang ditambahkan platform dipotong di sini.
 */

/**
 * Normalkan jalur permintaan menjadi jalur API.
 *
 * Tiga bentuk datang ke sini, dan ketiganya harus berakhir sama:
 *
 *   1. `/functions/v1/api/api/v1/auth/login` , bentuk penuh saat fungsi
 *      dipanggil langsung. Yang dicari adalah `/api/v1`, lalu dipotong dari
 *      situ.
 *   2. `/api/api/v1/auth/login` , bentuk yang benar-benar diterima fungsi di
 *      produksi: platform sudah memotong `/functions/v1` sebelum meneruskan,
 *      sehingga nama fungsinya jadi segmen pertama yang tersisa.
 *   3. `/api/health` , pemanggilan tanpa awalan `/api/v1` sama sekali.
 *
 * Pencarian `/api/v1` dipakai lebih dulu karena satu-satunya penanda yang
 * tidak mungkin tertukar dengan nama fungsi: alamat API selalu memuatnya,
 * sedangkan nama fungsinya bisa apa saja.
 */
const jalurApi = (pathname: string): string => {
  const tanda = pathname.indexOf('/api/v1')
  if (tanda !== -1) return pathname.slice(tanda + '/api/v1'.length) || '/'

  // Tanpa `/api/v1`: buang awalan milik platform bila ada, lalu buang nama
  // fungsinya, sehingga `/api/health` terbaca sebagai `/health`.
  const tanpaFungsi = pathname.replace(/^\/functions\/v1\/[^/]+/, '')
  if (tanpaFungsi !== pathname) return tanpaFungsi || '/'

  return pathname.replace(/^\/api(?=\/|$)/, '') || '/'
}

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url)
  const path = jalurApi(url.pathname)

  // Pemeriksaan awal lintas asal. Dijawab sebelum autentikasi karena
  // peramban mengirimnya tanpa kredensial, dan permintaan yang ditolak di sini
  // tidak pernah sampai ke penangan rutenya.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  try {
    if (path === '/health') {
      return jsonOk(req, { message: 'API kos-platform siap', time: new Date().toISOString() })
    }

    const jawaban = await router.handle({ req, path, url, params: {} })

    if (jawaban) return jawaban

    return jsonError(req, Object.assign(new Error(`Alamat ${path} tidak ada`), { statusCode: 404 }))
  } catch (error) {
    return jsonError(req, error)
  }
})
