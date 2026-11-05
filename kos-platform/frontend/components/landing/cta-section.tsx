import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/** Ajakan terakhir di beranda. */
export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="rounded-2xl bg-forest px-6 py-12 text-center text-forest-foreground sm:px-12">
        <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
          Siap Menemukan Kos yang Tenang untuk Ditinggali?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-forest-foreground/85">
          Mulai dari pencarian sederhana. Semua informasi biaya, jarak, dan ketersediaan tersaji
          sebelum Anda mengambil keputusan.
        </p>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/kos"
            className="inline-flex items-center gap-2 rounded-xl bg-leaf px-6 py-3 text-sm font-semibold text-forest transition-colors hover:bg-leaf/90"
          >
            Cari Kos Sekarang
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/daftar"
            className="inline-flex items-center gap-2 rounded-xl border border-forest-foreground/30 px-6 py-3 text-sm font-semibold text-forest-foreground transition-colors hover:bg-forest-foreground/10"
          >
            Daftar Sebagai Pemilik
          </Link>
        </div>
      </div>
    </section>
  )
}
