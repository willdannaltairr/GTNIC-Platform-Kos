/**
 * Pengiriman email untuk alur autentikasi.
 *
 * Perilaku pengembangannya disengaja: tanpa `RESEND_API_KEY`, tautannya
 * ditulis ke log fungsi alih-alih dikirim, sehingga alur verifikasi dan atur
 * ulang sandi tetap bisa dicoba tanpa penyedia email.
 *
 * Tidak pernah melempar. Permintaan yang memicunya sudah lebih dulu menyimpan
 * datanya di database, dan pengunjung tidak boleh melihat kegagalan pengiriman
 * email sebagai kegagalan permintaan. Untuk atur ulang sandi, membedakan
 * keduanya bahkan akan memberi tahu penebak email mana yang terdaftar.
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

/** Alamat halaman depan, untuk menyusun tautan yang dibuka pengunjung. */
const alamatDepan = (): string =>
  (Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0].trim()

/** Tautan atur ulang sandi yang dibuka pengunjung. */
export const buildResetUrl = (token: string): string =>
  `${alamatDepan()}/reset-sandi?token=${encodeURIComponent(token)}`

/** Tautan verifikasi email yang dibuka pengunjung. */
export const buildVerifyUrl = (token: string): string =>
  `${alamatDepan()}/verifikasi-email?token=${encodeURIComponent(token)}`

const kirimEmail = async (input: {
  to: string
  subject: string
  html: string
  /** Sebutan tautan di log pengembangan. */
  label: string
  tautan: string
}): Promise<void> => {
  const kunci = Deno.env.get('RESEND_API_KEY')

  if (!kunci) {
    console.info(`[auth] ${input.label} untuk ${input.to}: ${input.tautan}`)
    return
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kunci}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [input.to],
        subject: input.subject,
        html: input.html,
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

const verifyEmailHtml = (fullName: string, verifyUrl: string): string => `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1e293b">
    <h1 style="font-size:20px;margin:0 0 12px">Verifikasi email KosPlatform</h1>
    <p>Halo ${fullName},</p>
    <p>
      Kami menerima satu alamat email ini saat mendaftar. Klik tautan di bawah
      untuk memastikannya, supaya pemberitahuan booking, tagihan, dan atur ulang
      sandi benar-benar sampai ke tangan Anda. Tautannya berlaku 24 jam.
    </p>
    <p style="margin:24px 0">
      <a href="${verifyUrl}" style="background:#172b4d;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">
        Verifikasi email
      </a>
    </p>
    <p style="color:#64748b;font-size:14px">
      Kalau Anda tidak merasa mendaftar di KosPlatform, abaikan saja emailnya.
      Akunnya tetap bisa dipakai, hanya emailnya belum terverifikasi.
    </p>
  </div>
`

/** Kirim tautan atur ulang sandi. */
export const sendPasswordResetEmail = async (input: {
  to: string
  fullName: string
  resetUrl: string
}): Promise<void> => {
  await kirimEmail({
    to: input.to,
    subject: 'Atur ulang sandi KosPlatform',
    html: resetEmailHtml(input.fullName, input.resetUrl),
    label: 'tautan atur ulang sandi',
    tautan: input.resetUrl,
  })
}

/** Kirim tautan verifikasi email. */
export const sendEmailVerificationEmail = async (input: {
  to: string
  fullName: string
  verifyUrl: string
}): Promise<void> => {
  await kirimEmail({
    to: input.to,
    subject: 'Verifikasi email KosPlatform',
    html: verifyEmailHtml(input.fullName, input.verifyUrl),
    label: 'tautan verifikasi email',
    tautan: input.verifyUrl,
  })
}
