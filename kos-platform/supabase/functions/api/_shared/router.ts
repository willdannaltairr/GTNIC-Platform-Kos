import { HttpError } from './http.ts'

/**
 * Router kecil untuk satu Edge Function.
 *
 * Express tidak dipakai lagi, tetapi bentuk rutenya dipertahankan: pola
 * bertitik dua (`/:id`) dan urutan pemeriksaan yang sama, sehingga daftar
 * endpoint-nya bisa dibaca berdampingan dengan backend lama dan tidak ada
 * jalur yang diam-diam berubah arti.
 *
 * Ditulis sendiri, bukan memakai pustaka, karena kebutuhannya hanya mencocokkan
 * segmen jalan dan menyimpan nilainya: sekitar tiga puluh baris, tanpa satu pun
 * ketergantungan yang ikut ke dalam bundel fungsi.
 */

export interface Ctx {
  req: Request
  /** Jalan yang sudah dinormalkan, mis. `/auth/login`. */
  path: string
  url: URL
  params: Record<string, string>
}

export type Handler = (ctx: Ctx) => Promise<Response>

interface Rute {
  method: string
  segmen: string[]
  handler: Handler
}

export class Router {
  private rute: Rute[] = []

  private daftar(method: string, pola: string, handler: Handler): void {
    this.rute.push({
      method,
      segmen: pola.split('/').filter(Boolean),
      handler,
    })
  }

  get(pola: string, handler: Handler): void {
    this.daftar('GET', pola, handler)
  }

  post(pola: string, handler: Handler): void {
    this.daftar('POST', pola, handler)
  }

  patch(pola: string, handler: Handler): void {
    this.daftar('PATCH', pola, handler)
  }

  put(pola: string, handler: Handler): void {
    this.daftar('PUT', pola, handler)
  }

  delete(pola: string, handler: Handler): void {
    this.daftar('DELETE', pola, handler)
  }

  /**
   * Cari rute yang cocok dan jalankan.
   *
   * Mengembalikan `null` bila tidak ada yang cocok, supaya pemanggilnya yang
   * memutuskan jawabannya. Bila jalan cocok tetapi metodenya berbeda, itu
   * dilaporkan 405 supaya kesalahan memilih metode tidak tampak seperti
   * endpoint yang tidak ada.
   */
  async handle(ctx: Ctx): Promise<Response | null> {
    const bagian = ctx.path.split('/').filter(Boolean)
    let adaJalan = false

    for (const rute of this.rute) {
      if (rute.segmen.length !== bagian.length) continue

      const params: Record<string, string> = {}
      let cocok = true

      for (let i = 0; i < rute.segmen.length; i += 1) {
        const pola = rute.segmen[i]
        const nilai = bagian[i]

        if (pola.startsWith(':')) {
          params[pola.slice(1)] = decodeURIComponent(nilai)
          continue
        }

        if (pola !== nilai) {
          cocok = false
          break
        }
      }

      if (!cocok) continue
      adaJalan = true

      if (rute.method !== ctx.req.method) continue

      return rute.handler({ ...ctx, params })
    }

    if (adaJalan) {
      throw new HttpError(405, `${ctx.req.method} tidak didukung pada alamat ini`)
    }

    return null
  }
}
