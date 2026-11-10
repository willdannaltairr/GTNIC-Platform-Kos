import type { Metadata } from 'next'
import { BarisAngka, JudulHalaman, Seksi, TOMBOL_UTAMA } from '@/components/site/kerangka'
import { PopularAreasSection } from '@/components/beranda/popular-areas-section'
import { CampusSection } from '@/components/beranda/campus-section'
import { fetchCampuses, fetchRegions } from '@/lib/api'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Kawasan',
  description:
    'Jelajahi kos per kota, kecamatan, dan kampus di Indonesia, lengkap dengan jumlah kos terverifikasi di tiap kawasan.',
}

/**
 * Halaman kawasan.
 *
 * Sebelumnya daftar kota dan kampus hanya muncul sebagai bagian di beranda,
 * sehingga pengunjung yang ingin berpindah kawasan harus menggulir beranda
 * sampai bawah setiap kali. Di sini keduanya menjadi satu halaman dengan
 * alamatnya sendiri, bisa ditandai, dan bisa dijadikan pintu masuk.
 *
 * Isinya memakai ulang bagian yang sudah ada di beranda alih-alih menyalin
 * tampilannya: satu daftar kawasan yang tampil di dua halaman tetap satu
 * komponen, jadi perubahan di kemudian hari tidak perlu dikerjakan dua kali.
 */
export default async function KawasanPage() {
  const [regions, campuses] = await Promise.all([
    fetchRegions(24),
    fetchCampuses({ limit: 24 }),
  ])

  return (
    <>
      <Seksi garis={false}>
        <JudulHalaman
          eyebrow="Kawasan"
          title="Pilih kawasan, lalu lihat kosnya"
          description="Setiap kawasan di bawah membuka pencarian yang sudah tersaring ke kawasan itu. Angka di sampingnya adalah jumlah kos terverifikasi yang benar-benar ada di sana hari ini, bukan perkiraan."
          aksi={
            <Link href="/kos" className={TOMBOL_UTAMA}>
              Cari semua kos
            </Link>
          }
        />
      </Seksi>

      <PopularAreasSection regions={regions ?? []} />

      <CampusSection campuses={campuses ?? []} />

      {/* Bagian ini bukan hiasan: kawasan yang salah adalah kesalahan yang
          paling mahal saat mencari kos, karena ongkosnya baru terasa setelah
          sewa berjalan. Isinya sengaja berupa hal yang bisa diperiksa sendiri
          saat survei, bukan janji platform. */}
      <Seksi id="memilih">
        <div className="max-w-3xl">
          <BarisAngka nomor="01" judul="Ukur jarak ke tempat yang Anda tuju tiap hari">
            Kampus, kantor, atau stasiun, bukan pusat kota. Jarak yang terlihat
            pendek di peta bisa berubah drastis saat jam berangkat.
          </BarisAngka>

          <BarisAngka nomor="02" judul="Periksa akses kendaraan dan angkutan umum">
            Jalan masuk yang sempit atau tidak dilewati angkutan membuat biaya
            transportasi naik tanpa terlihat di harga sewa.
          </BarisAngka>

          <BarisAngka nomor="03" judul="Lihat keadaan lingkungan pada jam yang berbeda">
            Pagi dan malam bisa terasa seperti dua tempat berbeda. Kalau
            memungkinkan, datangi kawasan itu lebih dari sekali sebelum memutuskan.
          </BarisAngka>

          <BarisAngka nomor="04" judul="Bandingkan kawasan dengan ukuran yang sama">
            Dua kawasan berbeda kota tidak bisa dibandingkan hanya dari harga.
            Buka Bandingkan kos untuk menaruh pilihan Anda berdampingan.
          </BarisAngka>
        </div>
      </Seksi>
    </>
  )
}
