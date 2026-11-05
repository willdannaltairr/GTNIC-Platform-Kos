import { CheckCircle2 } from 'lucide-react'
import { SEARCH_FEATURES } from '@/lib/constants'

/**
 * Penjelasan pencarian: apa saja yang bisa disaring dan bagaimana hasilnya
 * bisa dibagikan lewat URL.
 */
export function SearchSection() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pencarian yang Benar-Benar Menyaring
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Filter diterapkan langsung pada query database, bukan sekadar menyembunyikan kartu di
            layar. Semua pilihan Anda tercermin di URL, jadi hasil pencarian mudah dibagikan atau
            dibuka kembali nanti.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {SEARCH_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-muted/60 p-5">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contoh hasil saringan
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span>Harga maksimal</span>
                <span className="font-semibold">Rp1.000.000</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span>Kota</span>
                <span className="font-semibold">Bandung</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span>Fasilitas</span>
                <span className="font-semibold">Wi-Fi, Parkir Motor</span>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Hasil menampilkan jumlah kos yang cocok, lengkap dengan jumlah kamar yang benar-benar
              tersedia dan kapan terakhir pemilik mengonfirmasinya.
            </p>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Angka pada contoh ini hanya ilustrasi tampilan filter.
          </p>
        </div>
      </div>
    </section>
  )
}
