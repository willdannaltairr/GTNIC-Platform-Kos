'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Foto {
  id: string
  url: string | null
  alt: string
}

/**
 * Galeri foto kamar.
 *
 * Foto utama ditampilkan besar, sisanya sebagai deretan kecil di bawahnya.
 * Memilih foto kecil menggantinya ke tampilan besar tanpa berpindah halaman,
 * karena calon penghuni biasanya ingin membandingkan beberapa sudut kamar yang
 * sama sebelum memutuskan.
 *
 * Kamar tanpa foto tidak diberi kotak kosong bergaris: yang ditampilkan adalah
 * keterangan bahwa pemiliknya belum mengunggah foto, karena itulah yang perlu
 * diketahui pengunjung, bukan fakta bahwa ada gambar yang gagal dimuat.
 */
export function RoomGallery({ photos, judul }: { photos: Foto[]; judul: string }) {
  const [aktif, setAktif] = useState(0)
  const terpilih = photos[aktif]

  if (photos.length === 0) {
    return (
      <div className="flex aspect-4/3 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
        <div className="text-center">
          <ImageOff className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            Pemilik belum mengunggah foto {judul.toLowerCase()}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-muted">
        {terpilih.url ? (
          <Image
            src={terpilih.url}
            alt={terpilih.alt}
            fill
            priority
            sizes="(min-width: 1024px) 45rem, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <p className="text-sm text-muted-foreground">Foto ini tidak bisa dimuat.</p>
          </div>
        )}
      </div>

      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((foto, index) => (
            <li key={foto.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setAktif(index)}
                aria-label={`Tampilkan foto ${index + 1} dari ${photos.length}`}
                aria-pressed={index === aktif}
                className={cn(
                  'relative size-20 overflow-hidden rounded-xl ring-2 transition-colors sm:size-24',
                  index === aktif ? 'ring-primary' : 'ring-transparent hover:ring-border',
                )}
              >
                {foto.url ? (
                  <Image src={foto.url} alt="" fill sizes="6rem" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center bg-muted text-[10px] text-muted-foreground">
                    Tidak ada
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
