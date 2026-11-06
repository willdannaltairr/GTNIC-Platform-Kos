import type { FC, ReactNode } from 'react'

import { MapPin, Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COST_CONFIDENCE_CLASS, formatRupiah } from '@/lib/format'
import { SEARCH_PREVIEW } from '@/lib/landing'

interface SearchPreviewProps {
  className?: string
}

/** Warna lencana kepercayaan biaya, dipakai ulang dari halaman /kos. */
const CONFIDENCE_CLASS: Record<string, string> = {
  'Biaya lengkap': COST_CONFIDENCE_CLASS.COMPLETE,
  'Biaya sebagian': COST_CONFIDENCE_CLASS.PARTIAL,
  'Perlu konfirmasi': COST_CONFIDENCE_CLASS.NEEDS_CONFIRMATION,
}

/**
 * Pratinjau layar pencarian.
 *
 * Meniru susunan halaman /kos — bilah pencarian, saringan, lalu kartu hasil
 * dengan skor KosMatch dan label kepercayaan biaya — supaya pengunjung melihat
 * bentuk produknya sebelum membuka halaman pencarian yang sebenarnya.
 *
 * Seluruh angka di sini ilustrasi tampilan dan tidak diambil dari API.
 */
const SearchPreview: FC<SearchPreviewProps> = ({ className }): ReactNode => {
  return (
    <div
      role="img"
      aria-label="Pratinjau layar pencarian: tiga kos di Sleman dengan skor kecocokan dan label kepercayaan biaya. Angka pada pratinjau ini hanya ilustrasi."
      className={cn(
        'overflow-hidden rounded-[1.75rem] bg-background text-left shadow-[0_60px_120px_-50px_rgba(0,0,0,0.75)] ring-1 ring-white/15',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-black/5 bg-white/70 px-4 py-3 sm:px-6">
        <span className="flex flex-1 items-center gap-2 rounded-full bg-background px-3.5 py-2 text-xs text-muted-foreground ring-1 ring-black/5 sm:text-sm">
          <Search className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{SEARCH_PREVIEW.keywords}</span>
        </span>

        <span className="flex items-center gap-2 rounded-full bg-background px-3.5 py-2 text-xs text-muted-foreground ring-1 ring-black/5 sm:text-sm">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{SEARCH_PREVIEW.city}</span>
        </span>

        <span className="hidden items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground sm:inline-flex sm:text-sm">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Saring
        </span>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-heading text-lg font-medium tracking-tight text-foreground sm:text-xl">
            Hasil pencarian
          </h3>

          <p className="text-xs text-muted-foreground sm:text-sm">
            <span className="tabular-nums">{SEARCH_PREVIEW.total}</span> kos terverifikasi cocok
          </p>
        </div>

        <ul className="mt-4 space-y-2.5">
          {SEARCH_PREVIEW.results.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-black/[0.06] sm:gap-4 sm:p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-leaf-soft font-heading text-base font-semibold text-accent-foreground sm:size-14"
              >
                <span className="tabular-nums">{item.match}</span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-medium text-foreground sm:text-[15px]">{item.name}</span>

                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
                      CONFIDENCE_CLASS[item.confidence] ?? 'bg-muted text-muted-foreground ring-border',
                    )}
                  >
                    {item.confidence}
                  </span>
                </span>

                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.area}</span>

                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {item.facilities.join(' · ')}
                </span>
              </span>

              <span className="hidden shrink-0 text-right sm:block">
                <span className="block text-sm font-semibold tabular-nums text-foreground">
                  {formatRupiah(item.price)}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">/bulan</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
          Angka pada pratinjau ini hanya ilustrasi tampilan. Hasil sungguhan diambil dari data properti
          terverifikasi.
        </p>
      </div>
    </div>
  )
}

export default SearchPreview
