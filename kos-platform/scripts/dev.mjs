#!/usr/bin/env node
/**
 * Dev runner: menyalakan frontend dan backend sekaligus.
 *
 * `npm run dev` dari folder kos-platform menjalankan keduanya, supaya tidak
 * perlu dua terminal. Masing-masing masih bisa dijalankan sendiri lewat
 * `dev:web` dan `dev:api`.
 *
 * Aturan saat salah satu proses mati: yang lain dibiarkan hidup dan
 * penyebabnya dicetak besar. Dev server web adalah yang dipakai untuk melihat
 * hasil kerja, jadi kegagalan di sisi API tidak boleh ikut mematikannya -
 * tetapi juga tidak boleh lewat tanpa suara, karena halaman yang tampil tanpa
 * API akan menampilkan daftar kos yang kosong dan itu menyesatkan.
 *
 * Tidak memakai `concurrently` atau sejenisnya: satu berkas Node sudah cukup,
 * dan tidak ada paket baru di lockfile hanya untuk menjalankan dua perintah.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TARGETS = [
  { name: 'web', dir: 'frontend', url: 'http://localhost:3000' },
  { name: 'api', dir: 'backend', url: 'http://localhost:4000/api/v1' },
]

// Di Windows, `npm` tidak bisa dijalankan lewat spawn tanpa shell sejak Node
// 18.20/20.12 (menjalankan berkas .cmd langsung ditolak EINVAL), jadi di sana
// perintahnya lewat shell. Di Linux dan macOS tidak perlu.
const useShell = process.platform === 'win32'

const running = new Set(TARGETS.map((target) => target.name))
let failed = false

const children = TARGETS.map((target) => {
  console.log(`[dev] ${target.name.padEnd(3)} → ${target.url}   (${target.dir}/)`)

  const child = spawn('npm', ['run', 'dev', '--prefix', target.dir], {
    cwd: root,
    stdio: 'inherit',
    shell: useShell,
  })

  child.on('error', (error) => {
    failed = true
    running.delete(target.name)
    console.error(`[dev] ${target.name} gagal dijalankan: ${error.message}`)

    if (running.size === 0) process.exit(1)
  })

  child.on('exit', (code, signal) => {
    running.delete(target.name)

    if (code !== 0 && code !== null) failed = true

    const reason = signal ? `sinyal ${signal}` : `kode ${code}`

    if (running.size === 0) {
      console.log(`[dev] semua proses berhenti (${target.name}: ${reason})`)
      process.exit(failed ? 1 : 0)
    }

    console.error(
      `\n[dev] ${target.name} berhenti (${reason}); masih jalan: ${[...running].join(', ')}\n`,
    )
  })

  return child
})

// Ctrl+C sudah mengenai seluruh grup proses di terminal, jadi anak-anaknya
// menerima sinyal yang sama. Di sini hanya dipastikan tidak ada yang
// tertinggal hidup setelah salah satu dimatikan dari luar.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      if (child.exitCode === null) child.kill()
    }
  })
}
