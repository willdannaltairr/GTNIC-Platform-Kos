/**
 * Error HTTP dengan status code eksplisit.
 *
 * Dipakai seluruh service/controller agar errorHandler terpusat bisa
 * membedakan error operasional (pesan aman ditampilkan ke pengguna) dari
 * error tak terduga (pesan diganti generik, detail hanya masuk log server).
 */
export class HttpError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}
