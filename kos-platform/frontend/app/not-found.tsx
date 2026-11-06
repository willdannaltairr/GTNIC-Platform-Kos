import Link from 'next/link'
import { SiteChrome } from '@/components/site-chrome'

/**
 * Halaman 404.
 *
 * Berada di luar route group, jadi chrome-nya dipasang langsung agar header
 * dan footer tetap tampil seperti sebelumnya.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-2xl font-bold text-muted-foreground">
          404
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kos yang Anda cari mungkin sudah tidak dipublikasikan, atau tautannya salah ketik.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/kos"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
          >
            Cari kos lain
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Kembali ke beranda
          </Link>
        </div>
      </div>
    </SiteChrome>
  )
}
