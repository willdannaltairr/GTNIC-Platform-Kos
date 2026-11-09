import crypto from 'node:crypto'
import { env } from '../../config/env'

/**
 * Penyedia pembayaran (Midtrans Snap).
 *
 * Seluruh lalu lintas ke penyedia ada di berkas ini, terpisah dari service.
 * Dua hal yang paling mudah salah dan karena itu dikumpulkan di satu tempat:
 * perakitan jumlah uang yang harus sama persis dengan yang ditagihkan, dan
 * pemeriksaan tanda tangan notifikasi yang menentukan apakah sebuah
 * pemberitahuan boleh dipercaya.
 */

const sandboxBase = 'https://app.sandbox.midtrans.com/snap/v1'
const productionBase = 'https://app.midtrans.com/snap/v1'

const apiBase = (): string => (env.MIDTRANS_IS_PRODUCTION ? productionBase : sandboxBase)

export const midtransConfigured = (): boolean => Boolean(env.MIDTRANS_SERVER_KEY)

const authHeader = (): string =>
  `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`

export interface HasilTransaksi {
  token: string
  redirectUrl: string
}

/**
 * Buat transaksi Snap untuk satu pembayaran.
 *
 * `order_id` yang dipakai adalah kode pembayaran kita sendiri, bukan id acak
 * dari penyedia: kode itu yang muncul kembali di notifikasi, dan hanya dengan
 * begitu notifikasi bisa dicocokkan kembali ke baris pembayaran yang benar.
 *
 * Kegagalan penyedia tidak dilempar sebagai galat mentah: pemanggilnya
 * membutuhkan kalimat yang bisa ditampilkan, bukan pesan driver.
 */
export const buatTransaksi = async (input: {
  orderId: string
  amount: number
  itemName: string
  customerName: string
  customerEmail: string
  expiryHours: number
}): Promise<HasilTransaksi> => {
  if (!midtransConfigured()) {
    throw new Error(
      'MIDTRANS_SERVER_KEY belum diisi di backend/.env, jadi pembayaran daring belum bisa dibuat',
    )
  }

  const response = await fetch(`${apiBase()}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.amount,
      },
      item_details: [
        {
          id: input.orderId,
          name: input.itemName.slice(0, 50),
          price: input.amount,
          quantity: 1,
        },
      ],
      customer_details: {
        first_name: input.customerName.slice(0, 50),
        email: input.customerEmail,
      },
      // Batas waktunya disebutkan dalam menit, mengikuti jam yang kita pakai
      // sendiri supaya kedua sisi tidak berbeda soal kapan pembayaran mati.
      expiry: { unit: 'hours', duration: input.expiryHours },
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | { token?: string; redirect_url?: string; error_messages?: string[] }
    | null

  if (!response.ok || !data?.token || !data.redirect_url) {
    const detail = data?.error_messages?.join('; ') ?? `HTTP ${response.status}`
    throw new Error(`Penyedia pembayaran menolak permintaan: ${detail}`)
  }

  return { token: data.token, redirectUrl: data.redirect_url }
}

/**
 * Periksa tanda tangan notifikasi dari Midtrans.
 *
 * Rumusnya `sha512(order_id + status_code + gross_amount + server_key)`, dan
 * urutan itu ditentukan penyedianya, bukan pilihan kita. Pemeriksaan ini satu
 * satunya yang memisahkan notifikasi asli dari kiriman orang lain: tanpa itu
 * siapa pun yang tahu alamat webhook bisa menandai pembayarannya lunas.
 *
 * Dibandingkan dengan `timingSafeEqual` supaya lama pemeriksaannya tidak
 * bergantung pada seberapa banyak huruf pertama yang cocok.
 */
export const tandaTanganSah = (input: {
  orderId: string
  statusCode: string
  grossAmount: string
  signature: string
}): boolean => {
  if (!env.MIDTRANS_SERVER_KEY) return false

  const diharapkan = crypto
    .createHash('sha512')
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${env.MIDTRANS_SERVER_KEY}`)
    .digest('hex')

  const a = Buffer.from(diharapkan, 'utf8')
  const b = Buffer.from(input.signature, 'utf8')

  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}
