#!/usr/bin/env node
/**
 * Kelola cluster PostgreSQL dev lokal untuk kos-platform.
 *
 * Cluster ini terpisah dari service PostgreSQL utama mesin (port 5433,
 * auth trust hanya di 127.0.0.1, data di backend/.pgdata yang di-gitignore)
 * supaya pekerjaan di proyek ini tidak menyentuh database lain.
 *
 * Pemakaian: npm run db:local -- <init|start|stop|status>
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(here, '..')
const dataDir = path.join(backendDir, '.pgdata')
const logFile = path.join(dataDir, 'server.log')
const pgBin = process.env.PG_BIN ?? 'C:\\Program Files\\PostgreSQL\\18\\bin'
const port = process.env.KOS_DB_PORT ?? '5433'
const dbName = 'kos_platform'

const exe = (name) => path.join(pgBin, process.platform === 'win32' ? `${name}.exe` : name)

const run = (name, args) => execFileSync(exe(name), args, { stdio: 'inherit' })

const isUp = () => {
  try {
    execFileSync(exe('pg_isready'), ['-q', '-h', '127.0.0.1', '-p', port], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const query = (sql) => {
  try {
    return execFileSync(
      exe('psql'),
      ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', 'postgres', '-tAc', sql],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
      .toString()
      .trim()
  } catch {
    return ''
  }
}

const startServer = () =>
  execFileSync(exe('pg_ctl'), ['-D', dataDir, '-l', logFile, '-o', `-p ${port}`, '-w', 'start'], {
    stdio: 'ignore',
  })

const ensureDatabase = () => {
  const exists = query(`SELECT 1 FROM pg_database WHERE datname='${dbName}'`)
  if (exists !== '1') {
    run('createdb', ['-h', '127.0.0.1', '-p', port, '-U', 'postgres', dbName])
    console.log(`Database "${dbName}" dibuat.`)
  }
}

const action = process.argv[2] ?? 'status'

switch (action) {
  case 'init': {
    if (!existsSync(path.join(dataDir, 'PG_VERSION'))) {
      console.log('Membuat cluster PostgreSQL baru di', dataDir)
      run('initdb', ['-D', dataDir, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=C'])
    }
    if (!isUp()) startServer()
    ensureDatabase()
    console.log(`Cluster siap. Server berjalan di 127.0.0.1:${port}.`)
    break
  }
  case 'start': {
    if (isUp()) {
      console.log(`Server sudah berjalan di 127.0.0.1:${port}.`)
    } else {
      startServer()
      console.log(`Server berjalan di 127.0.0.1:${port}.`)
    }
    break
  }
  case 'stop': {
    if (isUp()) {
      run('pg_ctl', ['-D', dataDir, '-m', 'fast', 'stop'])
      console.log('Server dihentikan.')
    } else {
      console.log('Server sedang tidak berjalan.')
    }
    break
  }
  case 'status': {
    console.log(isUp() ? `Server berjalan di 127.0.0.1:${port}.` : 'Server tidak berjalan.')
    break
  }
  default: {
    console.log('Pakai: npm run db:local -- <init|start|stop|status>')
    process.exit(1)
  }
}
