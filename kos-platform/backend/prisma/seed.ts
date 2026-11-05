import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

/**
 * Seed data demo.
 *
 * Per `tempelan-1.txt` bagian 22: 1 admin, 2 owner, 5 tenant, beberapa
 * properti, kamar, fasilitas, dan rincian biaya. Semua data fiktif.
 *
 * Semua akun memakai password yang sama agar mudah didemokan.
 */

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'KosDemo123!'

// ════════════════════════════════════════════════════════════════════════════
// AKUN DEMO
// ════════════════════════════════════════════════════════════════════════════

interface DemoUser {
  fullName: string
  email: string
  role: 'ADMIN' | 'OWNER' | 'TENANT'
  phone: string
}

const demoUsers: DemoUser[] = [
  { fullName: 'Admin KosPlatform', email: 'admin@kosplatform.test', role: 'ADMIN', phone: '081200000001' },
  { fullName: 'Hendra Wijaya', email: 'owner1@kosplatform.test', role: 'OWNER', phone: '081200000002' },
  { fullName: 'Sari Lestari', email: 'owner2@kosplatform.test', role: 'OWNER', phone: '081200000003' },
  { fullName: 'Budi Santoso', email: 'tenant1@kosplatform.test', role: 'TENANT', phone: '081200000004' },
  { fullName: 'Nadia Putri', email: 'tenant2@kosplatform.test', role: 'TENANT', phone: '081200000005' },
  { fullName: 'Rizky Ramadhan', email: 'tenant3@kosplatform.test', role: 'TENANT', phone: '081200000006' },
  { fullName: 'Dewi Anggraini', email: 'tenant4@kosplatform.test', role: 'TENANT', phone: '081200000007' },
  { fullName: 'Fajar Nugroho', email: 'tenant5@kosplatform.test', role: 'TENANT', phone: '081200000008' },
]

// ════════════════════════════════════════════════════════════════════════════
// FASILITAS
// ════════════════════════════════════════════════════════════════════════════

type FacilityCategory = 'PROPERTY' | 'ROOM'

interface SeedFacility {
  name: string
  slug: string
  category: FacilityCategory
  icon: string
}

const facilities: SeedFacility[] = [
  { name: 'Wi-Fi', slug: 'wifi', category: 'PROPERTY', icon: 'wifi' },
  { name: 'Parkir Motor', slug: 'parkir-motor', category: 'PROPERTY', icon: 'bike' },
  { name: 'Parkir Mobil', slug: 'parkir-mobil', category: 'PROPERTY', icon: 'car' },
  { name: 'Dapur Bersama', slug: 'dapur', category: 'PROPERTY', icon: 'cooking-pot' },
  { name: 'Laundry', slug: 'laundry', category: 'PROPERTY', icon: 'shirt' },
  { name: 'CCTV', slug: 'cctv', category: 'PROPERTY', icon: 'camera' },
  { name: 'Penjaga Kos', slug: 'penjaga-kos', category: 'PROPERTY', icon: 'shield' },
  { name: 'Air Termasuk', slug: 'air-termasuk', category: 'PROPERTY', icon: 'droplets' },
  { name: 'Listrik Termasuk', slug: 'listrik-termasuk', category: 'PROPERTY', icon: 'zap' },
  { name: 'AC', slug: 'ac', category: 'ROOM', icon: 'air-vent' },
  { name: 'Kamar Mandi Dalam', slug: 'kamar-mandi-dalam', category: 'ROOM', icon: 'shower-head' },
  { name: 'Kasur', slug: 'kasur', category: 'ROOM', icon: 'bed-double' },
  { name: 'Lemari', slug: 'lemari', category: 'ROOM', icon: 'archive' },
  { name: 'Meja Belajar', slug: 'meja-belajar', category: 'ROOM', icon: 'book-open' },
]

// ════════════════════════════════════════════════════════════════════════════
// PROPERTI DEMO
// ════════════════════════════════════════════════════════════════════════════

type PropertyType = 'KOS_PUTRA' | 'KOS_PUTRI' | 'KOS_CAMPUR'
type Bathroom = 'private' | 'shared'
type RoomStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
type Billing = 'MONTHLY' | 'VARIABLE' | 'ONE_TIME'
type Confidence = 'COMPLETE' | 'PARTIAL' | 'NEEDS_CONFIRMATION'

interface SeedRoom {
  roomNumber: string
  roomType: string
  price: number
  bathroom: Bathroom
  occupants: number
  status: RoomStatus
  area: [number, number]
}

interface SeedCost {
  name: string
  amount: number
  billingType: Billing
  refundable: boolean
  confidence: Confidence
  description?: string
}

interface SeedRule {
  title: string
  description: string
  mandatory: boolean
}

interface SeedProperty {
  slug: string
  name: string
  ownerEmail: string
  description: string
  address: string
  province: string
  city: string
  district: string
  postalCode: string
  latitude: number
  longitude: number
  propertyType: PropertyType
  genderPolicy: string
  costConfidence: Confidence
  confirmationDaysAgo: number
  images: { url: string; alt: string }[]
  propertyFacilities: string[]
  roomFacilities: string[]
  rooms: SeedRoom[]
  costs: SeedCost[]
  rules: SeedRule[]
}

const properties: SeedProperty[] = [
  {
    slug: 'kos-melati-putri-kebayoran',
    name: 'Kos Melati Putri',
    ownerEmail: 'owner1@kosplatform.test',
    description:
      'Kos putri nyaman di kawasan Kebayoran Baru, 5 menit jalan kaki ke halte TransJakarta dan dekat minimarket serta rumah makan. Lingkungan tenang, cocok untuk mahasiswa dan pekerja.',
    address: 'Jl. Melati No. 12, RT 04/RW 02',
    province: 'DKI Jakarta',
    city: 'Jakarta Selatan',
    district: 'Kebayoran Baru',
    postalCode: '12130',
    latitude: -6.2435,
    longitude: 106.7992,
    propertyType: 'KOS_PUTRI',
    genderPolicy: 'putri',
    costConfidence: 'COMPLETE',
    confirmationDaysAgo: 2,
    images: [
      { url: '/images/kos-1.jpg', alt: 'Kamar Kos Melati Putri dengan pencahayaan hangat dan tanaman' },
      { url: '/images/kos-2.jpg', alt: 'Sudut kamar dengan lampu meja di Kos Melati Putri' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'air-termasuk', 'dapur', 'laundry'],
    roomFacilities: ['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'],
    rooms: [
      { roomNumber: 'A1', roomType: 'deluxe', price: 1850000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 4] },
      { roomNumber: 'A2', roomType: 'deluxe', price: 1750000, bathroom: 'private', occupants: 1, status: 'OCCUPIED', area: [3, 4] },
      { roomNumber: 'A3', roomType: 'deluxe', price: 1650000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 3.5] },
      { roomNumber: 'A4', roomType: 'reguler', price: 1450000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3.5] },
      { roomNumber: 'A5', roomType: 'reguler', price: 1450000, bathroom: 'shared', occupants: 1, status: 'RESERVED', area: [2.5, 3.5] },
      { roomNumber: 'A6', roomType: 'reguler', price: 1350000, bathroom: 'shared', occupants: 1, status: 'MAINTENANCE', area: [2.5, 3] },
    ],
    costs: [
      {
        name: 'Listrik',
        amount: 120000,
        billingType: 'VARIABLE',
        refundable: false,
        confidence: 'PARTIAL',
        description: 'Token listrik rata-rata per bulan; pemakaian bisa berbeda.',
      },
      { name: 'Air & Kebersihan', amount: 60000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Internet', amount: 80000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Deposit', amount: 1500000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
      {
        name: 'Biaya Administrasi Awal',
        amount: 100000,
        billingType: 'ONE_TIME',
        refundable: false,
        confidence: 'COMPLETE',
      },
    ],
    rules: [
      { title: 'Jam malam 22.00', description: 'Gerbang dikunci pukul 22.00; akses malam hanya dengan kartu penghuni.', mandatory: true },
      { title: 'Tamu hanya di ruang tamu', description: 'Tamu lawan jenis tidak diizinkan masuk ke area kamar.', mandatory: true },
      { title: 'Dilarang membawa hewan peliharaan', description: 'Termasuk hewan kecil seperti ikan dan hamster.', mandatory: true },
    ],
  },
  {
    slug: 'kos-anggrek-campur-dago',
    name: 'Kos Anggrek Campur',
    ownerEmail: 'owner2@kosplatform.test',
    description:
      'Kos campur di kawasan Dago yang dekat dengan kampus ITB dan Unpad. Banyak warung makan, kafe, dan akses angkutan kota dalam jarak jalan kaki.',
    address: 'Jl. Anggrek No. 8, RT 03/RW 05',
    province: 'Jawa Barat',
    city: 'Bandung',
    district: 'Coblong',
    postalCode: '40135',
    latitude: -6.8856,
    longitude: 107.6139,
    propertyType: 'KOS_CAMPUR',
    genderPolicy: 'campur',
    costConfidence: 'PARTIAL',
    confirmationDaysAgo: 5,
    images: [
      { url: '/images/kos-3.jpg', alt: 'Kamar bernuansa biru di Kos Anggrek Campur' },
      { url: '/images/kos-5.jpg', alt: 'Kamar dengan perabot modern di Kos Anggrek Campur' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'dapur', 'laundry'],
    roomFacilities: ['kasur', 'lemari', 'meja-belajar'],
    rooms: [
      { roomNumber: 'B1', roomType: 'deluxe', price: 1300000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 4] },
      { roomNumber: 'B2', roomType: 'deluxe', price: 1250000, bathroom: 'private', occupants: 1, status: 'OCCUPIED', area: [3, 3.5] },
      { roomNumber: 'B3', roomType: 'reguler', price: 1100000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3.5] },
      { roomNumber: 'B4', roomType: 'reguler', price: 1050000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3.5] },
      { roomNumber: 'B5', roomType: 'reguler', price: 1000000, bathroom: 'shared', occupants: 1, status: 'OCCUPIED', area: [2.5, 3] },
      { roomNumber: 'B6', roomType: 'reguler', price: 980000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'B7', roomType: 'reguler', price: 950000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2, 3] },
      { roomNumber: 'B8', roomType: 'reguler', price: 950000, bathroom: 'shared', occupants: 1, status: 'RESERVED', area: [2, 3] },
    ],
    costs: [
      {
        name: 'Listrik',
        amount: 100000,
        billingType: 'VARIABLE',
        refundable: false,
        confidence: 'PARTIAL',
        description: 'Rata-rata pemakaian; kamar dengan AC dapat lebih tinggi.',
      },
      { name: 'Air', amount: 50000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Internet', amount: 75000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Deposit', amount: 950000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
      { name: 'Biaya Administrasi Awal', amount: 50000, billingType: 'ONE_TIME', refundable: false, confidence: 'COMPLETE' },
    ],
    rules: [
      { title: 'Bebas jam malam', description: 'Akses pintu utama 24 jam dengan kartu penghuni.', mandatory: false },
      { title: 'Tamu menginap maksimal 3 hari', description: 'Wajib lapor penjaga kos dan ada biaya tambahan.', mandatory: true },
    ],
  },
  {
    slug: 'kos-cendana-putra-jogja',
    name: 'Kos Cendana Putra',
    ownerEmail: 'owner1@kosplatform.test',
    description:
      'Kos putra strategis di Jalan Kaliurang KM 5, dekat kampus UGM dan UNY. Listrik dan air sudah termasuk biaya sewa sehingga pengeluaran bulanan mudah diperkirakan.',
    address: 'Jl. Kaliurang KM 5, Ngaglik',
    province: 'DI Yogyakarta',
    city: 'Sleman',
    district: 'Depok',
    postalCode: '55581',
    latitude: -7.7297,
    longitude: 110.3836,
    propertyType: 'KOS_PUTRA',
    genderPolicy: 'putra',
    costConfidence: 'COMPLETE',
    confirmationDaysAgo: 1,
    images: [
      { url: '/images/kos-6.jpg', alt: 'Kamar kayu bernuansa hangat di Kos Cendana Putra' },
      { url: '/images/kos-4.jpg', alt: 'Kamar dengan tempat tidur dan lemari di Kos Cendana Putra' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'air-termasuk', 'listrik-termasuk', 'dapur'],
    roomFacilities: ['kasur', 'lemari', 'meja-belajar'],
    rooms: [
      { roomNumber: 'C1', roomType: 'reguler', price: 1100000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [3, 3.5] },
      { roomNumber: 'C2', roomType: 'reguler', price: 1000000, bathroom: 'shared', occupants: 1, status: 'OCCUPIED', area: [3, 3] },
      { roomNumber: 'C3', roomType: 'reguler', price: 900000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'C4', roomType: 'reguler', price: 850000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'C5', roomType: 'ekonomi', price: 800000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 2.5] },
    ],
    costs: [
      { name: 'Internet', amount: 60000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Deposit', amount: 800000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
    ],
    rules: [
      { title: 'Kecepatan internet dibatasi', description: 'Kuota fair-use 100 GB per bulan per kamar.', mandatory: true },
    ],
  },
  {
    slug: 'kos-bougenville-putri-surabaya',
    name: 'Kos Bougenville Putri',
    ownerEmail: 'owner2@kosplatform.test',
    description:
      'Kos putri dengan kamar mandi dalam di kawasan Gubeng, dekat Stasiun Gubeng dan perkantoran. Setiap kamar ber-AC dan tersedia laundry mingguan.',
    address: 'Jl. Bougenville No. 21, RT 05/RW 01',
    province: 'Jawa Timur',
    city: 'Surabaya',
    district: 'Gubeng',
    postalCode: '60281',
    latitude: -7.2653,
    longitude: 112.7477,
    propertyType: 'KOS_PUTRI',
    genderPolicy: 'putri',
    costConfidence: 'PARTIAL',
    confirmationDaysAgo: 3,
    images: [
      { url: '/images/kos-2.jpg', alt: 'Kamar dengan lampu meja dan karya seni di Kos Bougenville Putri' },
      { url: '/images/kos-1.jpg', alt: 'Kamar dengan tanaman dan kursi kulit di Kos Bougenville Putri' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'laundry'],
    roomFacilities: ['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'],
    rooms: [
      { roomNumber: 'D1', roomType: 'deluxe', price: 1600000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 4] },
      { roomNumber: 'D2', roomType: 'deluxe', price: 1550000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 4] },
      { roomNumber: 'D3', roomType: 'deluxe', price: 1500000, bathroom: 'private', occupants: 1, status: 'OCCUPIED', area: [3, 3.5] },
      { roomNumber: 'D4', roomType: 'reguler', price: 1300000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 3] },
      { roomNumber: 'D5', roomType: 'reguler', price: 1250000, bathroom: 'private', occupants: 1, status: 'RESERVED', area: [2.5, 3.5] },
      { roomNumber: 'D6', roomType: 'reguler', price: 1150000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'D7', roomType: 'reguler', price: 1100000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
    ],
    costs: [
      {
        name: 'Listrik',
        amount: 130000,
        billingType: 'VARIABLE',
        refundable: false,
        confidence: 'PARTIAL',
        description: 'Perkiraan pemakaian AC harian.',
      },
      { name: 'Air', amount: 60000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Deposit', amount: 1600000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
      { name: 'Biaya Administrasi Awal', amount: 100000, billingType: 'ONE_TIME', refundable: false, confidence: 'COMPLETE' },
    ],
    rules: [
      { title: 'Jam malam 23.00', description: 'Gerbang dikunci, akses menggunakan kartu.', mandatory: true },
      { title: 'Dilarang memasak di kamar', description: 'Dapur bersama tersedia di lantai 1.', mandatory: true },
    ],
  },
  {
    slug: 'kos-flamboyan-campur-malang',
    name: 'Kos Flamboyan Campur',
    ownerEmail: 'owner1@kosplatform.test',
    description:
      'Kos campur harga pelajar di kawasan Lowokwaru, dekat kampus UB, UM, dan Polinema. Pemilik sedang mengumpulkan data biaya listrik per kamar.',
    address: 'Jl. Flamboyan No. 3, RT 02/RW 07',
    province: 'Jawa Timur',
    city: 'Malang',
    district: 'Lowokwaru',
    postalCode: '65141',
    latitude: -7.9429,
    longitude: 112.6117,
    propertyType: 'KOS_CAMPUR',
    genderPolicy: 'campur',
    costConfidence: 'NEEDS_CONFIRMATION',
    confirmationDaysAgo: 30,
    images: [
      { url: '/images/kos-4.jpg', alt: 'Kamar dengan pencahayaan belakang di Kos Flamboyan Campur' },
      { url: '/images/kos-3.jpg', alt: 'Kamar modern bernuansa biru di Kos Flamboyan Campur' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'dapur', 'air-termasuk'],
    roomFacilities: ['kasur', 'lemari'],
    rooms: [
      { roomNumber: 'E1', roomType: 'reguler', price: 1200000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 3.5] },
      { roomNumber: 'E2', roomType: 'reguler', price: 1100000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 3] },
      { roomNumber: 'E3', roomType: 'reguler', price: 1000000, bathroom: 'shared', occupants: 1, status: 'OCCUPIED', area: [3, 3] },
      { roomNumber: 'E4', roomType: 'reguler', price: 950000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'E5', roomType: 'reguler', price: 900000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'E6', roomType: 'reguler', price: 900000, bathroom: 'shared', occupants: 1, status: 'RESERVED', area: [2.5, 3] },
      { roomNumber: 'E7', roomType: 'ekonomi', price: 850000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 2.5] },
      { roomNumber: 'E8', roomType: 'ekonomi', price: 800000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 2.5] },
      { roomNumber: 'E9', roomType: 'ekonomi', price: 750000, bathroom: 'shared', occupants: 1, status: 'OCCUPIED', area: [2, 2.5] },
      { roomNumber: 'E10', roomType: 'ekonomi', price: 750000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2, 2.5] },
    ],
    costs: [
      {
        name: 'Listrik',
        amount: 0,
        billingType: 'VARIABLE',
        refundable: false,
        confidence: 'NEEDS_CONFIRMATION',
        description: 'Nominal per kamar belum dikonfirmasi pemilik.',
      },
      { name: 'Deposit', amount: 750000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
    ],
    rules: [
      { title: 'Bebas jam malam', description: 'Akses 24 jam, gerbang memakai kunci digital.', mandatory: false },
      { title: 'Maksimal 1 penghuni per kamar', description: 'Kamar ekonomi tidak dapat diisi dua orang.', mandatory: true },
    ],
  },
  {
    slug: 'kos-kenanga-putri-depok',
    name: 'Kos Kenanga Putri',
    ownerEmail: 'owner2@kosplatform.test',
    description:
      'Kos putri dekat kampus UI Depok dengan akses KRL dan angkot 24 jam. Semua kamar ber-AC, kamar mandi dalam, dan sudah termasuk listrik serta air.',
    address: 'Jl. Kenanga No. 17, RT 01/RW 09',
    province: 'Jawa Barat',
    city: 'Depok',
    district: 'Beji',
    postalCode: '16424',
    latitude: -6.3689,
    longitude: 106.8305,
    propertyType: 'KOS_PUTRI',
    genderPolicy: 'putri',
    costConfidence: 'COMPLETE',
    confirmationDaysAgo: 1,
    images: [
      { url: '/images/kos-5.jpg', alt: 'Kamar dengan perabot modern dan pencahayaan lembut di Kos Kenanga Putri' },
      { url: '/images/kos-6.jpg', alt: 'Kamar kayu bernuansa hangat di Kos Kenanga Putri' },
    ],
    propertyFacilities: ['wifi', 'parkir-motor', 'cctv', 'penjaga-kos', 'air-termasuk', 'listrik-termasuk'],
    roomFacilities: ['ac', 'kamar-mandi-dalam', 'kasur', 'lemari', 'meja-belajar'],
    rooms: [
      { roomNumber: 'F1', roomType: 'deluxe', price: 1500000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 4] },
      { roomNumber: 'F2', roomType: 'deluxe', price: 1450000, bathroom: 'private', occupants: 1, status: 'OCCUPIED', area: [3, 4] },
      { roomNumber: 'F3', roomType: 'deluxe', price: 1400000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [3, 3.5] },
      { roomNumber: 'F4', roomType: 'reguler', price: 1250000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [2.5, 3.5] },
      { roomNumber: 'F5', roomType: 'reguler', price: 1200000, bathroom: 'private', occupants: 1, status: 'AVAILABLE', area: [2.5, 3.5] },
      { roomNumber: 'F6', roomType: 'reguler', price: 1150000, bathroom: 'shared', occupants: 1, status: 'RESERVED', area: [2.5, 3] },
      { roomNumber: 'F7', roomType: 'reguler', price: 1100000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'F8', roomType: 'reguler', price: 1050000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 3] },
      { roomNumber: 'F9', roomType: 'ekonomi', price: 1000000, bathroom: 'shared', occupants: 1, status: 'AVAILABLE', area: [2.5, 2.5] },
    ],
    costs: [
      { name: 'Kebersihan', amount: 35000, billingType: 'MONTHLY', refundable: false, confidence: 'COMPLETE' },
      { name: 'Deposit', amount: 1500000, billingType: 'ONE_TIME', refundable: true, confidence: 'COMPLETE' },
      { name: 'Biaya Administrasi Awal', amount: 75000, billingType: 'ONE_TIME', refundable: false, confidence: 'COMPLETE' },
    ],
    rules: [
      { title: 'Jam malam 22.30', description: 'Gerbang dikunci; kabari penjaga bila pulang terlambat.', mandatory: true },
      { title: 'Wajib menjaga kebersihan dapur bersama', description: 'Peralatan makan dicuci setelah dipakai.', mandatory: true },
    ],
  },
]

const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const userIdByEmail = new Map<string, string>()

  // ── Akun demo ────────────────────────────────────────────────────────────
  for (const demo of demoUsers) {
    const user = await prisma.users.upsert({
      where: { email: demo.email },
      update: { full_name: demo.fullName, role: demo.role, account_status: 'ACTIVE' },
      create: {
        full_name: demo.fullName,
        email: demo.email,
        phone_number: demo.phone,
        password_hash: passwordHash,
        role: demo.role,
        account_status: 'ACTIVE',
        email_verified_at: new Date(),
      },
      select: { id: true },
    })

    userIdByEmail.set(demo.email, user.id)

    if (demo.role === 'OWNER') {
      await prisma.owner_profiles.upsert({
        where: { user_id: user.id },
        update: { verified_at: daysAgo(30) },
        create: {
          user_id: user.id,
          business_name: `Kos ${demo.fullName.split(' ')[0]}`,
          description: 'Pemilik kos demo untuk pengembangan platform.',
          identity_verification_status: 'VERIFIED',
          identity_document_status: 'VERIFIED',
          verified_at: daysAgo(30),
        },
      })
    }

    if (demo.role === 'TENANT') {
      await prisma.tenant_profiles.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
          user_id: user.id,
          occupation: 'Mahasiswa',
          institution_name: 'Universitas Demo',
          emergency_contact_name: `Kontak Darurat ${demo.fullName.split(' ')[0]}`,
          emergency_contact_phone: '081299990000',
        },
      })
    }

    console.log(`  akun ${demo.email} (${demo.role})`)
  }

  // ── Fasilitas ────────────────────────────────────────────────────────────
  const facilityIdBySlug = new Map<string, string>()
  for (const facility of facilities) {
    const row = await prisma.facilities.upsert({
      where: { slug: facility.slug },
      update: { name: facility.name, category: facility.category, icon: facility.icon },
      create: facility,
      select: { id: true },
    })
    facilityIdBySlug.set(facility.slug, row.id)
  }
  console.log(`  ${facilities.length} fasilitas`)

  // ── Properti, kamar, biaya, aturan ───────────────────────────────────────
  for (const seed of properties) {
    const ownerId = userIdByEmail.get(seed.ownerEmail)
    if (!ownerId) throw new Error(`Owner ${seed.ownerEmail} tidak ditemukan`)

    const property = await prisma.properties.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        address: seed.address,
        province: seed.province,
        city: seed.city,
        district: seed.district,
        postal_code: seed.postalCode,
        latitude: seed.latitude,
        longitude: seed.longitude,
        property_type: seed.propertyType,
        gender_policy: seed.genderPolicy,
        total_rooms: seed.rooms.length,
        verification_status: 'VERIFIED',
        publication_status: 'PUBLISHED',
        published_at: daysAgo(10),
        last_availability_confirmation_at: daysAgo(seed.confirmationDaysAgo),
        cost_confidence: seed.costConfidence,
      },
      create: {
        owner_id: ownerId,
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
        address: seed.address,
        province: seed.province,
        city: seed.city,
        district: seed.district,
        postal_code: seed.postalCode,
        latitude: seed.latitude,
        longitude: seed.longitude,
        property_type: seed.propertyType,
        gender_policy: seed.genderPolicy,
        total_rooms: seed.rooms.length,
        verification_status: 'VERIFIED',
        publication_status: 'PUBLISHED',
        published_at: daysAgo(10),
        last_availability_confirmation_at: daysAgo(seed.confirmationDaysAgo),
        cost_confidence: seed.costConfidence,
      },
      select: { id: true },
    })

    // Anak-anak properti dibuat ulang agar seed idempoten dan isinya pasti
    // sesuai definisi di atas (tidak ada sisa dari versi seed sebelumnya).
    await prisma.property_images.deleteMany({ where: { property_id: property.id } })
    await prisma.property_facilities.deleteMany({ where: { property_id: property.id } })
    await prisma.property_rules.deleteMany({ where: { property_id: property.id } })
    await prisma.cost_components.deleteMany({ where: { property_id: property.id } })

    await prisma.property_images.createMany({
      data: seed.images.map((image, index) => ({
        property_id: property.id,
        storage_path: image.url,
        image_url: image.url,
        alt_text: image.alt,
        display_order: index,
        is_primary: index === 0,
      })),
    })

    await prisma.property_facilities.createMany({
      data: seed.propertyFacilities.map((slug) => ({
        property_id: property.id,
        facility_id: facilityIdBySlug.get(slug)!,
      })),
    })

    await prisma.property_rules.createMany({
      data: seed.rules.map((rule) => ({
        property_id: property.id,
        rule_title: rule.title,
        rule_description: rule.description,
        is_mandatory: rule.mandatory,
      })),
    })

    await prisma.cost_components.createMany({
      data: seed.costs.map((cost) => ({
        property_id: property.id,
        name: cost.name,
        amount: cost.amount,
        billing_type: cost.billingType,
        is_mandatory: true,
        is_refundable: cost.refundable,
        cost_confidence: cost.confidence,
        description: cost.description ?? null,
      })),
    })

    for (const room of seed.rooms) {
      const saved = await prisma.rooms.upsert({
        where: { property_id_room_number: { property_id: property.id, room_number: room.roomNumber } },
        update: {
          room_type: room.roomType,
          monthly_price: room.price,
          bathroom_type: room.bathroom,
          maximum_occupants: room.occupants,
          availability_status: room.status,
          area_width: room.area[0],
          area_length: room.area[1],
        },
        create: {
          property_id: property.id,
          room_number: room.roomNumber,
          room_type: room.roomType,
          monthly_price: room.price,
          bathroom_type: room.bathroom,
          maximum_occupants: room.occupants,
          availability_status: room.status,
          area_width: room.area[0],
          area_length: room.area[1],
        },
        select: { id: true },
      })

      await prisma.room_facilities.deleteMany({ where: { room_id: saved.id } })
      await prisma.room_facilities.createMany({
        data: seed.roomFacilities.map((slug) => ({
          room_id: saved.id,
          facility_id: facilityIdBySlug.get(slug)!,
        })),
      })
    }

    console.log(`  properti ${seed.name} (${seed.rooms.length} kamar)`)
  }

  console.log('')
  console.log(`Seed selesai. ${demoUsers.length} akun demo dan ${properties.length} properti siap dipakai.`)
  console.log(`Password semua akun demo: ${DEMO_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Seed gagal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
