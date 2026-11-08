import { env } from '../../config/env'

/**
 * Pengiriman email untuk alur autentikasi.
 *
 * Dipisahkan dari service supaya kegagalan pengiriman tidak pernah tercampur
 * dengan kegagalan database: dua hal itu punya sebab dan penanganan yang
 * berbeda, dan menyatukannya membuat pesan galat menuduh subsistem yang salah.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Alamat pengirim.
 *
 * Domain `.test` tidak pernah sampai ke internet, jadi bila kunci Resend salah
 * alamat, kegagalannya terlihat jelas di log alih-alih diam-diam terkirim dari
 * domain orang lain.
 */
const FROM_ADDRESS = 'KosPlatform <noreply@kosplatform.test>'

/** Tautan atur ulang sandi yang dibuka pengunjung. */
export const buildResetUrl = (token: string): string =>
  `${env.FRONTEND_URL[0]}/reset-sandi?token=${encodeURIComponent(token)}`

const resetEmailHtml = (fullName: string, resetUrl: string): string => `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1e293b">
    <h1 style="font-size:20px;margin:0 0 12px">Atur ulang sandi KosPlatform</h1>
    <p>Halo ${fullName},</p>
    <p>
      Kami menerima permintaan atur ulang sandi untuk akun ini. Klik tautan di bawah
      untuk membuat sandi baru. Tautannya berlaku 60 menit dan hanya bisa dipakai sekali.
    </p>
    <p style="margin:24px 0">
      <a href="${resetUrl}" style="background:#172b4d;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">
        Buat sandi baru
      </a>
    </p>
    <p style="color:#64748b;font-size:14px">
      Kalau Anda tidak meminta ini, abaikan saja emailnya. Sandi Anda tidak berubah
      sampai tautan di atas dibuka.
    </p>
  </div>
`

/**
 * Kirim tautan atur ulang sandi.
 *
 * Tidak pernah melempar: permintaan atur ulang sandi sudah menyimpan tokennya,
 * dan pengunjung tidak boleh melihat kegagalan email sebagai kegagalan
 * permintaan, karena itu akan memberi tahu mereka bahwa emailnya terdaftar.
 *
 * Tanpa `RESEND_API_KEY` (keadaan pengembangan), tautannya ditulis ke log
 * server supaya alurnya tetap bisa dicoba tanpa penyedia email.
 */
export const sendPasswordResetEmail = async (input: {
  to: string
  fullName: string
  resetUrl: string
}): Promise<void> => {
  if (!env.RESEND_API_KEY) {
    console.info(`[auth] tautan atur ulang sandi untuk ${input.to}: ${input.resetUrl}`)
    return
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [input.to],
        subject: 'Atur ulang sandi KosPlatform',
        html: resetEmailHtml(input.fullName, input.resetUrl),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[auth] Resend menolak kirim email:', response.status, detail.slice(0, 300))
    }
  } catch (error) {
    console.error('[auth] gagal menghubungi Resend:', (error as Error).message)
  }
}
