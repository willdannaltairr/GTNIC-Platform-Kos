'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { JudulHalaman, Seksi, TOMBOL_SEKUNDER } from '@/components/site/kerangka'
import { fetchProperties, fetchProperty, type PropertyDetail, type PropertyListItem } from '@/lib/api'
import { COST_CONFIDENCE_CLASS, COST_CONFIDENCE_LABEL, formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Lama sewa yang bisa diproyeksikan: satu bulan sampai dua tahun. */
const MIN_BULAN = 1
const MAKS_BULAN = 24
const PILIHAN_BULAN = [3, 6, 12, 24]

/**
 * Nama jenis tagihan dalam bahasa sehari-hari.
 *
 * `FIXED` dan `MONTHLY` tumpang tindih di database dan diperlakukan sama oleh
 * perhitungan biaya, jadi keduanya diberi label yang sama di sini. Dua label
 * berbeda untuk dua hal yang tidak berbeda hanya membuat pembacanya mencari
 * perbedaan yang tidak ada.
 */
const BILLING_LABEL: Record<string, string> = {
  MONTHLY: 'Bulanan tetap',
  FIXED: 'Bulanan tetap',
  VARIABLE: 'Bulanan, mengikuti pemakaian',
  ONE_TIME: 'Sekali bayar',
}

type HasilCari =
  | { tahap: 'diam' }
  | { tahap: 'memuat' }
  | { tahap: 'hasil'; items: PropertyListItem[] }
  | { tahap: 'gagal' }

/**
 * Simulasi biaya total.
 *
 * Halaman ini menjawab satu pertanyaan yang tidak terjawab oleh harga sewa:
 * berapa uang yang benar-benar keluar kalau tinggal di kos ini selama sekian
 * bulan. Rinciannya diambil dari komponen biaya yang dicatat pemiliknya sendiri
 * lewat API, bukan dari perkiraan halaman ini, sehingga angka yang tampil di
 * sini sama persis dengan yang tampil di halaman kosnya.
 *
 * Yang dihitung di sini hanya penjumlahan: sewa dikali jumlah bulan, biaya
 * bulanan dikali jumlah bulan, lalu ditambah biaya sekali bayar. Rumusnya
 * ditampilkan apa adanya di bawah hasilnya supaya bisa diperiksa sendiri, dan
 * totalnya selalu ditandai perkiraan selama masih ada komponen yang belum
 * dikonfirmasi pemilik. Deposit dipisahkan dari total biaya hangus karena uang
 * itu kembali saat keluar, dan mencampurnya ke satu angka membuat kos berdeposit
 * besar terlihat jauh lebih mahal daripada sebenarnya.
 */
export function SimulasiBiaya() {
  const params = useSearchParams()
  const slugAwal = params.get('kos')

  const [kata, setKata] = useState('')
  const [hasilCari, setHasilCari] = useState<HasilCari>({ tahap: 'diam' })
  const [slug, setSlug] = useState<string | null>(slugAwal)
  const [properti, setProperti] = useState<PropertyDetail | null>(null)
  const [memuatProperti, setMemuatProperti] = useState(false)
  const [bulan, setBulan] = useState(12)

  // Kos yang sedang dilihat diambil ulang setiap kali pilihannya berubah.
  // Yang disimpan hanya slug-nya, bukan seluruh isi properti: halaman ini bisa
  // dibuka dari tautan berisi `?kos=`, dan menyimpan isinya di alamat akan
  // membuat tautannya panjang tanpa menambah apa pun.
  useEffect(() => {
    if (!slug) {
      setProperti(null)
      return
    }

    let aktif = true
    setMemuatProperti(true)

    void fetchProperty(slug).then((hasil) => {
      if (!aktif) return
      setProperti(hasil)
      setMemuatProperti(false)
    })

    return () => {
      aktif = false
    }
  }, [slug])

  const cariKos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const bersih = kata.trim()
    if (bersih.length === 0) return

    setHasilCari({ tahap: 'memuat' })
    const hasil = await fetchProperties({ q: bersih, limit: 6 })
    setHasilCari(hasil === null ? { tahap: 'gagal' } : { tahap: 'hasil', items: hasil.items })
  }

  const ringkasan = properti?.costSummary ?? null

  /** Biaya yang benar-benar keluar selama `n` bulan, deposit dikecualikan. */
  const hitungHangus = useMemo(() => {
    if (!ringkasan) return null

    return (n: number): number =>
      (ringkasan.monthlyRent ?? 0) * n +
      ringkasan.monthlyFixed * n +
      ringkasan.monthlyEstimated * n +
      ringkasan.oneTimeOther
  }, [ringkasan])

  /** Total uang yang harus disiapkan: termasuk deposit yang kembali nanti. */
  const hitungTotal = useMemo(() => {
    if (!ringkasan || !hitungHangus) return null
    return (n: number): number => (hitungHangus(n) ?? 0) + ringkasan.depositAmount
  }, [ringkasan, hitungHangus])

  const hangus = hitungHangus?.(bulan) ?? null
  const total = hitungTotal?.(bulan) ?? null
  const rataBulan = hangus === null ? null : Math.round(hangus / bulan)

  const komponen = properti?.costs ?? []
  const sekaliBayar = komponen.filter((item) => item.billingType === 'ONE_TIME')
  const bulanan = komponen.filter((item) => item.billingType !== 'ONE_TIME')

  return (
    <>
      <Seksi garis={false}>
        <JudulHalaman
          eyebrow="Alat"
          title="Simulasi biaya total"
          description="Harga sewa bulanan jarang menjadi biaya sebenarnya. Pilih kos, tentukan lama tinggal, lalu lihat seluruh komponen biayanya: mana yang tetap, mana yang mengikuti pemakaian, dan mana yang hanya sekali bayar."
        />
      </Seksi>

      <Seksi>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Pilih kos yang dihitung</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Cari berdasarkan nama atau daerahnya. Yang bisa dipilih hanya kos yang sudah terbit
              dan terverifikasi, karena hanya kos itu yang data biayanya lengkap.
            </p>

            <form onSubmit={cariKos} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">Kata kunci kos</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={kata}
                  onChange={(event) => setKata(event.target.value)}
                  placeholder="Mis. Melati, atau Kebayoran"
                  className="h-11 w-full rounded-full bg-card pl-11 pr-4 text-sm text-foreground outline-none ring-1 ring-border/70 transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
                />
              </label>

              <button type="submit" className={TOMBOL_SEKUNDER}>
                Cari kos
              </button>
            </form>

            {hasilCari.tahap === 'memuat' && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Mencari kos...
              </p>
            )}

            {hasilCari.tahap === 'gagal' && (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                Daftar kos tidak bisa dimuat sekarang. Coba lagi sebentar lagi.
              </p>
            )}

            {hasilCari.tahap === 'hasil' && hasilCari.items.length === 0 && (
              <p className="mt-4 rounded-xl border border-border bg-card px-3.5 py-3 text-sm text-muted-foreground">
                Tidak ada kos terverifikasi yang cocok dengan kata kunci itu. Coba nama daerah atau
                nama kos yang lain.
              </p>
            )}

            {hasilCari.tahap === 'hasil' && hasilCari.items.length > 0 && (
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {hasilCari.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSlug(item.slug)}
                      className={cn(
                        'w-full rounded-2xl border p-4 text-left transition-colors',
                        item.slug === slug
                          ? 'border-primary bg-accent/60'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30',
                      )}
                    >
                      <span className="block text-sm font-semibold leading-snug">{item.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.district}, {item.city}
                      </span>
                      <span className="mt-2 block text-sm font-semibold tabular-nums text-primary">
                        {item.minMonthlyPrice === null
                          ? 'Harga belum dicatat'
                          : `${formatRupiah(item.minMonthlyPrice)}/bulan`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="min-w-0">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                Lama tinggal
              </h2>

              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Perkiraan biaya berubah menurut lama tinggal, karena biaya sekali bayar hanya
                muncul di awal.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {PILIHAN_BULAN.map((pilihan) => (
                  <button
                    key={pilihan}
                    type="button"
                    onClick={() => setBulan(pilihan)}
                    aria-pressed={bulan === pilihan}
                    className={cn(
                      'h-9 rounded-full border px-3.5 text-sm font-medium tabular-nums transition-colors',
                      bulan === pilihan
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/40',
                    )}
                  >
                    {pilihan} bulan
                  </button>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
                  <span>Lama tinggal</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {bulan} bulan
                  </span>
                </span>

                <input
                  type="range"
                  min={MIN_BULAN}
                  max={MAKS_BULAN}
                  step={1}
                  value={bulan}
                  onChange={(event) => setBulan(Number(event.target.value))}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />

                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {MIN_BULAN} sampai {MAKS_BULAN} bulan
                </span>
              </label>
            </div>
          </aside>
        </div>
      </Seksi>

      {memuatProperti && (
        <Seksi>
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-72 animate-pulse rounded-3xl bg-muted" />
        </Seksi>
      )}

      {!slug && !memuatProperti && (
        <Seksi>
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="text-sm font-semibold">Belum ada kos yang dipilih</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Cari kos di atas, atau buka simulasi langsung dari halaman kos mana pun. Rincian
              biayanya juga bisa Anda tambahkan ke perbandingan lewat halaman Bandingkan kos.
            </p>
            <Link href="/kos" className={cn(TOMBOL_SEKUNDER, 'mt-5')}>
              Cari kos dulu
            </Link>
          </div>
        </Seksi>
      )}

      {slug && !memuatProperti && properti === null && (
        <Seksi>
          <div className="rounded-3xl border border-border bg-card px-6 py-10 text-center">
            <p className="text-sm font-semibold">Kos ini tidak bisa dibuka</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Kemungkinan pemiliknya menariknya dari peredaran atau kosnya belum terverifikasi.
              Pilih kos lain dari hasil pencarian di atas.
            </p>
          </div>
        </Seksi>
      )}

      {properti !== null && ringkasan !== null && (
        <>
          <Seksi>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{properti.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {properti.district}, {properti.city}
                </p>
              </div>

              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium ring-1',
                  COST_CONFIDENCE_CLASS[ringkasan.confidence] ?? 'bg-muted ring-border',
                )}
              >
                {COST_CONFIDENCE_LABEL[ringkasan.confidence] ?? ringkasan.confidence}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-card p-5">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Biaya hangus per bulan
                </dt>
                <dd className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {rataBulan === null ? '-' : formatRupiah(rataBulan)}
                </dd>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Rata-rata selama {bulan} bulan, tanpa deposit karena uang itu kembali saat keluar.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-5">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Biaya awal masuk
                </dt>
                <dd className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                  {formatRupiah(ringkasan.upfrontTotal)}
                </dd>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Sewa bulan pertama, deposit {formatRupiah(ringkasan.depositAmount)}
                  {ringkasan.oneTimeOther > 0 &&
                    `, dan biaya lain ${formatRupiah(ringkasan.oneTimeOther)}`}
                  .
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-accent/60 p-5">
                <dt className="text-xs font-medium uppercase tracking-[0.12em] text-accent-foreground/80">
                  Total uang selama {bulan} bulan
                </dt>
                <dd className="mt-2 text-2xl font-bold tabular-nums text-accent-foreground">
                  {total === null ? '-' : formatRupiah(total)}
                </dd>
                <p className="mt-1.5 text-xs leading-relaxed text-accent-foreground/80">
                  Termasuk deposit {formatRupiah(ringkasan.depositAmount)} yang kembali saat keluar.
                  Biaya hangusnya {hangus === null ? '-' : formatRupiah(hangus)}.
                </p>
              </div>
            </dl>
          </Seksi>

          <Seksi>
            <h2 className="text-lg font-semibold tracking-tight">Rincian komponen biaya</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Seluruh baris di bawah dicatat oleh pemilik kosnya. Yang masih bertanda perkiraan
              berarti pemiliknya sendiri belum memastikan nominalnya, dan itu pertanyaan yang layak
              Anda ajukan saat survei.
            </p>

            {komponen.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-muted-foreground">
                Pemilik kos ini belum mencatat komponen biaya apa pun. Yang bisa dihitung hanya
                harga sewa kamarnya, yaitu {formatRupiah(ringkasan.monthlyRent)} per bulan.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Bulanan
                  </h3>

                  {bulanan.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Tidak ada biaya bulanan selain sewa.
                    </p>
                  ) : (
                    <ul className="mt-3">
                      {bulanan.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {BILLING_LABEL[item.billingType] ?? item.billingType}
                            </p>
                            {item.description && (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatRupiah(item.amount)}
                            </p>
                            <span
                              className={cn(
                                'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
                                COST_CONFIDENCE_CLASS[item.confidence] ?? 'bg-muted ring-border',
                              )}
                            >
                              {COST_CONFIDENCE_LABEL[item.confidence] ?? item.confidence}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-background px-4 py-3">
                    <span className="text-sm text-muted-foreground">Sewa + biaya bulanan</span>
                    <span className="text-sm font-bold tabular-nums">
                      ± {formatRupiah(ringkasan.monthlyTotalEstimated)}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Sekali bayar
                  </h3>

                  {sekaliBayar.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Tidak ada biaya sekali bayar yang dicatat, termasuk deposit.
                    </p>
                  ) : (
                    <ul className="mt-3">
                      {sekaliBayar.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.isRefundable
                                ? 'Dikembalikan saat keluar'
                                : 'Tidak dikembalikan'}
                            </p>
                            {item.description && (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatRupiah(item.amount)}
                            </p>
                            <span
                              className={cn(
                                'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ring-1',
                                COST_CONFIDENCE_CLASS[item.confidence] ?? 'bg-muted ring-border',
                              )}
                            >
                              {COST_CONFIDENCE_LABEL[item.confidence] ?? item.confidence}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-background px-4 py-3">
                    <span className="text-sm text-muted-foreground">Total di muka</span>
                    <span className="text-sm font-bold tabular-nums">
                      ± {formatRupiah(ringkasan.depositAmount + ringkasan.oneTimeOther)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-3.5">
              <p className="text-xs font-semibold text-foreground">Rumus yang dipakai</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {ringkasan.formulas.projection}
              </p>
            </div>

            {ringkasan.unknowns.length > 0 && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3.5 text-sm text-amber-800 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">
                  <span className="font-semibold">Tanyakan saat survei: </span>
                  {ringkasan.unknowns.join(', ')}. Selama komponen itu belum dipastikan pemiliknya,
                  angka di halaman ini adalah perkiraan, bukan tagihan.
                </span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/kos/${properti.slug}`} className={TOMBOL_SEKUNDER}>
                Buka halaman kosnya
              </Link>
            </div>
          </Seksi>
        </>
      )}
    </>
  )
}
