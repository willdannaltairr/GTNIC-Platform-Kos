/**
 * Alamat dasar API, dibedakan menurut sisi tempat kodenya berjalan.
 *
 * Di PERAMBAN, permintaannya harus relatif ke situs sendiri (`''`), bukan ke
 * alamat server API. Cookie sesi ber-`SameSite=Lax` tidak ikut terkirim pada
 * permintaan lintas situs, sehingga memanggil server langsung membuat
 * pengunjung tampak selalu belum masuk walaupun loginnya berhasil. Permintaan
 * relatif diteruskan ke sana oleh `next.config.ts`, jadi seluruhnya sesama
 * asal dan cookienya first-party.
 *
 * Di SERVER (komponen server, dan prerender saat build), `fetch` bawaan Node
 * MENOLAK alamat relatif. Karena itu sisi server memakai alamat server API
 * langsung, yang sekaligus membuat halaman itu bisa dirender saat build tanpa
 * menunggu permintaan masuk lebih dulu.
 *
 * Nilainya bisa ditimpa lewat `API_FUNGSI_URL` supaya backend yang berjalan di
 * mesin atau host lain bisa dipakai tanpa menyunting berkas ini.
 * `next.config.ts` mengimpor konstanta yang sama, jadi penerusan di sana dan
 * pemanggilan langsung di sini selalu menunjuk ke server yang sama.
 */

/** Alamat server API Express yang melayani seluruh endpoint. */
export const ALAMAT_FUNGSI: string =
  process.env.API_FUNGSI_URL ?? 'http://localhost:4000'

/**
 * Alamat dasar untuk `fetch`.
 *
 * Bentuknya sengaja satu ekspresi dengan `typeof window` di depan, bukan
 * variabel yang dihitung lewat `if`: pada berkas yang dikirim ke peramban,
 * cabang `process.env` tidak pernah dievaluasi karena kondisinya sudah pasti
 * salah, sehingga pembaca di sisi klien tetap aman walau `process` tidak ada.
 */
export const API_BASE: string = typeof window === 'undefined' ? ALAMAT_FUNGSI : ''
