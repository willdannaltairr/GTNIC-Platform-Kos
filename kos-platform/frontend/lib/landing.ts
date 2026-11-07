import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, Calculator, CircleAlert, MapPin, LockKeyhole, ShieldCheck, Wallet } from 'lucide-react'

import { FAQS, FEATURES, LOCATIONS, OWNER_BENEFITS, STEPS, TENANT_BENEFITS, TRUST_POINTS } from './constants'

/**
 * Teks khusus landing page.
 *
 * Halaman lain memakai `lib/constants.ts`; berkas ini hanya berisi copy yang
 * tidak dipakai di tempat lain, supaya halaman /kos dan /masuk tidak ikut
 * berubah ketika teks landing diperbarui.
 */

export interface LandingNavLink {
  label: string
  href: string
}

export const LANDING_NAV: LandingNavLink[] = [
  { label: 'Produk', href: '/#produk' },
  { label: 'Cara Kerja', href: '/#cara-kerja' },
  { label: 'Lokasi', href: '/#lokasi' },
  { label: 'Tanya Jawab', href: '/#tanya-jawab' },
]

export const LANDING_CTA = { label: 'Cari Kos', href: '/kos' }

export interface LandingFooterColumn {
  title: string
  links: LandingNavLink[]
}

export const LANDING_FOOTER_COLUMNS: LandingFooterColumn[] = [
  {
    title: 'Pencari Kos',
    links: [
      { label: 'Cari Kos', href: '/kos' },
      { label: 'KosMatch', href: '/#kosmatch' },
      { label: 'Simulasi Biaya', href: '/#truecost' },
      { label: 'Cara Kerja', href: '/#cara-kerja' },
    ],
  },
  {
    title: 'Pemilik Kos',
    links: [
      { label: 'Daftar Sebagai Pemilik', href: '/daftar' },
      { label: 'Manfaat', href: '/#manfaat' },
      { label: 'Masuk Dashboard', href: '/masuk' },
    ],
  },
  {
    title: 'Lainnya',
    links: [
      { label: 'Tanya Jawab', href: '/#tanya-jawab' },
      { label: 'Kredit Foto', href: '/kredit' },
      { label: 'Masuk', href: '/masuk' },
    ],
  },
]

export type HeroSceneId = 'pagi' | 'malam'

export interface HeroScene {
  label: string
  caption: string
  description: string
  image: string
  imageAlt: string
}

export const HERO = {
  badge: 'Transparansi biaya, kecocokan kebutuhan',
  scenes: {
    pagi: {
      label: 'Pagi',
      caption: 'Bangunan yang Anda lihat',
      description:
        'Fasad, atap, dan lingkungan sekitar rumah kos terlihat apa adanya sebelum Anda berangkat survei. Semua biaya — sewa, deposit, listrik, air, internet — sudah terhitung sejak awal.',
      image: '/images/hero-kos-pagi.jpg',
      imageAlt: 'Rumah kos berlantai satu dengan panel surya di atap, dilihat dari halaman depan pada pagi hari',
    },
    malam: {
      label: 'Malam',
      caption: 'Saat penghuninya pulang',
      description:
        'Ketenangan malam ditentukan hal-hal kecil: ventilasi, keamanan, dan tetangga kamar. Ketersediaan yang dikonfirmasi pemilik membuat kamar ini benar-benar menunggu Anda.',
      image: '/images/hero-kos-malam.jpg',
      imageAlt: 'Rumah kos yang sama pada malam hari, jendelanya menyala hangat di tengah kabut',
    },
  } satisfies Record<HeroSceneId, HeroScene>,
}

export const HERO_CITIES = LOCATIONS.map((location) => location.city)

export interface AreaLink {
  name: string
  href: string
  icon: LucideIcon
}

/**
 * Kawasan yang bisa langsung dibuka lewat pencarian — dipakai marquee di bawah
 * hero.
 *
 * Ikonnya sengaja seragam: ikon variatif biasanya dipakai untuk logo mitra,
 * sedangkan di sini yang ditampilkan nama tempat. Ikon Wi-Fi atau kunci di
 * sebelah nama kota akan terbaca sebagai klaim fasilitas yang tidak pernah
 * kita maksud.
 */
export const AREA_LINKS: AreaLink[] = [
  { name: 'Jakarta Selatan', href: '/kos?city=Jakarta%20Selatan', icon: MapPin },
  { name: 'Bandung', href: '/kos?city=Bandung', icon: MapPin },
  { name: 'Sleman', href: '/kos?city=Sleman', icon: MapPin },
  { name: 'Surabaya', href: '/kos?city=Surabaya', icon: MapPin },
  { name: 'Malang', href: '/kos?city=Malang', icon: MapPin },
  { name: 'Depok', href: '/kos?city=Depok', icon: MapPin },
]

/** Kalimat manifesto yang menyala mengikuti scroll. `accent` menandai bagian penekanan. */
export interface ManifestoToken {
  word: string
  accent: boolean
  pill?: string
}

export const MANIFESTO: ManifestoToken[] = [
  { word: 'Mencari', accent: false },
  { word: 'kos', accent: false },
  { word: 'jarang', accent: false },
  { word: 'soal', accent: false },
  { word: 'kurang', accent: false },
  { word: 'pilihan.', accent: false },
  { word: 'Sering', accent: true, pill: '/images/kos-2.jpg' },
  { word: 'soal', accent: false },
  { word: 'kurang', accent: false },
  { word: 'kejelasan:', accent: true },
  { word: 'berapa', accent: false },
  { word: 'total', accent: false },
  { word: 'biayanya,', accent: false },
  { word: 'berapa', accent: false },
  { word: 'jauh', accent: false, pill: '/images/kos-4.jpg' },
  { word: 'jaraknya,', accent: false },
  { word: 'dan', accent: false },
  { word: 'kapan', accent: false },
  { word: 'kamarnya', accent: false },
  { word: 'benar-benar', accent: false, pill: '/images/kos-5.jpg' },
  { word: 'tersedia.', accent: true },
]

export interface LandingStat {
  value: string
  label: string
  detail: string
}

export const LANDING_STATS: LandingStat[] = [
  {
    value: '35%',
    label: 'bobot anggaran di KosMatch',
    detail: 'Anggaran adalah faktor terbesar, tapi bukan satu-satunya yang menentukan skor.',
  },
  {
    value: '30%',
    label: 'bobot lokasi di KosMatch',
    detail: 'Jarak ke kampus atau kantor dihitung dari koordinat properti, bukan dari judul iklan.',
  },
  {
    value: '12',
    label: 'bulan proyeksi biaya',
    detail: 'Simulasi Biaya menampilkan biaya masuk, bulanan, 3, 6, dan 12 bulan sekaligus.',
  },
  {
    value: '3',
    label: 'tingkat Cost Confidence',
    detail: 'Biaya lengkap, sebagian, atau perlu konfirmasi — selalu ditampilkan apa adanya.',
  },
]

export interface CostRow {
  label: string
  amount: number
  note: string
  confirmed: boolean
}

/**
 * Rincian biaya contoh untuk panel TrueCost di landing.
 *
 * Angka ini ilustrasi tampilan, bukan properti sungguhan — sama seperti data
 * demo di halaman /kos. Label keterangannya sengaja ditulis seperti di produk.
 */
export const COST_DEMO = {
  name: 'Kos Melati, Sleman',
  rent: 1_450_000,
  deposit: 1_450_000,
  rows: [
    { label: 'Sewa kamar', amount: 1_450_000, note: 'dikonfirmasi pemilik', confirmed: true },
    { label: 'Listrik', amount: 120_000, note: 'estimasi pemakaian 30 kWh', confirmed: false },
    { label: 'Air', amount: 50_000, note: 'dikonfirmasi pemilik', confirmed: true },
    { label: 'Internet', amount: 100_000, note: 'termasuk Wi-Fi 30 Mbps', confirmed: true },
    { label: 'Kebersihan', amount: 40_000, note: 'dikonfirmasi pemilik', confirmed: true },
  ] satisfies CostRow[],
}

export interface MatchFactor {
  label: string
  weight: number
  score: number
}

export const MATCH_DEMO: MatchFactor[] = [
  { label: 'Anggaran', weight: 35, score: 92 },
  { label: 'Lokasi', weight: 30, score: 78 },
  { label: 'Fasilitas', weight: 20, score: 85 },
  { label: 'Preferensi kamar', weight: 15, score: 70 },
]

export interface AboutFact {
  value: string
  label: string
}

/**
 * Fakta di bagian "Tentang".
 *
 * Semua angka di sini berasal dari cara kerja produk yang bisa Anda periksa di
 * dalam aplikasi — jumlah kota pada pencarian, jumlah faktor KosMatch, dan
 * rentang proyeksi biaya. Tidak ada angka survei yang tidak bisa ditelusuri.
 */
export const ABOUT_FACTS: AboutFact[] = [
  { value: '6', label: 'kota dengan pencarian tersaring' },
  { value: '4', label: 'faktor bobot di KosMatch' },
  { value: '12', label: 'bulan proyeksi biaya' },
]

export interface Principle {
  icon: LucideIcon
  title: string
  text: string
}

/** Prinsip yang menentukan apa yang tampil dan apa yang tidak. */
export const PRINCIPLES: Principle[] = [
  {
    icon: ShieldCheck,
    title: 'Verifikasi dulu, baru tayang',
    text: 'Properti hanya muncul setelah diperiksa admin. Status verifikasi ditampilkan apa adanya, termasuk yang masih tertunda.',
  },
  {
    icon: Calculator,
    title: 'Setiap angka membawa sumbernya',
    text: 'Nilai yang dikonfirmasi pemilik dipisahkan dari nilai perkiraan, sehingga tidak ada angka yang tampak pasti padahal belum dicek.',
  },
  {
    icon: CircleAlert,
    title: 'Batasannya kami sebutkan',
    text: 'Kalau ada komponen biaya yang belum diketahui, kami menuliskannya sebagai daftar pertanyaan untuk survei — bukan mengosongkannya.',
  },
]

export const ABOUT = {
  missionTitle: 'Misi kami',
  mission: 'Membuat informasi kos bisa dipercaya sebelum uang berpindah tangan.',
  title: 'Dibangun karena mencari kos seharusnya tidak menebak-nebak.',
  description:
    'KosPlatform dimulai dari percakapan dengan penghuni kos dan pemiliknya: harga sewa hampir selalu bukan biaya sesungguhnya, dan ketersediaan kamar sering baru diketahui saat sampai di lokasi. Platform ini menyusun ulang informasi itu supaya bisa diperiksa sebelum keputusan diambil.',
}

export interface RouteStop {
  label: string
  distance: string
  time: string
}

export const ROUTE_DEMO: RouteStop[] = [
  { label: 'Kampus UGM', distance: '1,8 km', time: '7 menit' },
  { label: 'Stasiun Yogyakarta', distance: '4,2 km', time: '14 menit' },
  { label: 'Minimarket 24 jam', distance: '250 m', time: '4 menit' },
]

export interface SolutionStage {
  index: string
  id: string
  label: string
  title: string
  text: string
  bullets: string[]
  tone: 'dark' | 'light'
}

export const SOLUTION_STAGES: SolutionStage[] = [
  {
    index: '01',
    id: 'kosmatch',
    label: 'KosMatch',
    title: 'Rekomendasi yang alasannya bisa Anda periksa.',
    text: 'Masukkan anggaran, lokasi tujuan, dan fasilitas yang dibutuhkan. Setiap skor dipecah menjadi empat faktor berbobot — tidak ada angka misterius di baliknya.',
    bullets: FEATURES[0].bullets,
    tone: 'dark',
  },
  {
    index: '02',
    id: 'truecost',
    label: 'Simulasi Biaya',
    title: 'Total biaya, bukan hanya harga sewa.',
    text: 'Deposit, listrik, air, internet, dan biaya lain dihitung sejak awal, lalu dipisahkan mana yang sudah dikonfirmasi dan mana yang masih perkiraan.',
    bullets: FEATURES[1].bullets,
    tone: 'light',
  },
  {
    index: '03',
    id: 'campusroute',
    label: 'Rute & Sekitar',
    title: 'Tahu jaraknya sebelum berangkat survei.',
    text: 'Jarak dan estimasi waktu tempuh ke kampus, kantor, stasiun, atau terminal — plus tempat penting di sekitar kos yang membuat hidup sehari-hari lebih mudah.',
    bullets: FEATURES[2].bullets,
    tone: 'light',
  },
]

export interface PlatformCapability {
  icon: LucideIcon
  title: string
  text: string
}

/** Tiga hal yang membuat panel Simulasi Biaya bisa dipercaya apa adanya. */
export const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    icon: BadgeCheck,
    title: 'Angka pasti dan angka perkiraan dipisah',
    text: 'Biaya yang sudah dikonfirmasi pemilik ditandai hijau; yang masih perkiraan diberi keterangan sumbernya.',
  },
  {
    icon: Calculator,
    title: 'Proyeksi sampai 12 bulan',
    text: 'Biaya masuk, bulanan, 3, 6, dan 12 bulan dihitung bersamaan, lengkap dengan rumus yang dipakai.',
  },
  {
    icon: LockKeyhole,
    title: 'Tak ada biaya yang disembunyikan',
    text: 'Komponen yang belum diketahui ditampilkan terbuka sebagai daftar pertanyaan untuk survei.',
  },
]

export interface PreviewResult {
  name: string
  area: string
  price: number
  match: number
  confidence: 'Biaya lengkap' | 'Biaya sebagian' | 'Perlu konfirmasi'
  available: string
  facilities: string[]
}

/** Contoh layar pencarian untuk pratinjau platform — angka ilustrasi tampilan. */
export const SEARCH_PREVIEW = {
  keywords: 'kos putri',
  city: 'Sleman',
  total: 128,
  results: [
    {
      name: 'Kos Melati Putri',
      area: 'Sleman · 1,8 km ke UGM',
      price: 1_450_000,
      match: 92,
      confidence: 'Biaya lengkap',
      available: '3 dari 8 kamar tersedia',
      facilities: ['Wi-Fi', 'AC', 'Kamar mandi dalam'],
    },
    {
      name: 'Kos Wijaya Kusuma',
      area: 'Sleman · 2,4 km ke UGM',
      price: 1_250_000,
      match: 85,
      confidence: 'Biaya sebagian',
      available: '1 dari 12 kamar tersedia',
      facilities: ['Wi-Fi', 'Kasur', 'Parkir motor'],
    },
    {
      name: 'Kos Amanah Putri',
      area: 'Sleman · 3,1 km ke UGM',
      price: 1_100_000,
      match: 78,
      confidence: 'Perlu konfirmasi',
      available: 'Ketersediaan perlu dicek pemilik',
      facilities: ['Wi-Fi', 'Lemari', 'Dapur bersama'],
    },
  ] satisfies PreviewResult[],
}

export interface SolutionUnderneath {
  icon: LucideIcon
  title: string
  text: string
}

/** Hal-hal yang berlaku di semua alat, bukan di salah satu saja. */
export const SOLUTION_UNDERNEATH: SolutionUnderneath[] = [
  {
    icon: BadgeCheck,
    title: 'Ketersediaan dikonfirmasi pemilik',
    text: 'Kami menampilkan kapan terakhir pemilik memperbarui, dan menandai kamar yang sudah lama tidak dicek.',
  },
  {
    icon: ShieldCheck,
    title: 'Properti lolos verifikasi admin',
    text: 'Properti baru tampil setelah diperiksa. Status verifikasi ditampilkan apa adanya, termasuk yang tertunda.',
  },
  {
    icon: Wallet,
    title: 'Pembayaran lewat penyedia resmi',
    text: 'Transaksi diproses penyedia pembayaran, bukan ditahan platform. Kami tidak menggantikan peran mereka.',
  },
]

export const BENEFITS = {
  title: 'Satu platform, dua sisi yang sama-sama untung.',
  description:
    'Pencari kos mendapat informasi yang utuh; pemilik kos mendapat alat kerja yang rapi. Kejujuran informasi menguntungkan keduanya.',
  tenant: TENANT_BENEFITS,
  owner: OWNER_BENEFITS,
}

export const LANDING_STEPS = STEPS

export const LANDING_TRUST = TRUST_POINTS

export const LANDING_FAQS = FAQS
