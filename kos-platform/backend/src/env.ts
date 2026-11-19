import 'dotenv/config'

/**
 * Satu tempat membaca variabel lingkungan.
 *
 * Semua modul memanggil `env('NAMA')` alih-alih `process.env.NAMA` supaya nilai
 * bawaannya tercatat di satu berkas, dan supaya tidak ada berkas lain yang
 * perlu tahu variabel mana yang selalu ada dan mana yang boleh kosong.
 */
export const env = (nama: string, bawaan = ''): string => {
  const nilai = process.env[nama]
  return nilai === undefined || nilai === '' ? bawaan : nilai
}

/** Variabel yang wajib ada. Dipanggil saat startup supaya gagal cepat, bukan saat melayani. */
export const envWajib = (nama: string): string => {
  const nilai = env(nama)
  if (!nilai) {
    console.error(`[env] ${nama} belum diisi. Salin .env.example menjadi .env lalu lengkapi.`)
    process.exit(1)
  }
  return nilai
}

export const angkaEnv = (nama: string, bawaan: number): number => {
  const nilai = Number(env(nama))
  return Number.isFinite(nilai) && nilai > 0 ? nilai : bawaan
}
