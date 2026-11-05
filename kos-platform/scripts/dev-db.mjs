import EmbeddedPostgres from 'embedded-postgres'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, '.pgdata')
const databases = ['nestari', 'nestari_test']

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: 55432,
  user: 'postgres',
  password: 'postgres',
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (message) => {
    if (/ready to accept|listening on|shut down|FATAL|error/i.test(message)) {
      console.log(`[postgres] ${message}`)
    }
  },
  onError: (error) => console.error('[postgres]', error),
})

const alreadyInitialised = fs.existsSync(path.join(dataDir, 'PG_VERSION'))

if (!alreadyInitialised) {
  console.log('[nestari] initialising portable PostgreSQL cluster...')
  await pg.initialise()
}

await pg.start()

const client = pg.getPgClient()
await client.connect()
for (const database of databases) {
  const result = await client.query('select 1 from pg_database where datname = $1', [database])
  if (result.rowCount === 0) {
    await pg.createDatabase(database)
    console.log(`[nestari] created database ${database}`)
  }
}
await client.end()

console.log('[nestari] PostgreSQL ready at postgresql://postgres:postgres@127.0.0.1:55432')
console.log('[nestari] press Ctrl+C to stop')

let stopping = false
async function shutdown() {
  if (stopping) return
  stopping = true
  console.log('\n[nestari] stopping PostgreSQL...')
  await pg.stop().catch((error) => console.error(error))
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
