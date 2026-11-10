'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Calculator, Info, Loader2, LocateFixed, Search } from 'lucide-react'
import { KartuKecocokan } from '@/components/kosmatch/kartu-kecocokan'
import { EmptyRow, Panel } from '@/components/dashboard/kit'
import { FACILITY_FILTERS, LOCATIONS, TYPE_OPTIONS } from '@/lib/constants'
import { fetchKosMatch, type HasilPencarianKosMatch, type PreferensiInput } from '@/lib/kosmatch'
import { cn } from '@/lib/utils'

/**
 * KosMatch: kos yang paling cocok menurut preferensi yang diisi pengunjung.
 *
 * Halaman ini sengaja menampilkan rumusnya di atas hasil, bukan menyembunyikan
 * cara kerjanya di balik satu angka. Skor kecocokan hanya berguna kalau
 * penggunanya bisa memeriksa dari mana angkanya datang, dan seluruh kalimat
 * penjelasannya dikirim server apa adanya supaya yang tampil di layar tidak
 * pernah bisa berbeda dari yang benar-benar dihitung.
 *
 * Pengisian preferensinya tidak dipecah menjadi beberapa langkah. Formulirnya
 * pendek, dan memecahnya justru menyembunyikan hubungan antar pilihan: anggaran
 * yang diisi sambil melihat fasilitasnya membuat penggunanya tahu mana yang
 * harus ia relakan.
 */

type Keadaan =
  | { tahap: 'diam' }
  | { tahap: 'memuat' }
  | { tahap: 'siap'; hasil: HasilPencarianKosMatch }
  | { tahap: 'gagal' }

/** Pilihan kapasitas kamar yang ditawarkan; server membatasi 1 sampai 10. */
const KAPASITAS = [1, 2, 3, 4]

const pesanGalat = (error: GeolocationPositionError): string => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Izin lokasi ditolak. Isi kota tujuan sebagai gantinya, atau buka setelan izin situs.'
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Lokasi perangkat tidak tersedia. Isi kota tujuan sebagai gantinya.'
  }
  return 'Pencarian lokasi memakan waktu terlalu lama. Coba lagi sebentar lagi.'
}

export default function KosMatchPage() {
  const [anggaran, setAnggaran] = useState('')
  const [kota, setKota] = useState('')
  const [titik, setTitik] = useState<{ lat: number; lng: number } | null>(null)
  const [mencariLokasi, setMencariLokasi] = useState(false)
  const [pesanLokasi, setPesanLokasi] = useState<string | null>(null)
  const [fasilitas, setFasilitas] = useState<string[]>([])
  const [kamarMandi, setKamarMandi] = useState('')
  const [kapasitas, setKapasitas] = useState('')
  const [jenisKelamin, setJenisKelamin] = useState('')
  const [keadaan, setKeadaan] = useState<Keadaan>({ tahap: 'diam' })

  const pakaiLokasi = useCallback((): void => {
    if (!('geolocation' in navigator)) {
      setPesanLokasi('Peramban ini tidak menyediakan lokasi. Isi kota tujuan sebagai gantinya.')
      return
    }

    setMencariLokasi(true)
    setPesanLokasi(null)

    navigator.geolocation.getCurrentPosition(
      (posisi) => {
        setTitik({ lat: posisi.coords.latitude, lng: posisi.coords.longitude })
        setMencariLokasi(false)
      },
      (error) => {
        setPesanLokasi(pesanGalat(error))
        setMencariLokasi(false)
      },
      // Akurasi tinggi tidak diminta: untuk mengukur jarak kos dalam kilometer,
      // perkiraan dari jaringan sudah memadai dan jauh lebih cepat selesai.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  const cari = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setKeadaan({ tahap: 'memuat' })

    const input: PreferensiInput = {
      facilities: fasilitas,
      limit: 12,
    }

    const angka = Number(anggaran)
    if (anggaran.trim() !== '' && Number.isFinite(angka) && angka > 0) input.maxPrice = angka
    if (kota.trim() !== '') input.city = kota.trim()
    if (titik) {
      input.nearLat = titik.lat
      input.nearLng = titik.lng
    }
    if (kamarMandi === 'private' || kamarMandi === 'shared') input.bathroomType = kamarMandi
    if (kapasitas !== '') input.minOccupants = Number(kapasitas)
    if (jenisKelamin === 'putra' || jenisKelamin === 'putri' || jenisKelamin === 'campur') {
      input.genderPolicy = jenisKelamin
    }

    const hasil = await fetchKosMatch(input)
    setKeadaan(hasil === null ? { tahap: 'gagal' } : { tahap: 'siap', hasil })
  }

  const adaPreferensi =
    anggaran.trim() !== '' ||
    kota.trim() !== '' ||
    titik !== null ||
    fasilitas.length > 0 ||
    kamarMandi !== '' ||
    kapasitas !== '' ||
    jenisKelamin !== ''

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-accent-foreground">
          <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
          KosMatch
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Kos paling cocok, beserta alasan angkanya
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Isi sebisanya. Faktor yang Anda kosongkan tidak dihitung dan tidak dianggap nol, jadi
          skornya selalu menggambarkan hal yang benar-benar Anda minta. Setiap hasil membawa rincian
          tiap faktornya, dan Anda bisa memeriksa sendiri dari mana persentasenya datang.
        </p>
      </header>

      <form
        onSubmit={cari}
        aria-label="Preferensi KosMatch"
        className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="match-anggaran" className="text-sm font-semibold text-foreground">
              Anggaran bulanan
            </label>
            <input
              id="match-anggaran"
              type="number"
              min={0}
              step={50000}
              inputMode="numeric"
              value={anggaran}
              onChange={(event) => setAnggaran(event.target.value)}
              placeholder="Contoh: 1500000"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Kos yang harganya sedikit di atas anggaran masih dipertimbangkan, tetapi nilainya
              turun dan alasannya ditulis di kartunya.
            </p>
          </div>

          <div>
            <label htmlFor="match-kota" className="text-sm font-semibold text-foreground">
              Kota tujuan
            </label>
            <input
              id="match-kota"
              list="match-kota-pilihan"
              value={kota}
              onChange={(event) => setKota(event.target.value)}
              placeholder="Contoh: Sleman"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <datalist id="match-kota-pilihan">
              {LOCATIONS.map((lokasi) => (
                <option key={lokasi.city} value={lokasi.city} />
              ))}
            </datalist>
          </div>

          <div>
            <span className="text-sm font-semibold text-foreground">Titik acuan jarak</span>
            <div className="mt-2">
              <button
                type="button"
                onClick={pakaiLokasi}
                disabled={mencariLokasi}
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60',
                  titik
                    ? 'border-primary bg-secondary text-accent-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {mencariLokasi ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                )}
                {titik ? 'Lokasi saya terpasang' : 'Pakai lokasi saya'}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {pesanLokasi ??
                (titik
                  ? 'Jarak tiap kos diukur dari titik ini, dan titiknya tidak disimpan di server.'
                  : 'Tanpa titik acuan, faktor lokasi tidak dihitung.')}
            </p>
          </div>

          <div>
            <label htmlFor="match-kamar-mandi" className="text-sm font-semibold text-foreground">
              Kamar mandi
            </label>
            <select
              id="match-kamar-mandi"
              value={kamarMandi}
              onChange={(event) => setKamarMandi(event.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Tidak dipilih</option>
              <option value="private">Kamar mandi dalam</option>
              <option value="shared">Kamar mandi luar</option>
            </select>
          </div>

          <div>
            <label htmlFor="match-kapasitas" className="text-sm font-semibold text-foreground">
              Cukup untuk
            </label>
            <select
              id="match-kapasitas"
              value={kapasitas}
              onChange={(event) => setKapasitas(event.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Tidak dipilih</option>
              {KAPASITAS.map((orang) => (
                <option key={orang} value={orang}>
                  {orang} orang
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="match-jenis" className="text-sm font-semibold text-foreground">
              Jenis kos
            </label>
            <select
              id="match-jenis"
              value={jenisKelamin}
              onChange={(event) => setJenisKelamin(event.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
            >
              <option value="">Tidak dipilih</option>
              {TYPE_OPTIONS.map((opsi) => (
                <option
                  key={opsi.value}
                  value={
                    opsi.value === 'KOS_PUTRA'
                      ? 'putra'
                      : opsi.value === 'KOS_PUTRI'
                        ? 'putri'
                        : 'campur'
                  }
                >
                  {opsi.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-5 border-t border-border pt-5">
          <legend className="text-sm font-semibold text-foreground">Fasilitas yang dibutuhkan</legend>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5">
            {FACILITY_FILTERS.map((item) => (
              <label
                key={item.slug}
                className="flex items-center gap-2.5 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  value={item.slug}
                  checked={fasilitas.includes(item.slug)}
                  onChange={(event) =>
                    setFasilitas((lama) =>
                      event.target.checked
                        ? [...lama, item.slug]
                        : lama.filter((slug) => slug !== item.slug),
                    )
                  }
                  className="h-4 w-4 rounded border-input accent-[var(--primary)]"
                />
                {item.label}
              </label>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Skor fasilitasnya adalah bagian yang tersedia dari yang Anda centang. Fasilitas kamar
            maupun properti dihitung sama.
          </p>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="submit"
            disabled={keadaan.tahap === 'memuat'}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
          >
            {keadaan.tahap === 'memuat' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            {keadaan.tahap === 'memuat' ? 'Menghitung…' : 'Cari yang cocok'}
          </button>

          {adaPreferensi && (
            <button
              type="button"
              onClick={() => {
                setAnggaran('')
                setKota('')
                setTitik(null)
                setPesanLokasi(null)
                setFasilitas([])
                setKamarMandi('')
                setKapasitas('')
                setJenisKelamin('')
                setKeadaan({ tahap: 'diam' })
              }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Kosongkan
            </button>
          )}
        </div>
      </form>

      <div className="mt-8">
        {keadaan.tahap === 'diam' && (
          <EmptyRow>
            Isi preferensi Anda lalu tekan Cari yang cocok. Yang sudah terisi tidak perlu lengkap:
            skornya menyesuaikan diri dengan yang Anda isi.
          </EmptyRow>
        )}

        {keadaan.tahap === 'memuat' && (
          <div className="grid gap-4" aria-live="polite">
            <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            <div className="h-56 animate-pulse rounded-2xl bg-muted" />
          </div>
        )}

        {keadaan.tahap === 'gagal' && (
          <EmptyRow>
            Hasilnya belum bisa dihitung. Periksa koneksi ke layanan API, lalu tekan Cari yang cocok
            sekali lagi.
          </EmptyRow>
        )}

        {keadaan.tahap === 'siap' && (
          <div className="grid gap-5">
            <Panel
              title="Cara angka ini dihitung"
              description="Ditampilkan apa adanya dari server yang menghitungnya."
            >
              <div className="grid gap-3 px-1 py-1">
                <p className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {keadaan.hasil.meta.rumus}
                </p>

                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  {Object.entries(keadaan.hasil.meta.bobot).map(([id, bobot]) => {
                    const dipakai = keadaan.hasil.meta.faktorTidakDiminta.every(
                      (faktor) => faktor.id !== id,
                    )

                    return (
                      <li
                        key={id}
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          dipakai ? 'text-foreground' : 'text-muted-foreground line-through',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'size-2 rounded-full',
                            dipakai ? 'bg-primary' : 'bg-muted-foreground/30',
                          )}
                        />
                        {id} {bobot}
                      </li>
                    )
                  })}
                </ul>

                {keadaan.hasil.meta.faktorTidakDiminta.length > 0 && (
                  <ul className="grid gap-1.5 rounded-xl bg-muted px-3.5 py-3">
                    {keadaan.hasil.meta.faktorTidakDiminta.map((faktor) => (
                      <li key={faktor.id} className="text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-medium text-foreground">{faktor.label}:</span>{' '}
                        {faktor.sebab}
                      </li>
                    ))}
                  </ul>
                )}

                {keadaan.hasil.meta.batasAnggaran && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {keadaan.hasil.meta.batasAnggaran}
                  </p>
                )}

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Skor adalah estimasi kecocokan dengan yang Anda minta, bukan penilaian mutu kosnya.
                  Angka seperti harga dan ketersediaan tetap berasal dari data pemiliknya, dan yang
                  terakhir dikonfirmasi bisa berubah.
                </p>
              </div>
            </Panel>

            <p className="text-sm text-muted-foreground">
              {keadaan.hasil.items.length === 0
                ? 'Tidak ada kos yang lolos penyaring preferensi Anda.'
                : `${keadaan.hasil.meta.total} kos lolos penyaring, ${keadaan.hasil.meta.ditampilkan} teratas ditampilkan di bawah.`}
            </p>

            {keadaan.hasil.items.length === 0 ? (
              <EmptyRow>
                Coba longgarkan anggarannya, kurangi fasilitas yang diminta, atau ganti kotanya.
                Penyaring yang terlalu ketat memang menyisakan sedikit pilihan.
              </EmptyRow>
            ) : (
              <div className="grid gap-4">
                {keadaan.hasil.items.map((hasil, index) => (
                  <KartuKecocokan key={hasil.id} hasil={hasil} peringkat={index + 1} />
                ))}
              </div>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Ingin membandingkan beberapa pilihan sekaligus?{' '}
              <Link href="/bandingkan" className="font-medium text-primary hover:underline">
                Buka halaman bandingkan
              </Link>{' '}
              setelah menandai kosnya.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
