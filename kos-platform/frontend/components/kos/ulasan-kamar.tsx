import Link from 'next/link'
import { ArrowUpRight, MessageSquareQuote, Star } from 'lucide-react'
import { formatTanggal } from '@/lib/format'
import type { DaftarUlasan } from '@/lib/reviews'
import { cn } from '@/lib/utils'

/**
 * Panel ulasan di samping foto kamar.
 *
 * Ulasan di API terikat pada properti, bukan pada kamar, jadi panel ini
 * menampilkannya sebagai ulasan kos dan menuliskannya terus terang di kaki
 * panel. Yang ditampilkan hanya ulasan yang sudah tayang, lengkap dengan
 * ringkasan dan rincian per aspek, supaya pengunjung bisa menilai kamar ini
 * dari pengalaman penghuni sebelumnya.
 */

function BintangHijau({
  nilai,
  ukuran = 'sm',
}: {
  nilai: number
  ukuran?: 'sm' | 'md'
}): React.ReactNode {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((bintang) => (
        <Star
          key={bintang}
          className={cn(
            ukuran === 'md' ? 'size-4' : 'size-3.5',
            bintang <= Math.round(nilai)
              ? 'fill-primary text-primary'
              : 'fill-transparent text-border',
          )}
        />
      ))}
    </span>
  )
}

function inisial(nama: string): string {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((bagian) => bagian.charAt(0).toUpperCase())
    .join('')
}

export function UlasanKamar({
  slug,
  propertyName,
  ulasan,
}: {
  slug: string
  propertyName: string
  ulasan: DaftarUlasan | null
}) {
  const ringkasan = ulasan?.meta.ringkasan
  const jumlah = ringkasan?.jumlahTayang ?? 0
  const daftar = ulasan?.items ?? []
  const rataRata = ringkasan?.rataRata ?? null

  const aspek = (
    [
      ['Kebersihan', ringkasan?.kebersihan],
      ['Lokasi', ringkasan?.lokasi],
      ['Fasilitas', ringkasan?.fasilitas],
      ['Layanan pemilik', ringkasan?.layananPemilik],
    ] as const
  ).flatMap(([label, nilai]) => (nilai == null ? [] : [{ label, nilai }]))

  return (
    <section
      aria-labelledby="ulasan-kamar"
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[33rem]"
    >
      <div className="border-b border-border bg-[#eef7ec] px-5 py-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareQuote className="size-4" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Komentar &amp; ulasan
            </p>
            <h2
              id="ulasan-kamar"
              className="mt-0.5 font-heading text-lg font-semibold leading-tight tracking-tight"
            >
              Apa kata penghuni
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{propertyName}</p>
          </div>

          {jumlah > 0 && (
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
              {jumlah} ulasan
            </span>
          )}
        </div>

        {rataRata != null && jumlah > 0 ? (
          <div className="mt-4 flex items-end gap-3">
            <span className="font-heading text-4xl font-semibold leading-none tracking-tight text-forest">
              {rataRata.toFixed(1).replace('.', ',')}
            </span>
            <div className="pb-0.5">
              <BintangHijau nilai={rataRata} ukuran="md" />
              <p className="mt-1 text-[11px] text-muted-foreground">dari {jumlah} ulasan tamu</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {ulasan === null
              ? 'Ulasan belum bisa dimuat saat ini.'
              : 'Belum ada ulasan yang tayang untuk kos ini.'}
          </p>
        )}

        {aspek.length > 0 && (
          <dl className="mt-4 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {aspek.map(({ label, nilai }) => (
              <div key={label} className="flex items-center gap-2">
                <dt className="w-[5.4rem] shrink-0 text-[11px] text-muted-foreground">{label}</dt>
                <dd className="flex flex-1 items-center gap-1.5">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (nilai / 5) * 100)}%` }}
                    />
                  </span>
                  <span className="w-5 text-right text-[11px] font-semibold">{nilai}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {ulasan === null ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Ulasan belum bisa dimuat saat ini.
          </p>
        ) : daftar.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
            Belum ada ulasan untuk kos ini. Ulasan ditulis penghuni yang pernah menempati kamarnya
            dan tayang setelah ditinjau admin.
          </p>
        ) : (
          <ul className="space-y-3">
            {daftar.map((item) => (
              <li key={item.id}>
                <article className="rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-bold text-primary-strong">
                        {inisial(item.tenantName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {item.tenantName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatTanggal(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <BintangHijau nilai={item.rating} />
                      <span className="text-[11px] font-semibold">{item.rating}</span>
                    </div>
                  </div>

                  {item.content && (
                    <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                      {item.content}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ulasan untuk kos ini, bukan per kamar.
          </p>
          <Link
            href={`/kos/${slug}#ulasan`}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-strong"
          >
            Semua ulasan
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
