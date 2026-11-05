import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kredit Foto',
  description: 'Daftar foto pihak ketiga yang dipakai di KosPlatform beserta kredit fotografernya.',
}

/**
 * Kredit foto wajib tampil karena lisensi Pexels mensyaratkannya.
 * Foto dipakai sebagai gambar ilustrasi contoh properti demo.
 */
const PHOTOS = [
  { file: 'hero-kamar.png', credit: 'LayG Traveller', url: 'https://www.pexels.com/photo/lamp-on-nightstand-26840825/' },
  { file: 'kos-1.jpg', credit: 'Henri Muljadi', url: 'https://www.pexels.com/photo/cozy-modern-bedroom-with-indoor-plants-34903881/' },
  { file: 'kos-2.jpg', credit: 'Yusuf P', url: 'https://www.pexels.com/photo/colorful-interior-wallpaper-blender-10969601/' },
  { file: 'kos-3.jpg', credit: 'Pixabay', url: 'https://www.pexels.com/photo/rolling-chair-in-front-of-desk-beside-bed-271695/' },
  { file: 'kos-4.jpg', credit: 'Max Vakhtbovych', url: 'https://www.pexels.com/photo/comfortable-bed-with-closet-near-door-in-hotel-room-7031721/' },
  { file: 'kos-5.jpg', credit: 'M&W Studios', url: 'https://www.pexels.com/photo/white-bed-next-to-white-accent-table-90319/' },
  { file: 'kos-6.jpg', credit: 'Ariel Marcon', url: 'https://www.pexels.com/photo/cozy-bedroom-interior-with-warm-lighting-40080688/' },
]

export default function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kredit Foto</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Foto kamar pada halaman contoh properti berasal dari Pexels dan dipakai sesuai lisensi
        Pexels. Foto ini adalah ilustrasi untuk data demo, bukan foto properti sungguhan.
      </p>

      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {PHOTOS.map((photo) => (
          <li key={photo.file} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <span className="text-sm font-medium text-foreground">{photo.file}</span>
            <a
              href={photo.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-primary hover:text-primary-strong"
            >
              Foto oleh {photo.credit} di Pexels
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
