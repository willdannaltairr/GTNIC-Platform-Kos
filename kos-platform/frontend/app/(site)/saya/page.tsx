'use client'

import Link from 'next/link'
import {
  Bell,
  Bookmark,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Scale,
  ShieldCheck,
  Star,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { JudulHalaman, MataSeksi, Seksi, TOMBOL_UTAMA } from '@/components/site/kerangka'

interface Tautan {
  href: string
  label: string
  keterangan: string
  icon: LucideIcon
}

interface Kelompok {
  judul: string
  ringkas: string
  tautan: Tautan[]
}

/**
 * Isi halaman "Saya", dikelompokkan menurut kapan dipakai.
 *
 * Sebelumnya ketiga belas tautan ini berjejal di satu panel menu turun, dan
 * yang paling sering dicari, tagihan dan pesan, berada di antara yang paling
 * jarang disentuh. Di sini urutannya mengikuti saat dipakai: yang sedang
 * berjalan lebih dulu, lalu yang dibuka sesekali, lalu pengaturan.
 *
 * Yang tampil sama untuk semua peran; halaman tujuannya sendiri yang menyaring
 * peran dan menampilkan penjelasan bila sebuah halaman bukan untuk peran itu.
 * Menyembunyikan tautannya di sini akan membuat pemilik kos mengira fiturnya
 * hilang.
 */
const KELOMPOK: Kelompok[] = [
  {
    judul: 'Sedang berjalan',
    ringkas: 'Hal yang menunggu tindakan Anda atau sedang berlangsung.',
    tautan: [
      { href: '/tagihan', label: 'Tagihan', keterangan: 'Yang perlu dibayar', icon: Receipt },
      { href: '/pesan', label: 'Pesan', keterangan: 'Percakapan dengan pemilik atau penghuni', icon: MessageSquare },
      { href: '/perbaikan', label: 'Perbaikan', keterangan: 'Laporan kerusakan dan penanganannya', icon: Wrench },
      { href: '/kontrak', label: 'Kontrak sewa', keterangan: 'Kesepakatan yang sedang berlaku', icon: FileText },
    ],
  },
  {
    judul: 'Pilihan dan rencana',
    ringkas: 'Kos yang Anda simpan, bandingkan, atau rencanakan untuk disurvei.',
    tautan: [
      { href: '/pencarian-tersimpan', label: 'Pencarian tersimpan', keterangan: 'Diberi tahu saat ada kos baru cocok', icon: Bookmark },
      { href: '/bandingkan', label: 'Bandingkan kos', keterangan: 'Dua sampai empat kos berdampingan', icon: Scale },
      { href: '/booking', label: 'Booking', keterangan: 'Pengajuan sewa dan statusnya', icon: CalendarCheck },
      { href: '/kunjungan', label: 'Jadwal kunjungan', keterangan: 'Rencana survei kos', icon: Home },
    ],
  },
  {
    judul: 'Catatan dan penilaian',
    ringkas: 'Yang tercatat selama Anda menempati sebuah kos.',
    tautan: [
      { href: '/kondisi-kamar', label: 'Kondisi kamar', keterangan: 'Catatan masuk dan keluar', icon: ClipboardCheck },
      { href: '/ulasan', label: 'Ulasan', keterangan: 'Penilaian Anda atas kos yang pernah ditinggali', icon: Star },
      { href: '/notifikasi', label: 'Notifikasi', keterangan: 'Pemberitahuan yang belum dibaca', icon: Bell },
    ],
  },
  {
    judul: 'Sebagai pemilik',
    ringkas: 'Kelola properti, kamar, dan keuangannya. Halaman ini terbuka untuk akun pemilik kos.',
    tautan: [
      { href: '/properti', label: 'Properti saya', keterangan: 'Daftar kos beserta kamarnya', icon: Building2 },
      { href: '/keuangan', label: 'Keuangan', keterangan: 'Pemasukan dan biaya operasional', icon: CreditCard },
      { href: '/verifikasi', label: 'Verifikasi pemilik', keterangan: 'Dokumen identitas dan kepemilikan', icon: ShieldCheck },
    ],
  },
  {
    judul: 'Akun',
    ringkas: 'Data diri dan ringkasan aktivitas Anda.',
    tautan: [
      { href: '/profil', label: 'Profil saya', keterangan: 'Nama, kontak, dan status akun', icon: UserRound },
      { href: '/dashboard', label: 'Dashboard', keterangan: 'Ringkasan sewa dan tagihan', icon: LayoutDashboard },
    ],
  },
]

/**
 * Halaman "Saya".
 *
 * Satu halaman untuk seluruh tautan milik akun, menggantikan panel menu turun
 * yang isinya tiga belas tautan tanpa keterangan. Tiap tautan di sini membawa
 * satu baris penjelasan, sehingga pengunjung baru tidak perlu menebak apa isi
 * "Room Passport" atau "Kondisi kamar" sebelum membukanya.
 */
export default function SayaPage() {
  const { user, status } = useSession()
  const namaDepan = user?.full_name?.split(/\s+/)[0]

  return (
    <>
      <Seksi garis={false}>
        <JudulHalaman
          eyebrow="Akun saya"
          title={namaDepan ? `Halo, ${namaDepan}` : 'Semua milik Anda, di satu tempat'}
          description={
            status === 'memuat'
              ? 'Menyiapkan ringkasan akun Anda.'
              : user
                ? 'Tautan di bawah menuju isi akun Anda. Halaman di dalamnya membaca data terbaru setiap kali dibuka.'
                : 'Sebagian halaman di bawah butuh akun: halaman itu akan meminta Anda masuk dulu, lalu kembali ke tempat semula.'
          }
          aksi={
            !user && (
              <Link href="/masuk" className={TOMBOL_UTAMA}>
                Masuk
              </Link>
            )
          }
        />
      </Seksi>

      {KELOMPOK.map((kelompok) => (
        <Seksi key={kelompok.judul}>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-heading text-[clamp(1.25rem,2.4vw,1.6rem)] font-semibold tracking-[-0.03em]">
              {kelompok.judul}
            </h2>
            <p className="text-sm text-muted-foreground sm:text-right">{kelompok.ringkas}</p>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kelompok.tautan.map((tautan) => {
              const Icon = tautan.icon

              return (
                <li key={tautan.href}>
                  <Link
                    href={tautan.href}
                    className="group flex h-full items-start gap-3.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {tautan.label}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                        {tautan.keterangan}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Seksi>
      ))}

      <Seksi nada="gelap">
        <div className="max-w-3xl">
          <MataSeksi tone="dark">Keamanan akun</MataSeksi>

          <h2 className="mt-3 text-balance font-heading text-[clamp(1.5rem,3vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.03em]">
            Sesi Anda berakhir sendiri saat tidak dipakai.
          </h2>

          <p className="mt-4 text-[15px] leading-[1.8] text-primary-foreground/80">
            Token masuk berumur pendek dan diperpanjang selama tabnya masih
            dibuka, jadi meninggalkan perangkat yang dipakai bersama tidak
            membuat akun Anda terbuka untuk orang berikutnya. Untuk keluar
            sepenuhnya, pakai tombol keluar di menu akun.
          </p>
        </div>
      </Seksi>
    </>
  )
}
