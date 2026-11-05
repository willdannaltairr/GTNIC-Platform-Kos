import { CheckCircle2 } from 'lucide-react'
import { OWNER_BENEFITS, TENANT_BENEFITS } from '@/lib/constants'

/** Manfaat platform, dipisah untuk pencari kos dan pemilik kos. */
export function BenefitsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Manfaat untuk Kedua Sisi</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Pencari kos mendapat informasi yang utuh; pemilik kos mendapat alat kerja yang rapi.
          Kejujuran informasi menguntungkan keduanya.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold tracking-tight">Untuk Pencari Kos</h3>
          <ul className="mt-5 space-y-3">
            {TENANT_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div id="manfaat-pemilik" className="rounded-2xl border border-border bg-forest p-6 text-forest-foreground">
          <h3 className="text-lg font-bold tracking-tight">Untuk Pemilik Kos</h3>
          <ul className="mt-5 space-y-3">
            {OWNER_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
