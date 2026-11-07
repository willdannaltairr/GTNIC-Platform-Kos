#!/usr/bin/env node
/**
 * Jalankan berkas SQL ke database.
 *
 * Menggantikan perintah Prisma (`prisma migrate`, `prisma db seed`) setelah
 * proyek pindah ke SQL langsung: skema dan data demo sepenuhnya berupa berkas
 * .sql di dalam supabase/, jadi apa yang dijalankan bisa dibaca siapa pun
 * tanpa alat tambahan.
 *
 * Pemakaian:
 *   node backend/scripts/db-sql.mjs --migrate      # semua migration, urut nama
 *   node backend/scripts/db-sql.mjs <berkas.sql>   # berkas tertentu
 *   node backend/scripts/db-sql.mjs --list         # lihat daftar migration
 *
 * DATABASE_URL dibaca dari backend/.env (atau dari environment bila sudah ada),
 * jadi berkas ini tidak bergantung pada perintah shell tertentu.
 * Tls mengikuti aturan yang sama dengan aplikasi: menyala untuk host non-lokal,
 * mati untuk localhost — kecuali DB_SSL diisi eksplisit.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(here, '..')
const repoDir = path.resolve(backendDir, '..')
const migrationsDir = path.join(repoDir, 'supabase', 'migrations')

/** Baca .env sederhana tanpa dependensi tambahan. */
const loadEnv = () => {
  const file = path.join(backendDir, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '')
  }
}

const resolveSsl = (rawUrl) => {
  const mode = process.env.DB_SSL ?? 'auto'
  if (mode === 'disable') return false
  if (mode === 'require') return { rejectUnauthorized: false }
  const host = new URL(rawUrl).hostname
  return ['localhost', '127.0.0.1', '::1'].includes(host) ? false : { rejectUnauthorized: false }
}

const migrationFiles = () =>
  existsSync(migrationsDir)
    ? readdirSync(migrationsDir)
        .filter((name) => name.endsWith('.sql'))
        .sort()
        .map((name) => path.join(migrationsDir, name))
    : []

const main = async () => {
  loadEnv()

  const args = process.argv.slice(2)

  if (args[0] === '--list') {
    const files = migrationFiles()
    console.log(`${files.length} migration:`)
    for (const file of files) console.log(`  ${path.relative(repoDir, file)}`)
    return
  }

  const files = args[0] === '--migrate' ? migrationFiles() : args

  if (files.length === 0) {
    console.error('Pakai: node backend/scripts/db-sql.mjs --migrate | <berkas.sql> | --list')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL belum diisi. Salin .env.example menjadi backend/.env lebih dulu.')
    process.exit(1)
  }

  // `pg` adalah modul CommonJS; impor dinamis tidak selalu mengenali ekspor
  // bernama di dalamnya, jadi diambil lewat require seperti modul CJS biasa.
  const { Client } = createRequire(import.meta.url)('pg')

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: resolveSsl(process.env.DATABASE_URL),
  })

  await client.connect()

  const host = new URL(process.env.DATABASE_URL).host
  console.log(`Terhubung ke ${host}`)

  try {
    for (const file of files) {
      const sql = readFileSync(file, 'utf8')
      const relative = path.relative(repoDir, file)
      process.stdout.write(`→ ${relative} ... `)

      // Satu berkas dijalankan apa adanya; migration dan seed sudah mengatur
      // transaksinya sendiri (seed memakai BEGIN/COMMIT eksplisit).
      const results = await client.query(sql)
      const last = Array.isArray(results) ? results[results.length - 1] : null
      console.log(last?.rowCount !== null && last?.rowCount !== undefined ? `selesai (${last.rowCount} baris)` : 'selesai')
    }

    console.log('Semua berkas selesai dijalankan.')
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`\nGagal: ${error.message}`)
  process.exit(1)
})
