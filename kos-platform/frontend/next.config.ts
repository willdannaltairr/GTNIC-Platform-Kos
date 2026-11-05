import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: {
    // Repo induk juga punya package-lock.json, sehingga Next.js keliru memilih
    // GTNIC-UMKM sebagai workspace root dan menyisir seluruh pohon folder itu.
    // Root dikunci ke folder monorepo kos-platform — satu tingkat di atas
    // frontend — karena node_modules di-hoist ke sana oleh npm workspaces
    // dan Turbopack menolak berkas di luar root.
    root: path.resolve(__dirname, '..'),
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    cpus: 1,
    workerThreads: false,
  },
}

export default nextConfig
