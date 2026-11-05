import { CheckCircle2 } from 'lucide-react'
import { FEATURES } from '@/lib/constants'

/**
 * Tiga fitur pembeda platform: KosMatch, Simulasi Biaya, dan Rute & Sekitar.
 * Masing-masing dijelaskan apa adanya — termasuk batasannya.
 */
export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Tiga Hal yang Membuat Keputusan Lebih Tenang
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Bukan sekadar daftar kos. Setiap fitur dirancang untuk menjawab satu pertanyaan yang
          biasanya baru terjawab setelah Anda datang ke lokasi.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.id}
            id={feature.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-6"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              {feature.name}
            </span>
            <h3 className="mt-2 text-lg font-bold tracking-tight">{feature.tagline}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>

            <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
