import { Pool, type PoolConfig, type QueryResultRow } from 'pg'
import { env } from '../config/env'

/**
 * Koneksi database (PostgreSQL / Supabase) untuk seluruh backend.
 *
 * Menggantikan Prisma: seluruh query ditulis sebagai SQL langsung, jadi tidak
 * ada langkah generate client dan tidak ada lapisan yang menyembunyikan SQL
 * yang benar-benar dijalankan.
 */

/**
 * Susun konfigurasi pool dari connection string.
 *
 * Sambungan ke Supabase wajib terenkripsi, dan sertifikatnya tidak ada di
 * daftar tepercaya bawaan Node — jadi TLS dinyalakan di sini dengan
 * `rejectUnauthorized: false`: lalu lintas tetap terenkripsi, tetapi sertifikat
 * server tidak diverifikasi. Perhatikan dua hal:
 *
 *  1. Jika `sslmode` (atau `sslrootcert`/`sslcert`/`sslkey`) ikut tertulis di
 *     connection string, node-postgres akan MENGGANTI objek `ssl` di bawah —
 *     pengaturan di kode ini jadi tidak berpengaruh. Karena itu parameter itu
 *     dibuang dulu dari URL sebelum diserahkan ke Pool.
 *  2. Untuk verifikasi sertifikat penuh, setel `NODE_EXTRA_CA_CERTS` ke berkas
 *     CA Supabase dan ubah `rejectUnauthorized` menjadi true.
 */
const buildPoolConfig = (): PoolConfig => {
  const url = new URL(env.DATABASE_URL)

  const sslMode =
    env.DB_SSL === 'auto'
      ? ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
        ? 'disable'
        : 'require'
      : env.DB_SSL

  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(key)
  }

  return {
    connectionString: url.toString(),
    // Pooler Supabase tidak mendukung prepared statement bernama; pg hanya
    // memakainya bila query diberi `name`, dan di proyek ini tidak ada yang
    // memakainya — jadi tidak perlu pengaturan khusus.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    ...(sslMode === 'require' ? { ssl: { rejectUnauthorized: false } } : {}),
  }
}

const globalForDb = globalThis as unknown as { pool: Pool | undefined }

export const pool =
  globalForDb.pool ??
  new Pool(buildPoolConfig())

if (env.NODE_ENV !== 'production') globalForDb.pool = pool

// Satu koneksi yang error tidak boleh menjatuhkan seluruh proses.
pool.on('error', (error) => {
  console.error('[db] koneksi idle bermasalah:', error.message)
})

/** Jalankan query dan kembalikan barisnya. */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const result = await pool.query<T>(text, params as never[])
  return result.rows
}

/** Jalankan query dan kembalikan baris pertama, atau null bila tidak ada. */
export const queryOne = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> => {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

/** Koneksi tunggal di dalam transaksi — hanya bisa menjalankan query. */
export interface DbClient {
  query: <R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<R[]>
}

/** Jalankan sekumpulan perintah dalam satu transaksi. */
export const withTransaction = async <T>(run: (client: DbClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await run({
      query: async <R extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) => {
        const res = await client.query<R>(text, params as never[])
        return res.rows
      },
    })
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Kode error PostgreSQL yang sering perlu dibedakan pemanggil. */
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const
