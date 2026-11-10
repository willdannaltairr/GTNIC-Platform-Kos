'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatKartu } from '@/components/dashboard/kit'
import { fetchDashboardOwner, type DashboardOwner, type KamarPemilik } from '@/lib/dashboard'
import { ingatkanTagihan } from '@/lib/invoices'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Status tagihan yang masih menunggu uang. */
const BELUM_LUNAS = ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE']

/** Nama hari dan bulan dalam bahasa Indonesia, dipakai menyusun kalender. */
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Kunci tanggal lokal "YYYY-MM-DD", bukan ISO UTC. */
const kunciTanggal = (tanggal: Date): string => {
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0')
  const hari = String(tanggal.getDate()).padStart(2, '0')
  return `${tanggal.getFullYear()}-${bulan}-${hari}`
}

/**
 * Tanggal jatuh tempo dibaca sebagai tanggal kalender, bukan sebagai waktu.
 *
 * Backend mengirimnya sebagai ISO UTC. Kalau tanggalnya diambil apa adanya
 * lewat `toISOString()`, jatuh tempo yang jatuh pada malam hari di Indonesia
 * akan tergambar di hari berikutnya, dan pengingatnya dikirim di hari yang
 * salah menurut pemiliknya.
 */
const tanggalLokal = (iso: string | null): string | null => {
  if (!iso) return null
  const waktu = new Date(iso)
  if (Number.isNaN(waktu.getTime())) return null
  return kunciTanggal(new Date(waktu.getFullYear(), waktu.getMonth(), waktu.getDate()))
}

/**
 * Isi satu bulan untuk kisi kalender.
 *
 * Kisi selalu dimulai hari Senin dan berjumlah kelipatan tujuh, supaya
 * tanggalnya tidak bergeser baris saat bulannya berganti. Bulan pertama dan
 * terakhir ikut ditampilkan sebagai tanggal abu-abu supaya lebar barisnya tetap
 * penuh.
 */
const kisiBulan = (tahun: number, bulan: number): Date[] => {
  const pertama = new Date(tahun, bulan, 1)
  // getDay(): 0 = Minggu. Kalender ini mulai Senin, jadi Minggu digeser ke 6.
  const geser = (pertama.getDay() + 6) % 7
  const mulai = new Date(tahun, bulan, 1 - geser)

  return Array.from({ length: 42 }, (_, index) => {
    const tanggal = new Date(mulai)
    tanggal.setDate(mulai.getDate() + index)
    return tanggal
  })
}

/**
 * Kalender jatuh tempo tagihan.
 *
 * Yang digambar adalah tanggal jatuh tempo tagihan tiap kamar, bukan kalender
 * umum: pertanyaan pemilik setiap awal bulan adalah "kapan uangnya masuk", dan
 * kalender yang juga memuat hal lain tidak menjawabnya lebih cepat.
 *
 * Tagihan yang sudah lunas tetap ditandai, dengan nada berbeda. Menyembunyikannya
 * membuat tanggal yang sudah aman terlihat kosong, dan pemilik kehilangan cara
 * memeriksa bahwa tagihan bulan itu memang sudah ia terbitkan.
 */
export default function KalenderPage() {
  const { user, status } = useSession()
  const [data, setData] = useState<DashboardOwner | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState<string | null>(null)
  const [pesan, setPesan] = useState<{ nada: 'sukses' | 'bahaya'; teks: string } | null>(null)
  const [ditunjuk, setDitunjuk] = useState<string | null>(null)

  const sekarang = new Date()
  const [tahun, setTahun] = useState(sekarang.getFullYear())
  const [bulan, setBulan] = useState(sekarang.getMonth())

  const pemilik = user?.role === 'OWNER' || user?.role === 'ADMIN'

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchDashboardOwner())
  }, [])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || !pemilik) {
      setSiap(true)
      return
    }

    void fetchDashboardOwner().then((hasil) => {
      if (!aktif) return
      setData(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, pemilik])

  /** Kamar yang tagihannya jatuh tempo pada tiap tanggal. */
  const perTanggal = useMemo(() => {
    const peta = new Map<string, KamarPemilik[]>()

    for (const kamar of data?.kamar ?? []) {
      const kunci = tanggalLokal(kamar.dueDate)
      if (!kunci) continue

      const isi = peta.get(kunci) ?? []
      isi.push(kamar)
      peta.set(kunci, isi)
    }

    return peta
  }, [data])

  const kirimPengingat = async (kamar: KamarPemilik): Promise<void> => {
    if (!kamar.invoiceId) return

    setSibuk(kamar.invoiceId)
    setPesan(null)

    try {
      const hasil = await ingatkanTagihan(kamar.invoiceId)
      setPesan({
        nada: 'sukses',
        teks: `Pengingat terkirim ke ${hasil.ke} untuk kamar ${kamar.roomNumber}.`,
      })
    } catch (error) {
      setPesan({
        nada: 'bahaya',
        teks: error instanceof Error ? error.message : 'Pengingat tidak terkirim.',
      })
    } finally {
      setSibuk(null)
    }
  }

  const geserBulan = (arah: -1 | 1): void => {
    const berikut = new Date(tahun, bulan + arah, 1)
    setTahun(berikut.getFullYear())
    setBulan(berikut.getMonth())
    setDitunjuk(null)
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Masuk untuk membuka kalender
        </h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!pemilik) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Halaman ini untuk pemilik kos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kalender jatuh tempo berisi tagihan penghuni, jadi hanya terbuka untuk pemilik kos.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-semibold transition-colors hover:border-primary/40"
        >
          Kembali ke ringkasan
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyRow>
          Data tagihan belum bisa dimuat. Pastikan layanan API berjalan, lalu muat ulang halaman.
        </EmptyRow>
      </div>
    )
  }

  const kisi = kisiBulan(tahun, bulan)
  const kunciHariIni = kunciTanggal(sekarang)

  /** Tagihan bulan yang sedang ditampilkan, untuk ringkasan di atas kalender. */
  const awalBulan = kunciTanggal(new Date(tahun, bulan, 1))
  const akhirBulan = kunciTanggal(new Date(tahun, bulan + 1, 0))
  const bulanIni = (data.kamar ?? []).filter((kamar) => {
    const kunci = tanggalLokal(kamar.dueDate)
    return kunci !== null && kunci >= awalBulan && kunci <= akhirBulan
  })
  const belumLunasBulanIni = bulanIni.filter(
    (kamar) =>
      kamar.invoiceStatus !== null && BELUM_LUNAS.includes(kamar.invoiceStatus),
  )
  const nilaiBulanIni = belumLunasBulanIni.reduce(
    (jumlah, kamar) => jumlah + Math.max(0, (kamar.totalAmount ?? 0) - (kamar.paidAmount ?? 0)),
    0,
  )

  const daftarDitunjuk = ditunjuk ? (perTanggal.get(ditunjuk) ?? []) : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">
          Kalender jatuh tempo
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tanggal jatuh tempo tiap tagihan kamar. Klik satu tanggal untuk melihat kamar mana yang
          jatuh tempo di hari itu, lalu kirim pengingat ke penghuninya.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatKartu
          label={`Tagihan ${BULAN[bulan]}`}
          value={bulanIni.length}
          hint="Tagihan yang jatuh tempo bulan ini"
          icon={CalendarClock}
        />
        <StatKartu
          label="Belum lunas"
          value={belumLunasBulanIni.length}
          hint={`${formatRupiah(nilaiBulanIni)} masih berjalan`}
          icon={BellRing}
        />
        <StatKartu
          label="Hari ini"
          value={perTanggal.get(kunciHariIni)?.length ?? 0}
          hint={`Jatuh tempo ${formatTanggal(sekarang.toISOString())}`}
          icon={CalendarClock}
        />
      </div>

      {pesan && (
        <p
          role="status"
          className={cn(
            'mt-5 rounded-xl px-3 py-2.5 text-sm ring-1',
            pesan.nada === 'sukses'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-rose-50 text-rose-700 ring-rose-200',
          )}
        >
          {pesan.teks}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={`${BULAN[bulan]} ${tahun}`} description="Kalender dimulai hari Senin.">
          <div className="flex items-center justify-between gap-3 pb-3">
            <button
              type="button"
              onClick={() => geserBulan(-1)}
              aria-label="Bulan sebelumnya"
              className="grid size-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>

            <p className="text-sm font-medium">
              {BULAN[bulan]} {tahun}
            </p>

            <button
              type="button"
              onClick={() => geserBulan(1)}
              aria-label="Bulan berikutnya"
              className="grid size-9 place-items-center rounded-full border border-border transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {HARI.map((hari) => (
              <span key={hari} className="py-1.5">
                {hari}
              </span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {kisi.map((tanggal) => {
              const kunci = kunciTanggal(tanggal)
              const daftar = perTanggal.get(kunci) ?? []
              const bulanIniSendiri = tanggal.getMonth() === bulan
              const adaBelumLunas = daftar.some(
                (kamar) =>
                  kamar.invoiceStatus !== null && BELUM_LUNAS.includes(kamar.invoiceStatus),
              )
              const terpilih = ditunjuk === kunci

              return (
                <button
                  key={kunci}
                  type="button"
                  onClick={() => setDitunjuk(terpilih ? null : kunci)}
                  aria-pressed={terpilih}
                  aria-label={`${formatTanggal(tanggal.toISOString())}, ${daftar.length} tagihan jatuh tempo`}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1.5 text-xs transition-colors',
                    bulanIniSendiri ? 'text-foreground' : 'text-muted-foreground/50',
                    terpilih
                      ? 'border-primary bg-accent'
                      : 'border-border/60 hover:border-primary/40 hover:bg-accent/30',
                    kunci === kunciHariIni && !terpilih && 'border-primary/60',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-6 place-items-center rounded-full tabular-nums',
                      kunci === kunciHariIni && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    {tanggal.getDate()}
                  </span>

                  {daftar.length > 0 && (
                    <span className="flex flex-wrap items-center justify-center gap-0.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 rounded-full',
                          adaBelumLunas ? 'bg-rose-500' : 'bg-emerald-500',
                        )}
                      />
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {daftar.length}
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-rose-500" />
              Ada yang belum dibayar
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
              Semua sudah lunas
            </span>
            <span>Kotak bertanda angka memuat jumlah kamar yang jatuh tempo.</span>
          </div>
        </Panel>

        <Panel
          title={ditunjuk ? `Jatuh tempo ${formatTanggal(new Date(`${ditunjuk}T00:00:00`).toISOString())}` : 'Pilih satu tanggal'}
          description={
            ditunjuk
              ? 'Klik "Ingatkan" untuk mengirim notifikasi ke penghuni kamar itu.'
              : 'Tanggal yang punya tagihan ditandai titik berwarna.'
          }
        >
          {!ditunjuk ? (
            <EmptyRow>
              Belum ada tanggal yang dipilih. Klik salah satu tanggal di kalender untuk melihat
              tagihan yang jatuh tempo hari itu.
            </EmptyRow>
          ) : daftarDitunjuk.length === 0 ? (
            <EmptyRow>Tidak ada tagihan yang jatuh tempo pada tanggal ini.</EmptyRow>
          ) : (
            <ul className="flex flex-col gap-3">
              {daftarDitunjuk.map((kamar) => {
                const belumLunas =
                  kamar.invoiceStatus !== null && BELUM_LUNAS.includes(kamar.invoiceStatus)
                const sisa = Math.max(0, (kamar.totalAmount ?? 0) - (kamar.paidAmount ?? 0))

                return (
                  <li key={kamar.id} className="rounded-xl border border-border p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {kamar.propertyName}, kamar {kamar.roomNumber}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {kamar.tenantName ?? 'Belum ada penghuni'}
                        </p>
                      </div>

                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          belumLunas
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {belumLunas ? `Sisa ${formatRupiah(sisa)}` : 'Lunas'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      {kamar.invoiceNumber ?? 'Belum ada tagihan'}
                      {kamar.totalAmount !== null ? ` · ${formatRupiah(kamar.totalAmount)}` : ''}
                    </p>

                    {belumLunas && kamar.invoiceId && (
                      <button
                        type="button"
                        disabled={sibuk === kamar.invoiceId}
                        onClick={() => void kirimPengingat(kamar)}
                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60"
                      >
                        {sibuk === kamar.invoiceId ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <BellRing className="size-3.5" aria-hidden="true" />
                        )}
                        Ingatkan
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={() => void muat()}
            className="mt-4 text-xs font-medium text-primary transition-colors hover:text-primary-strong"
          >
            Muat ulang data tagihan
          </button>
        </Panel>
      </div>
    </div>
  )
}
