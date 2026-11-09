import path from 'node:path'
import type { NextConfig } from 'next'

/**
 * Alamat Edge Function yang menggantikan backend Express.
 *
 * Permintaan dari peramban diteruskan ke sini lewat jalur `/api/v1` milik situs
 * sendiri, bukan dipanggil langsung ke alamat fungsinya. Alasannya cookie sesi:
 * cookie `SameSite=Lax` tidak ikut terkirim pada permintaan lintas situs,
 * sehingga pemanggilan langsung membuat pengunjung tampak selalu belum masuk
 * walaupun loginnya berhasil. Lewat penerusan ini, seluruh permintaannya
 * sesama asal dan cookienya first-party.
 *
 * Nilainya bisa ditimpa lewat `API_FUNGSI_URL` untuk menunjuk proyek Supabase
 * lain tanpa menyunting berkas ini.
 */
const API_FUNGSI =
  process.env.API_FUNGSI_URL ?? 'https://ftunxbdpiokslgrzcmvd.supabase.co/functions/v1/api'

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
        destination: `${API_FUNGSI}/api/v1/:jalur*`,
      },
    ]
  },
}

export default nextConfig
