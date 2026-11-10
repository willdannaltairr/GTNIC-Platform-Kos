import path from 'node:path'
import type { NextConfig } from 'next'
import { ALAMAT_FUNGSI } from './lib/api-alamat'

/**
 * Alamat Edge Function yang melayani seluruh API.
 *
 * Berasal dari `lib/api-alamat.ts`, tempat yang sama yang dipakai sisi server
 * untuk memanggil fungsinya langsung. Satu sumber supaya penerusan di sini dan
 * pemanggilan langsung itu tidak pernah menunjuk ke proyek yang berbeda.
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: {
    // Root dikunci ke folder monorepo kos-platform, satu tingkat di atas
    // frontend, karena node_modules di-hoist ke sana oleh npm workspaces dan
    // Turbopack menolak berkas di luar root. Tanpa kunci ini Next menelusuri
    // ke atas sampai GTNIC-UMKM dan menyisir seluruh pohon folder itu.
    root: path.resolve(__dirname, '..'),
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    cpus: 1,
    workerThreads: false,
  },
  /**
   * Seluruh panggilan API diteruskan ke Edge Function.
   *
   * Bentuk alamatnya dipertahankan persis, termasuk awalan `/api/v1`, karena
   * pemotongan awalan platform dilakukan di dalam fungsinya. Yang berubah hanya
   * asal permintaannya, bukan jalurnya.
   */
  async rewrites() {
    return [
      {
        source: '/api/v1/:jalur*',
        destination: `${ALAMAT_FUNGSI}/api/v1/:jalur*`,
      },
    ]
  },
}

export default nextConfig
