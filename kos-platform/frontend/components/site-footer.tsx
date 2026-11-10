import Link from 'next/link'
import { FOOTER_LINKS } from '@/lib/constants'
import { Logo } from '@/components/landing/logo'

/**
 * Kaki halaman aplikasi.
 *
 * Bentuknya mengikuti pola halaman aplikasi: lajur sempit berisi tautan
 * berketerangan kecil, dengan tanda merek di kolom pertama dan catatan proyek
 * di bawahnya. Yang membuat kaki halaman ini terasa rapi bukan hiasannya,
 * melainkan ukurannya yang jelas lebih kecil dari isi halaman — kaki halaman
 * yang hurufnya sebesar isi akan terbaca sebagai bagian yang belum selesai.
 *
 * Hiasan latarnya sengaja hanya dua: titik halus yang mengisi ruang kosong dan
 * nama platform yang sangat besar dan sangat pudar di bawah. Keduanya tidak
 * menambah satu pun tautan yang tidak benar-benar ada, jadi tidak ada tombol
 * yang menjanjikan halaman kosong.
 */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-card">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[14vw] font-extrabold uppercase leading-none tracking-tighter text-foreground/[0.03] sm:-bottom-10 lg:-bottom-14">
          HuniKos.
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))] lg:gap-x-8">
          <div className="col-span-2 max-w-sm md:col-span-1">
            <Link href="/" aria-label="HuniKos" className="inline-flex items-center gap-2.5">
              <Logo />
            </Link>

            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              Platform pencarian dan pengelolaan kos yang mengutamakan transparansi biaya,
              kecocokan kebutuhan, dan kepercayaan antara penghuni dengan pemilik kos.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/90">
                {group.title}
              </h2>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex text-[13px] leading-snug text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-border/70 pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            HuniKos adalah proyek pengembangan platform kos. Seluruh properti dan akun demo
            berisi data fiktif untuk keperluan demonstrasi. Pembayaran pada mode demo diproses
            melalui sandbox penyedia pembayaran dan tidak melibatkan uang sungguhan.
          </p>
        </div>
      </div>
    </footer>
  )
}
