import type { FC, ReactNode } from 'react'

import { MapPin, Navigation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTE_DEMO } from '@/lib/landing'

interface RouteVisualProps {
  className?: string
}

/** Daftar tujuan dari kos: jarak dan estimasi waktu tempuh per titik. */
const RouteVisual: FC<RouteVisualProps> = ({ className }): ReactNode => {
  return (
    <div className={cn('w-full rounded-2xl bg-card p-5 ring-1 ring-black/5 sm:p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Rute &amp; Sekitar</p>
          <h3 className="mt-1.5 font-heading text-lg font-medium tracking-tight text-foreground">
            Dari Kos Melati
          </h3>
        </div>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Navigation className="size-4" aria-hidden="true" />
        </span>
      </div>

      <ul className="mt-5 space-y-4">
        {ROUTE_DEMO.map((stop, index) => (
          <li key={stop.label} className="flex items-start gap-3">
            <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-leaf-soft" />
              <span className="relative font-mono text-[10px] font-semibold text-accent-foreground">
                {index + 1}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {stop.label}
              </span>

              <span className="mt-0.5 block text-xs text-muted-foreground">
                {stop.distance} · sekitar {stop.time}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Estimasi waktu dapat berubah tergantung lalu lintas dan moda transportasi yang Anda pakai.
      </p>
    </div>
  )
}

export default RouteVisual
