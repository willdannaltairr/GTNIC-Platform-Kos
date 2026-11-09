import postgres from 'npm:postgres@^3'

/**
 * Koneksi database untuk Edge Function.
 *
 * Sumbernya `SUPABASE_DB_URL`, yang sudah tersedia di dalam Edge Function tanpa
 * perlu diisi sendiri: Supabase menyuntikkan alamat database proyek yang sama
 * dengan yang dipakai backend ini.
 *
 * `prepare: false` wajib, bukan pilihan gaya. Pooler Supabase dalam mode
 * transaction tidak mendukung prepared statement, dan tanpa mematikannya
 * query bisa menggantung atau mengembalikan baris yang tertukar. Di sini
 * pematiannya tidak merugikan apa pun karena Edge Function berumur pendek dan
 * tidak pernah memakai query bernama.
 *
 * `max: 1` karena setiap isolate hanya menangani satu permintaan pada satu
 * waktu; kumpulan koneksi yang lebih besar hanya menahan koneksi menganggur
 * yang ikut dihitung kuota database.
 */
type Sql = ReturnType<typeof postgres>

const globalForDb = globalThis as unknown as { kosSql?: Sql }

const buatKoneksi = (): Sql =>
  postgres(Deno.env.get('SUPABASE_DB_URL')!, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  })

export const sql: Sql = globalForDb.kosSql ?? buatKoneksi()
globalForDb.kosSql = sql

/**
 * Jalankan query dan kembalikan barisnya.
 *
 * `unsafe` dipakai karena seluruh SQL di proyek ini sudah ditulis dengan
 * penanda posisi ($1, $2) dan nilainya selalu lewat parameter, bukan
 * dirangkai ke dalam teks query. Nama fungsinya menyebut risiko yang memang
 * ada, dan risikonya nol selama tidak ada nilai pengguna yang ditempelkan ke
 * dalam teks SQL.
 */
export const query = async <T>(text: string, params: unknown[] = []): Promise<T[]> => {
  const rows = (await sql.unsafe(text, params as never[])) as unknown as T[]
  return Array.from(rows)
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
  return (await sql.begin(async (tx) => {
    const client: DbClient = {
      query: async <R>(text: string, params: unknown[] = []): Promise<R[]> => {
        const rows = (await tx.unsafe(text, params as never[])) as unknown as R[]
        return Array.from(rows)
      },
    }

    return run(client)
  })) as T
}

/** Kode galat PostgreSQL yang sering perlu dibedakan pemanggil. */
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const
