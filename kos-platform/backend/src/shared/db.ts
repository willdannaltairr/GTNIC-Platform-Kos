import pg from 'pg'
import { angkaEnv, env } from '../env.ts'

/**
 * Koneksi database untuk server Express.
 *
 * Menggantikan klien `postgres` milik Edge Function, tetapi API fungsinya
 * sengaja dibuat sama — `query`, `queryOne`, `withTransaction` — supaya 21
 * service yang sudah ada tidak perlu diubah satu baris pun. Yang berubah hanya
 * cara koneksinya dibuat: `pg.Pool` yang hidup selama proses server hidup,
 * bukan koneksi berumur pendek per isolate.
 *
 * Parser tipe bawaan `pg` dipertahankan apa adanya. `numeric` tetap kembali
 * sebagai string karena itulah bentuk yang selama ini diterima service (lihat
 * `geo.ts` dan `rooms.service.ts`), dan `count(*)::int` tetap kembali sebagai
 * number. Mengubahnya di sini berarti mengubah perilaku di banyak tempat
 * sekaligus tanpa ada yang memintanya.
 */
const { Pool } = pg

const globalForDb = globalThis as unknown as { kosPool?: pg.Pool }

export const pool: pg.Pool =
  globalForDb.kosPool ??
  new Pool({
    connectionString: env('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5433/kos_platform'),
    max: angkaEnv('DB_POOL_MAX', 10),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  })

globalForDb.kosPool = pool

pool.on('error', (error) => {
  console.error('[db] koneksi menganggur bermasalah:', error.message)
})

/** Jalankan query dan kembalikan barisnya. Semua nilai lewat parameter, tidak dirangkai. */
export const query = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
  const hasil = await pool.query(text, params as unknown[])
  return hasil.rows as T[]
}

/** Jalankan query dan kembalikan baris pertama, atau null bila tidak ada. */
export const queryOne = async <T>(text: string, params: unknown[] = []): Promise<T | null> => {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

/** Koneksi tunggal di dalam transaksi, hanya bisa menjalankan query. */
export interface DbClient {
  query: <R>(text: string, params?: unknown[]) => Promise<R[]>
}

/**
 * Jalankan sekumpulan perintah dalam satu transaksi.
 *
 * Kegagalan di tengah membatalkan seluruhnya, jadi tidak ada keadaan separuh
 * jadi yang tertinggal di database, misalnya status yang berubah tanpa baris
 * riwayatnya.
 */
export const withTransaction = async <T>(run: (client: DbClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hasil = await run({
      query: async <R>(text: string, params: unknown[] = []): Promise<R[]> => {
        const rows = await client.query(text, params as unknown[])
        return rows.rows as R[]
      },
    })
    await client.query('COMMIT')
    return hasil
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Kode galat PostgreSQL yang sering perlu dibedakan pemanggil. */
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const

/** Apakah galat ini berasal dari kode PostgreSQL tertentu. */
export const isPgError = (error: unknown, kode: string): boolean =>
  (error as { code?: string })?.code === kode
