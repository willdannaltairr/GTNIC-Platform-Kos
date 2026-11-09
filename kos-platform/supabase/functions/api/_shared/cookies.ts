/**
 * Cookie sesi.
 *
 * Sesi tetap dikirim lewat cookie HttpOnly, sama seperti backend Express, dan
 * itu disengaja: seluruh halaman frontend memanggil API dengan
 * `credentials: 'include'` dan tidak menyimpan token ke mana pun. Token yang
 * bisa dibaca JavaScript adalah token yang bisa dicuri satu baris skrip yang
 * kebetulan ikut terpasang.
 *
 * Isi cookie di sini adalah token Supabase Auth, bukan token terbitan sendiri:
 * yang menandatangani dan mencabutnya adalah Supabase, bukan kode ini.
 */

export const COOKIE_ACCESS = 'access_token'
export const COOKIE_REFRESH = 'refresh_token'

/**
 * Masa berlaku cookie, selaras dengan token yang dibawanya.
 *
 * Access token Supabase berumur satu jam, refresh token tidak kedaluwarsa
 * selama terus dipakai. Cookie refresh dibuat 30 hari supaya sesi yang tidak
 * dipakai berakhir sendiri, bukan menggantung selamanya.
 */
export const UMUR_ACCESS = 60 * 60
export const UMUR_REFRESH = 30 * 24 * 60 * 60

/** Baca satu cookie dari header, tanpa pustaka tambahan. */
export const bacaCookie = (req: Request, nama: string): string | null => {
  const header = req.headers.get('cookie')
  if (!header) return null

  for (const bagian of header.split(';')) {
    const pisah = bagian.indexOf('=')
    if (pisah === -1) continue

    if (bagian.slice(0, pisah).trim() === nama) {
      return decodeURIComponent(bagian.slice(pisah + 1).trim())
    }
  }

  return null
}

/**
 * Susun satu header Set-Cookie.
 *
 * `Secure` mengikuti asal permintaan, bukan selalu menyala: frontend
 * pengembangan dilayani lewat http://localhost, dan cookie Secure ditolak di
 * sana oleh sebagian peramban. Di produksi, yang selalu lewat https, tandanya
 * menyala sendiri sehingga cookie tidak pernah ikut terkirim lewat koneksi
 * polos.
 *
 * `SameSite=Lax` cukup karena permintaannya sesama asal: frontend memanggil
 * API lewat jalur yang diteruskan dari domainnya sendiri.
 */
const susun = (req: Request, nama: string, nilai: string, umurDetik: number): string => {
  const secure = (req.headers.get('origin') ?? '').startsWith('https://') || Deno.env.get('ENVIRONMENT') === 'production'

  return [
    `${nama}=${encodeURIComponent(nilai)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${umurDetik}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

/** Susun daftar cookie sesi, siap dipasang lewat `jsonOk`. */
export const cookieSesi = (req: Request, token: { accessToken: string; refreshToken: string }): string[] => [
  susun(req, COOKIE_ACCESS, token.accessToken, UMUR_ACCESS),
  susun(req, COOKIE_REFRESH, token.refreshToken, UMUR_REFRESH),
]

/**
 * Daftar cookie untuk menghapus kedua sesi.
 *
 * `Max-Age=0` dipakai, bukan hanya mengosongkan nilainya: cookie yang kosong
 * tetap terkirim di setiap permintaan berikutnya, sedangkan yang berumur nol
 * langsung dibuang peramban.
 */
export const cookieHapusSesi = (req: Request): string[] => [
  susun(req, COOKIE_ACCESS, '', 0),
  susun(req, COOKIE_REFRESH, '', 0),
]
