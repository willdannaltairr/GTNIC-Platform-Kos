import type { FC, ReactNode } from 'react'

import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CostVisualProps {
  name: string
  rows: { label: string; amount: string; note: string; confirmed: boolean }[]
  monthlyTotal: string
  upfrontTotal: string
  className?: string
}

/**
 * Rincian biaya ala Simulasi Biaya.
 *
 * Dipakai di bagian solusi dan di panel besar. Setiap baris membawa label
 * keterangannya sendiri, sehingga angka perkiraan tidak pernah tampil seolah
 * sudah pasti, inilah janji produk yang harus terlihat di komponennya.
 */
const CostVisual: FC<CostVisualProps> = ({
  name,
  rows,
  monthlyTotal,
  upfrontTotal,
  className,
}): ReactNode => {
  return (
    <div className={cn('w-full rounded-2xl bg-card p-5 ring-1 ring-black/5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Simulasi Biaya</p>
          <h3 className="mt-1.5 font-heading text-lg font-medium tracking-tight text-foreground">{name}</h3>
        </div>

        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground ring-1 ring-black/5">
          Biaya sebagian
        </span>
      </div>

      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {row.confirmed ? (
                  <CircleCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <CircleAlert className="size-3.5 shrink-0 text-sun" aria-hidden="true" />
                )}
                {row.label}
              </span>

              <span className="mt-0.5 block pl-5 text-xs text-muted-foreground">{row.note}</span>
            </span>

            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{row.amount}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-background p-4">
        <div>
          <dt className="text-xs text-muted-foreground">Per bulan</dt>
          <dd className="mt-1 font-heading text-lg font-medium tabular-nums text-foreground">{monthlyTotal}</dd>
        </div>

        <div>
          <dt className="text-xs text-muted-foreground">Biaya masuk</dt>
          <dd className="mt-1 font-heading text-lg font-medium tabular-nums text-foreground">{upfrontTotal}</dd>
        </div>
      </dl>
    </div>
  )
}

export default CostVisual
