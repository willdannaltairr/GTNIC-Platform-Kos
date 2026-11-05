import Link from 'next/link'
import { FOOTER_LINKS } from '@/lib/constants'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                K
              </span>
              <span className="text-base font-semibold tracking-tight">KosPlatform</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Platform pencarian dan pengelolaan kos yang mengutamakan transparansi biaya,
              kecocokan kebutuhan, dan kepercayaan antara penghuni dengan pemilik kos.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              <ul className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            KosPlatform adalah proyek pengembangan platform kos. Seluruh properti dan akun demo
            berisi data fiktif untuk keperluan demonstrasi. Pembayaran pada mode demo diproses
            melalui sandbox penyedia pembayaran dan tidak melibatkan uang sungguhan.
          </p>
        </div>
      </div>
    </footer>
  )
}
