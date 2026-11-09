'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatCard } from '@/components/dashboard/kit'
import {
  catatBiaya,
  fetchBiaya,
  fetchRingkasanKeuangan,
  hapusBiaya,
  KATEGORI_BIAYA,
  labelKategoriBiaya,
  type Biaya,
  type DaftarBiaya,
  type KategoriBiaya,
  type RingkasanKeuangan,
} from '@/lib/expenses'
import { fetchMyProperties, type PropertiKelola } from '@/lib/my-properties'
import { formatRupiah, formatTanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Keuangan properti pemilik.
 *
 * Dua hal ditampilkan sekaligus karena keduanya menjawab satu pertanyaan yang
 * sama: ringkasan bulanan menjawab "bagaimana usaha ini berjalan", daftar
 * pengeluaran menjawab "uangnya ke mana". Memisahkannya ke dua halaman membuat
 * pemilik harus berpindah bolak-balik untuk hal yang ia pikirkan bersamaan.
 *
 * Pemasukan yang ditampilkan adalah uang yang SUDAH masuk, bukan tagihan yang
 * terbit. Tagihan yang belum dibayar ditampilkan terpisah sebagai "belum lunas"
 * justru supaya bedanya terlihat: pemilik yang mengira tagihan terbit sudah
 * jadi pemasukan akan membelanjakan sesuatu yang belum ada.
 *
 * Halaman ini hanya untuk pemilik. Penghuni tidak punya pengeluaran properti
 * untuk dicatat, dan server menolaknya juga.
 */

/** Panjang deret bulan yang ditampilkan. Tiga bulan cukup untuk melihat arah. */
const PILIHAN_BULAN = [3, 6, 12]

export default function KeuanganPage() {
  const { user, status } = useSession()
  const [properti, setProperti] = useState<PropertiKelola[]>([])
  const [daftar, setDaftar] = useState<DaftarBiaya | null>(null)
  const [ringkasan, setRingkasan] = useState<RingkasanKeuangan | null>(null)
  const [bulan, setBulan] = useState(6)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  // Isian formulir.
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState<KategoriBiaya>('LISTRIK_AIR')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [tanggal, setTanggal] = useState('')

  const pemilik = user?.role === 'OWNER' || user?.role === 'ADMIN'

  const muat = useCallback(async (): Promise<void> => {
    const [biaya, rangkuman] = await Promise.all([fetchBiaya(), fetchRingkasanKeuangan(bulan)])
    setDaftar(biaya)
    setRingkasan(rangkuman)
  }, [bulan])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      setSiap(true)
      return
    }

    void Promise.all([fetchMyProperties(), fetchBiaya(), fetchRingkasanKeuangan(bulan)]).then(
      ([kos, biaya, rangkuman]) => {
        if (!aktif) return

        const daftarKos = kos ?? []
        setProperti(daftarKos)
        setPropertyId(daftarKos[0]?.id ?? '')
        setDaftar(biaya)
        setRingkasan(rangkuman)
        setSiap(true)
      },
    )

    return () => {
      aktif = false
    }
  }, [status, user, bulan])

  const simpan = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const nominal = Number(amount)
    if (!propertyId) {
      setPesan('Pilih dulu properti yang pengeluarannya dicatat.')
      return
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      setPesan('Jumlah harus lebih dari nol.')
      return
    }

    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      await catatBiaya({
        propertyId,
        category,
        amount: Math.round(nominal),
        description: description.trim() || undefined,
        // Tanggal kosong berarti hari ini; server yang mengisinya, supaya
        // tanggalnya tidak bergantung jam perangkat yang membukanya.
        date: tanggal ? new Date(`${tanggal}T00:00:00`).toISOString() : undefined,
      })

      setAmount('')
      setDescription('')
      setTanggal('')
      await muat()
      setSukses('Pengeluaran tercatat dan ringkasannya sudah diperbarui.')
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Pengeluaran tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  const hapus = async (item: Biaya): Promise<void> => {
    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      await hapusBiaya(item.id)
      await muat()
      setSukses('Catatan pengeluaran dihapus.')
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Catatan tidak terhapus')
    } finally {
      setSibuk(false)
    }
  }

  /**
   * Skala grafik batang, dihitung dari nilai terbesar yang muncul.
   *
   * Batangnya digambar relatif terhadap nilai terbesar itu, bukan terhadap
   * angka tetap: rentang pemasukan kos kecil dan besar berbeda jauh, dan skala
   * tetap akan membuat seluruh batang tampak rata di salah satunya.
   */
  const nilaiTerbesar = useMemo(() => {
    if (!ringkasan) return 0
    const semua = ringkasan.bulanan.flatMap((item) => [item.pemasukan, item.pengeluaran])
    return Math.max(1, ...semua)
  }, [ringkasan])

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="h-8 w-52 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka keuangan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Catatan pemasukan dan pengeluaran terikat ke properti Anda, jadi hanya bisa dibuka
          pemiliknya.
        </p>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!pemilik) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Halaman ini untuk pemilik kos</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Pembukuan ini mencatat biaya operasional properti, dan itu urusan pemiliknya. Tagihan
          sewa Anda sendiri ada di halaman tagihan.
        </p>
        <Link
          href="/tagihan"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buka tagihan saya
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Keuangan properti</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Uang yang sudah masuk, biaya operasional, dan selisihnya. Pemasukan dihitung dari
            pembayaran yang berhasil, bukan dari tagihan yang terbit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PILIHAN_BULAN.map((jumlah) => (
            <button
              key={jumlah}
              type="button"
              onClick={() => setBulan(jumlah)}
              aria-pressed={bulan === jumlah}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                bulan === jumlah
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {jumlah} bulan
            </button>
          ))}
        </div>
      </header>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      {sukses && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          {sukses}
        </p>
      )}

      {ringkasan === null ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          Ringkasan keuangan belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang
          halaman.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pemasukan"
              value={formatRupiah(ringkasan.totalPemasukan)}
              hint={`${bulan} bulan terakhir`}
            />
            <StatCard
              label="Pengeluaran"
              value={formatRupiah(ringkasan.totalPengeluaran)}
              hint={`${ringkasan.perKategori.length} kategori terpakai`}
            />
            <StatCard
              label="Selisih"
              value={formatRupiah(ringkasan.selisih)}
              hint="Pemasukan dikurangi pengeluaran"
            />
            <StatCard
              label="Belum lunas"
              value={formatRupiah(ringkasan.belumLunas)}
              hint={`${ringkasan.jumlahTagihanBelumLunas} tagihan belum dibayar`}
            />
          </div>

          {/* Grafik batang per bulan. Angka tiap bulannya ikut tertulis di
              bawah kolomnya: grafik tanpa angka memaksa pembacanya menaksir. */}
          <div className="mt-6">
            <Panel
              title="Per bulan"
              description="Bulan tanpa transaksi tetap tampil dengan nilai nol."
            >
              <ul className="space-y-3">
                {ringkasan.bulanan.map((item) => (
                  <li key={item.bulan}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold">{labelBulan(item.bulan)}</span>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          item.selisih < 0 ? 'text-rose-600' : 'text-emerald-700',
                        )}
                      >
                        {item.selisih < 0 ? '-' : '+'}
                        {formatRupiah(Math.abs(item.selisih))}
                      </span>
                    </div>

                    <div className="mt-1.5 space-y-1">
                      <Batang
                        label="Masuk"
                        nilai={item.pemasukan}
                        terbesar={nilaiTerbesar}
                        warna="bg-emerald-500"
                      />
                      <Batang
                        label="Keluar"
                        nilai={item.pengeluaran}
                        terbesar={nilaiTerbesar}
                        warna="bg-rose-400"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {ringkasan.perKategori.length > 0 && (
            <div className="mt-6">
              <Panel
                title="Pengeluaran per kategori"
                description={`Sepanjang ${bulan} bulan terakhir.`}
              >
                <ul className="divide-y divide-border">
                  {ringkasan.perKategori.map((item) => (
                    <li
                      key={item.category}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{labelKategoriBiaya(item.category)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.jumlahBaris} catatan
                        </p>
                      </div>
                      <span className="text-sm font-semibold">{formatRupiah(item.jumlah)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}

      {/* Formulir pencatatan */}
      {properti.length === 0 ? (
        <div className="mt-6">
          <EmptyRow>
            Belum ada properti di akun ini. Catatan pengeluaran melekat pada properti, jadi
            tambahkan properti dulu.
          </EmptyRow>
          <div className="mt-4 text-center">
            <Link
              href="/properti/baru"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
            >
              <Plus className="size-4" aria-hidden="true" />
              Tambah properti
            </Link>
          </div>
        </div>
      ) : (
        <form
          onSubmit={simpan}
          className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Catat pengeluaran</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Biaya operasional yang Anda keluarkan sendiri, bukan tagihan untuk penghuni.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Properti</span>
              <select
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {properti.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Kategori</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as KategoriBiaya)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {KATEGORI_BIAYA.map((item) => (
                  <option key={item.nilai} value={item.nilai}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium">Jumlah (Rp)</span>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Mis. 350000"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium">
                Tanggal <span className="text-muted-foreground">(opsional)</span>
              </span>
              <input
                type="date"
                value={tanggal}
                onChange={(event) => setTanggal(event.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-[11px] text-muted-foreground">
                Dikosongkan berarti hari ini.
              </span>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-medium">
              Keterangan <span className="text-muted-foreground">(opsional)</span>
            </span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              placeholder="Mis. token listrik dan PDAM bulan November"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <button
            type="submit"
            disabled={sibuk}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {sibuk ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Catat pengeluaran
          </button>
        </form>
      )}

      {/* Daftar pengeluaran */}
      <div className="mt-6">
        <Panel title="Pengeluaran" description="Terbaru lebih dulu.">
          {daftar === null ? (
            <EmptyRow>
              Catatan pengeluaran belum bisa dimuat. Periksa koneksi ke layanan API, lalu muat ulang
              halaman.
            </EmptyRow>
          ) : daftar.items.length === 0 ? (
            <EmptyRow>
              Belum ada pengeluaran yang tercatat. Biaya listrik, air, perbaikan, dan pajak yang
              Anda keluarkan dicatat lewat formulir di atas.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {daftar.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{labelKategoriBiaya(item.category)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.propertyName} · {formatTanggal(item.date)}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatRupiah(item.amount)}</span>
                    <button
                      type="button"
                      onClick={() => void hapus(item)}
                      disabled={sibuk}
                      aria-label={`Hapus pengeluaran ${labelKategoriBiaya(item.category)}`}
                      title="Hapus"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600 disabled:opacity-60"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {daftar !== null && daftar.meta.total > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {daftar.meta.total} catatan, seluruhnya {formatRupiah(daftar.meta.totalPengeluaran)}.
            </p>
          )}
        </Panel>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Angka &ldquo;belum lunas&rdquo; adalah tagihan yang belum dibayar penghuni. Uang itu belum
        jadi pemasukan sampai masuk, jadi tidak dihitung di kolom pemasukan.
      </p>
    </div>
  )
}

/** "2026-11" menjadi "Nov 2026". */
function labelBulan(nilai: string): string {
  const [tahun, bulan] = nilai.split('-')
  const nama = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ]
  const indeks = Number(bulan) - 1
  return `${nama[indeks] ?? bulan} ${tahun}`
}

/** Satu batang grafik, dengan angkanya tertulis di sebelah labelnya. */
function Batang({
  label,
  nilai,
  terbesar,
  warna,
}: {
  label: string
  nilai: number
  terbesar: number
  warna: string
}) {
  const lebar = Math.round((nilai / terbesar) * 100)

  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full', warna)}
          style={{ width: `${Math.max(nilai > 0 ? 2 : 0, lebar)}%` }}
        />
      </span>
      <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
        {nilai > 0 ? formatRupiah(nilai) : '—'}
      </span>
    </div>
  )
}
