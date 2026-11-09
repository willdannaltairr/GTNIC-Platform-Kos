/**
 * Penyedia pembayaran (Midtrans Snap).
 *
 * Seluruh lalu lintas ke penyedia ada di berkas ini, terpisah dari service.
 * Dua hal yang paling mudah salah dan karena itu dikumpulkan di satu tempat:
 * perakitan jumlah uang yang harus sama persis dengan yang ditagihkan, dan
 * pemeriksaan tanda tangan notifikasi yang menentukan apakah sebuah
 * pemberitahuan boleh dipercaya.
 */

const SANDBOX = 'https://app.sandbox.midtrans.com/snap/v1'
const PRODUKSI = 'https://app.midtrans.com/snap/v1'

const kunciServer = (): string => Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''

/** Apakah penyedia pembayaran sudah dikonfigurasi pengelola. */
export const midtransConfigured = (): boolean => Boolean(kunciServer())

const apiBase = (): string =>
  Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true' ? PRODUKSI : SANDBOX

/** Header autentikasi: kunci server sebagai nama pengguna tanpa sandi. */
const authHeader = (): string => `Basic ${btoa(`${kunciServer()}:`)}`

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
      'MIDTRANS_SERVER_KEY belum diisi sebagai secret fungsi ini, jadi pembayaran daring belum bisa dibuat',
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
      // Batas waktunya disebutkan dalam jam, mengikuti jam yang kita pakai
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

/** Ubah deretan byte menjadi teks heksadesimal huruf kecil. */
const keHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

/**
 * Bandingkan dua teks tanpa membocorkan seberapa banyak huruf awalnya cocok.
 *
 * Perbandingan biasa berhenti di huruf pertama yang berbeda, dan selisih waktu
 * sekecil itu cukup untuk menebak tanda tangan yang benar huruf demi huruf.
 * Seluruh isinya karena itu selalu dibaca sampai selesai.
 */
const samaPersis = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false

  let beda = 0
  for (let i = 0; i < a.length; i += 1) {
    beda |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return beda === 0
}

/**
 * Periksa tanda tangan notifikasi dari Midtrans.
 *
 * Rumusnya `sha512(order_id + status_code + gross_amount + server_key)`, dan
 * urutan itu ditentukan penyedianya, bukan pilihan kita. Pemeriksaan ini satu
 * satunya yang memisahkan notifikasi asli dari kiriman orang lain: tanpa itu
 * siapa pun yang tahu alamat webhook bisa menandai pembayarannya lunas.
 *
 * Ditulis sebagai fungsi asinkron karena hashing memakai Web Crypto, satu-satunya
 * API hash yang tersedia di Edge Function tanpa menarik modul Node.
 */
export const tandaTanganSah = async (input: {
  orderId: string
  statusCode: string
  grossAmount: string
  signature: string
}): Promise<boolean> => {
  const kunci = kunciServer()
  if (!kunci) return false

  const pesan = `${input.orderId}${input.statusCode}${input.grossAmount}${kunci}`
  const intisari = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(pesan))

  return samaPersis(keHex(intisari), input.signature.toLowerCase())
}
