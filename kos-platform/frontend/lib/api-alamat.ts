/**
 * Alamat dasar API, dibedakan menurut sisi tempat kodenya berjalan.
 *
 * Di PERAMBAN, permintaannya harus relatif ke situs sendiri (`''`), bukan ke
 * alamat fungsinya. Cookie sesi ber-`SameSite=Lax` tidak ikut terkirim pada
 * permintaan lintas situs, sehingga memanggil fungsinya langsung membuat
 * pengunjung tampak selalu belum masuk walaupun loginnya berhasil. Permintaan
 * relatif diteruskan ke sana oleh `next.config.ts`, jadi seluruhnya sesama
 * asal dan cookienya first-party.
 *
 * Di SERVER (komponen server, dan prerender saat build), `fetch` bawaan Node
 * MENOLAK alamat relatif. Sebelum ini seluruh halaman yang datanya diambil di
 * server gagal diam-diam: klien datanya mengembalikan null lewat `catch`, dan
 * halaman detail kos berakhir 404 padahal API-nya menjawab 200. Karena itu sisi
 * server memakai alamat fungsinya langsung, yang sekaligus membuat halaman itu
 * bisa dirender saat build tanpa menunggu permintaan masuk lebih dulu.
 *
 * Nilainya bisa ditimpa lewat `API_FUNGSI_URL` supaya proyek Supabase lain bisa
 * dipakai tanpa menyunting berkas ini. `next.config.ts` mengimpor konstanta
 * yang sama, jadi penerusan di sana dan pemanggilan langsung di sini selalu
 * menunjuk ke proyek yang sama.
 */

/** Alamat Edge Function yang melayani seluruh API. */
export const ALAMAT_FUNGSI: string =
  process.env.API_FUNGSI_URL ?? 'https://ftunxbdpiokslgrzcmvd.supabase.co/functions/v1/api'

/**
 * Alamat dasar untuk `fetch`.
 *
 * Bentuknya sengaja satu ekspresi dengan `typeof window` di depan, bukan
 * variabel yang dihitung lewat `if`: pada berkas yang dikirim ke peramban,
 * cabang `process.env` tidak pernah dievaluasi karena kondisinya sudah pasti
 * salah, sehingga pembaca di sisi klien tetap aman walau `process` tidak ada.
 */
export const API_BASE: string = typeof window === 'undefined' ? ALAMAT_FUNGSI : ''
