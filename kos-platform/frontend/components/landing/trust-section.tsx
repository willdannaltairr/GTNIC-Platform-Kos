import { ShieldCheck } from 'lucide-react'
import { TRUST_POINTS } from '@/lib/constants'

/** Komitmen kepercayaan: apa yang diverifikasi, apa yang tidak diklaim. */
export function TrustSection() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Kepercayaan & Keamanan
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Informasi Jujur, Termasuk soal Batasannya
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Kami lebih memilih menyampaikan apa yang belum diketahui daripada menampilkan angka
            yang terlihat pasti padahal belum dikonfirmasi.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-base font-bold tracking-tight">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
