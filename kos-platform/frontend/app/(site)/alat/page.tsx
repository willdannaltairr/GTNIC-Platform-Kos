import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calculator,
  ClipboardCheck,
  Navigation,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { JudulHalaman, MataSeksi, Seksi } from '@/components/site/kerangka'

export const metadata: Metadata = {
  title: 'Alat',
  description:
    'Alat bantu memilih kos: skor kecocokan KosMatch, simulasi biaya total, perbandingan kos, rute dan sekitar, serta catatan kondisi kamar.',
}

interface Alat {
  href: string
  label: string
  ringkas: string
  keterangan: string
  icon: LucideIcon
}

/**
 * Alat yang benar-benar bisa dipakai.
 *
 * Daftar ini sengaja hanya memuat yang sudah jadi. Alat yang belum selesai
 * tidak ditampilkan sebagai "segera hadir": menu yang menjanjikan halaman
 * kosong membuat pengunjung menebak-nebak mana yang nyata, dan yang paling
 * sering ia tebak salah adalah yang paling menggoda.
 */
const ALAT: Alat[] = [
  {
    href: '/kosmatch',
    label: 'KosMatch',
    ringkas: 'Skor kecocokan yang bisa Anda periksa',
    keterangan:
      'Isi anggaran, lokasi tujuan, dan fasilitas yang Anda butuhkan. Setiap hasil membawa rincian per faktor beserta bobotnya, dan faktor yang Anda kosongkan tidak dihitung sebagai nol.',
    icon: Sparkles,
  },
  {
    href: '/kos',
    label: 'Simulasi biaya total',
    ringkas: 'Bukan hanya harga sewa bulanan',
    keterangan:
      'Buka kos mana pun, lalu lihat rincian biaya bulanan dan biaya masuknya: sewa, listrik, air, internet, deposit, dan biaya sekali bayar lain, dipisahkan antara yang sudah pasti dan yang masih perkiraan.',
    icon: Calculator,
  },
  {
    href: '/bandingkan',
    label: 'Bandingkan kos',
    ringkas: 'Dua sampai empat kos berdampingan',
    keterangan:
      'Tandai kos dari halaman pencarian, lalu bandingkan harga, fasilitas, dan biaya totalnya dalam satu tabel. Daftar pilihannya tersimpan di peramban Anda sendiri.',
    icon: Scale,
  },
  {
    href: '/beranda#rute',
    label: 'Rute dan sekitar',
    ringkas: 'Dari lokasi Anda ke lokasi tujuan',
    keterangan:
      'Tentukan titik asal dan tujuan, misalnya dari rumah Anda sekarang ke kampus. Yang tampil adalah kos dalam radius jarak yang masuk akal ditempuh harian, beserta jaraknya dari kedua titik.',
    icon: Navigation,
  },
  {
    href: '/kondisi-kamar',
    label: 'Catatan kondisi kamar',
    ringkas: 'Room Passport saat masuk dan keluar',
    keterangan:
      'Dokumentasikan keadaan kamar berisi foto dan butir periksa, lalu mintakan persetujuan pemilik. Catatan yang sama dipakai saat masuk dan saat keluar, sehingga tidak ada yang bergantung pada ingatan.',
    icon: ClipboardCheck,
  },
]

/**
 * Halaman alat.
 *
 * Mengumpulkan alat bantu yang sebelumnya tersebar: KosMatch dan Bandingkan
 * sudah punya halamannya sendiri, sedangkan simulasi biaya dan rute hanya hidup
 * di dalam halaman lain dan tidak pernah dijelaskan di satu tempat. Di sini
 * kelimanya dijelaskan apa adanya, termasuk di mana harus membukanya.
 */
export default function AlatPage() {
  return (
    <>
      <Seksi garis={false}>
        <JudulHalaman
          eyebrow="Alat"
          title="Alat untuk memilih dengan angka, bukan firasat"
          description="Kelima alat ini sudah bisa dipakai sekarang. Tidak ada yang masih berupa janji di daftar ini, dan tiap alat menyebut apa yang benar-benar dihitungnya."
        />
      </Seksi>

      <Seksi>
        <ul className="grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {ALAT.map((alat) => {
            const Icon = alat.icon

            return (
              <li key={alat.href} className="bg-card">
                <Link
                  href={alat.href}
                  className="group flex h-full flex-col p-6 transition-colors hover:bg-accent/40 sm:p-7"
                >
                  <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>

                  <span className="mt-5 block text-lg font-semibold tracking-tight">
                    {alat.label}
                  </span>

                  <span className="mt-1 block text-[13px] font-medium text-primary">
                    {alat.ringkas}
                  </span>

                  <span className="mt-3 block text-sm leading-[1.75] text-muted-foreground">
                    {alat.keterangan}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </Seksi>

      {/* Pita gelap: satu bagian yang sengaja berhenti dari halaman yang
          seluruhnya terang, dipakai untuk prinsip yang berlaku bagi kelima alat
          di atas. */}
      <Seksi nada="gelap">
        <div className="max-w-3xl">
          <MataSeksi tone="dark">Prinsip</MataSeksi>

          <h2 className="mt-3 text-balance font-heading text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            Setiap angka bisa Anda telusuri asalnya.
          </h2>

          <p className="mt-4 text-[15px] leading-[1.8] text-primary-foreground/80">
            KosMatch menampilkan bobot tiap faktornya, Simulasi Biaya memisahkan
            komponen yang sudah dikonfirmasi pemilik dari yang masih perkiraan,
            dan harga di seluruh platform datang dari data properti yang
            dikelola pemiliknya sendiri. Kalau sebuah angka tidak bisa
            dipertanggungjawabkan, angka itu tidak kami tampilkan.
          </p>
        </div>
      </Seksi>
    </>
  )
}
