'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Bintang penilaian, untuk dibaca dan untuk dipilih.
 *
 * Nilai kosong tidak digambar sama sekali, bukan digambar sebagai lima bintang
 * abu-abu. Sub-penilaian yang tidak diisi penghuni tersimpan sebagai NULL, dan
 * lima bintang kosong untuknya akan terbaca sebagai "dinilai nol" padahal ia
 * memang tidak menilai aspek itu.
 */

const UKURAN = {
  sm: 'size-3.5',
  md: 'size-5',
} as const

export function Bintang({
  nilai,
  ukuran = 'sm',
  sertakanAngka = false,
}: {
  nilai: number | null | undefined
  ukuran?: keyof typeof UKURAN
  sertakanAngka?: boolean
}) {
  if (nilai === null || nilai === undefined) return null

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((bintang) => (
          <Star
            key={bintang}
            className={cn(
              UKURAN[ukuran],
              bintang <= Math.round(nilai)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-border',
            )}
          />
        ))}
      </span>
      <span className="sr-only">{nilai} dari 5</span>
      {sertakanAngka && <span className="text-xs font-medium">{nilai}</span>}
    </span>
  )
}

/**
 * Pemilih bintang untuk formulir.
 *
 * Dipakai sebagai radiogroup, bukan sebagai lima tombol lepas: yang dipilih
 * hanya satu nilai, dan pembaca layar perlu tahu kelima pilihannya satu
 * kelompok. Tombolnya juga menyebut angkanya, karena ikon bintang sendiri tidak
 * punya arti apa pun bagi yang tidak melihatnya.
 */
export function PilihBintang({
  label,
  hint,
  nilai,
  onChange,
}: {
  label: string
  hint?: string
  nilai: number
  onChange: (nilai: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{nilai > 0 ? `${nilai} dari 5` : 'Belum dinilai'}</span>
      </div>

      {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}

      <div role="radiogroup" aria-label={label} className="mt-1.5 flex gap-1">
        {[1, 2, 3, 4, 5].map((bintang) => (
          <button
            key={bintang}
            type="button"
            role="radio"
            aria-checked={nilai === bintang}
            aria-label={`${bintang} dari 5`}
            onClick={() => onChange(bintang)}
            className="rounded-md p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                'size-6',
                bintang <= nilai ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-border',
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
