/**
 * Teks halaman publik (Bahasa Indonesia).
 *
 * Dipisahkan dari komponen agar copy mudah ditinjau dan diperbarui tanpa
 * menyentuh layout.
 */

export const HERO = {
  badge: 'Transparansi biaya, kecocokan kebutuhan',
  title: 'Temukan Kos yang Benar-Benar Cocok, Bukan Sekadar Murah',
  subtitle:
    'Bandingkan estimasi biaya total, pahami jarak ke kampus atau kantor, dan survei kos dengan panduan terstruktur. Semua informasi penting tersaji sebelum Anda memesan.',
  primaryCta: { href: '/kos', label: 'Mulai Cari Kos' },
  secondaryCta: { href: '/daftar', label: 'Daftar Sebagai Pemilik' },
}

export const HERO_STATS = [
  { value: 'Biaya Total', label: 'Estimasi sampai 12 bulan, bukan hanya sewa bulanan' },
  { value: 'KosMatch', label: 'Skor kecocokan yang bisa Anda telusuri faktornya' },
  { value: 'Room Passport', label: 'Dokumentasi kondisi kamar saat masuk dan keluar' },
]

export const LOCATIONS = [
  { city: 'Jakarta Selatan', area: 'Kebayoran Baru', href: '/kos?city=Jakarta%20Selatan' },
  { city: 'Bandung', area: 'Coblong, dekat kampus', href: '/kos?city=Bandung' },
  { city: 'Yogyakarta', area: 'Sleman, Jalan Kaliurang', href: '/kos?city=Sleman' },
  { city: 'Surabaya', area: 'Gubeng, dekat stasiun', href: '/kos?city=Surabaya' },
  { city: 'Malang', area: 'Lowokwaru, kawasan kampus', href: '/kos?city=Malang' },
  { city: 'Depok', area: 'Beji, dekat UI', href: '/kos?city=Depok' },
]

export const FEATURES = [
  {
    id: 'kosmatch',
    name: 'KosMatch',
    tagline: 'Rekomendasi sesuai kebutuhan Anda',
    description:
      'Masukkan anggaran, lokasi tujuan, dan fasilitas yang dibutuhkan. KosMatch memberi skor kecocokan dengan bobot yang jelas, anggaran 35%, lokasi 30%, fasilitas 20%, preferensi kamar 15%. Setiap skor disertai alasan, bukan angka misterius.',
    bullets: [
      'Kategori Best Overall, Best Budget, Best Location, Best Facilities',
      'Skor adalah estimasi kecocokan, bukan jaminan kualitas',
      'Bukan disebut AI, ini algoritma pembobotan yang bisa Anda periksa',
    ],
  },
  {
    id: 'truecost',
    name: 'Simulasi Biaya (TrueCost)',
    tagline: 'Tahu total biaya sebelum memesan',
    description:
      'Harga sewa bukan satu-satunya biaya. Simulasi Biaya menghitung deposit, listrik, air, internet, dan biaya lain, lalu memisahkan yang pasti dari yang masih estimasi. Deposit tidak dihitung sebagai biaya bulanan.',
    bullets: [
      'Estimasi biaya masuk, bulanan, 3, 6, dan 12 bulan',
      'Label Cost Confidence: lengkap, sebagian, atau perlu konfirmasi',
      'Komponen yang belum dikonfirmasi selalu ditampilkan terbuka',
    ],
  },
  {
    id: 'campusroute',
    name: 'Rute & Sekitar (CampusRoute)',
    tagline: 'Pahami akses sebelum survei',
    description:
      'Lihat jarak dan estimasi waktu tempuh ke kampus, kantor, stasiun, atau terminal, plus tempat penting di sekitar kos seperti minimarket, apotek, dan tempat makan. Estimasi waktu dapat berubah tergantung lalu lintas dan moda transportasi.',
    bullets: [
      'Koordinat properti tersimpan di database',
      'Jarak dihitung dari lokasi kos ke tujuan pilihan Anda',
      'Dukungan peta siap dikonfigurasi bila API key tersedia',
    ],
  },
]

export const SEARCH_FEATURES = [
  'Nama kos atau wilayah',
  'Kecamatan dan kota',
  'Rentang harga',
  'Tipe kamar dan kamar mandi',
  'Fasilitas: Wi-Fi, AC, kasur, lemari, parkir',
  'Ketersediaan kamar yang dikonfirmasi pemilik',
]

export const STEPS = [
  {
    number: '01',
    title: 'Cari dan saring',
    text: 'Mulai dari kota, kampus, atau anggaran Anda. Setiap filter benar-benar diterapkan pada pencarian, dan hasilnya bisa dibagikan lewat URL.',
  },
  {
    number: '02',
    title: 'Bandingkan dengan angka',
    text: 'Buka Simulasi Biaya pada tiap kos, bandingkan biaya total dan label kepercayaannya, lalu simpan yang paling masuk akal.',
  },
  {
    number: '03',
    title: 'Survei dengan panduan',
    text: 'Datang membawa daftar periksa: kebersihan, ventilasi, keamanan, sampai biaya tambahan. Catat temuan Anda langsung di platform.',
  },
  {
    number: '04',
    title: 'Masuk dengan tenang',
    text: 'Sebelum check-in, kondisi kamar didokumentasikan foto dan catatan. Pihak pemilik dan penghuni menyetujuinya bersama.',
  },
]

export const TENANT_BENEFITS = [
  'Tahu estimasi seluruh biaya sebelum memesan',
  'Membandingkan beberapa kos dengan ukuran yang sama',
  'Memahami jarak dan akses ke kampus atau kantor',
  'Panduan dan daftar periksa saat survei kos',
  'Dokumentasi kondisi kamar saat masuk dan keluar',
]

export const OWNER_BENEFITS = [
  'Kelola properti, kamar, dan ketersediaan dalam satu dashboard',
  'Terima dan proses permintaan sewa dengan status yang jelas',
  'Kelola tagihan, pembayaran, dan laporan keuangan sederhana',
  'Tangani laporan kerusakan beserta riwayat penanganannya',
  'Tampilkan biaya secara transparan untuk membangun kepercayaan',
]

export const TRUST_POINTS = [
  {
    title: 'Pemilik dan properti diverifikasi',
    text: 'Properti hanya tampil setelah melalui pemeriksaan admin. Status verifikasi selalu ditampilkan apa adanya.',
  },
  {
    title: 'Informasi kedaluwarsa ditandai',
    text: 'Bila pemilik lama tidak memperbarui ketersediaan, kamar tidak ditampilkan sebagai tersedia secara pasti dan Anda diberi tahu kapan terakhir dikonfirmasi.',
  },
  {
    title: 'Pembayaran diproses penyedia resmi',
    text: 'Transaksi pembayaran diproses penyedia pembayaran (Midtrans). Kami tidak menahan dana sewa dan tidak menggantikan peran penyedia.',
  },
  {
    title: 'Kami tidak menebak, kami mencatat',
    text: 'Ulasan hanya dari penyewa yang punya transaksi sah. Kami memisahkan informasi terkonfirmasi, informasi dari pemilik, dan informasi perkiraan.',
  },
]

export const FAQS = [
  {
    question: 'Apakah mencari kos di sini gratis?',
    answer:
      'Ya. Mencari, membandingkan, dan menyimpan pencarian kos gratis untuk pencari kos. Biaya hanya berlaku pada transaksi sewa yang Anda sepakati dengan pemilik.',
  },
  {
    question: 'Apa itu Cost Confidence?',
    answer:
      'Label yang menunjukkan seberapa lengkap rincian biaya dari pemilik. "Biaya lengkap" berarti komponen utama sudah tersedia; "Perlu konfirmasi" berarti ada komponen penting yang belum dikonfirmasi dan sebaiknya ditanyakan langsung saat survei.',
  },
  {
    question: 'Apakah estimasi biaya bisa berubah?',
    answer:
      'Bisa. Biaya variabel seperti listrik dan air diberi label estimasi karena pemakaian setiap penghuni berbeda. Nilai yang dikonfirmasi pemilik ditandai, dan biaya yang belum diketahui tidak pernah kami simpulkan sebagai angka pasti.',
  },
  {
    question: 'Bagaimana cara survei kos dengan terstruktur?',
    answer:
      'Gunakan fitur pendamping survei: tambahkan kos ke daftar kunjungan, bawa daftar periksa kondisi kamar, fasilitas, lingkungan, dan biaya, lalu catat temuan beserta foto. Catatan ini milik Anda dan bukan hasil inspeksi resmi platform.',
  },
  {
    question: 'Seberapa akurat ketersediaan kamar?',
    answer:
      'Ketersediaan diperbarui oleh pemilik dan kami menampilkan kapan terakhir dikonfirmasi. Bila sudah lama tidak diperbarui, status ditandai perlu konfirmasi ulang, dan kami tidak menampilkan kamar sebagai tersedia secara pasti.',
  },
  {
    question: 'Apa itu Room Passport?',
    answer:
      'Dokumentasi kondisi kamar yang dibuat saat masuk dan keluar masa sewa, lengkap dengan foto dan catatan kerusakan yang sudah ada. Kedua pihak dapat menyetujui laporan. Dokumen ini membantu mengurangi kesalahpahaman, bukan penentu otomatis siapa yang bersalah.',
  },
]

/**
 * Tautan kaki halaman aplikasi.
 *
 * Semua tujuannya adalah halaman di dalam aplikasi, bukan jangkar di landing
 * page. Sebelumnya separuh tautan di sini menunjuk ke bagian landing
 * (`/#kosmatch`, `/#truecost`), sehingga pengunjung yang sedang berada di dalam
 * platform terlempar keluar setiap kali menekan tautan kaki halaman. Landing
 * page punya kaki halamannya sendiri, jadi berkas ini tidak perlu melayaninya.
 */
export const FOOTER_LINKS = [
  {
    title: 'Jelajahi',
    links: [
      { href: '/beranda', label: 'Beranda' },
      { href: '/kos', label: 'Cari Kos' },
      { href: '/kawasan', label: 'Kawasan' },
      { href: '/alat', label: 'Alat' },
    ],
  },
  {
    title: 'Alat',
    links: [
      { href: '/simulasi-biaya', label: 'Simulasi biaya' },
      { href: '/bandingkan', label: 'Bandingkan kos' },
      { href: '/beranda#rute', label: 'Rute dan sekitar' },
      { href: '/kondisi-kamar', label: 'Kondisi kamar' },
    ],
  },
  {
    title: 'Akun',
    links: [
      { href: '/saya', label: 'Semua milik saya' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/profil', label: 'Profil' },
      { href: '/daftar', label: 'Buat akun' },
    ],
  },
]

/** Daftar fasilitas master platform (slug sama dengan data fasilitas di database). */
export const FACILITY_FILTERS = [
  { slug: 'wifi', label: 'Wi-Fi' },
  { slug: 'ac', label: 'AC' },
  { slug: 'kamar-mandi-dalam', label: 'Kamar mandi dalam' },
  { slug: 'kasur', label: 'Kasur' },
  { slug: 'lemari', label: 'Lemari' },
  { slug: 'meja-belajar', label: 'Meja belajar' },
  { slug: 'parkir-motor', label: 'Parkir motor' },
  { slug: 'parkir-mobil', label: 'Parkir mobil' },
  { slug: 'dapur', label: 'Dapur bersama' },
  { slug: 'laundry', label: 'Laundry' },
  { slug: 'cctv', label: 'CCTV' },
  { slug: 'penjaga-kos', label: 'Penjaga kos' },
]

export const TYPE_OPTIONS = [
  { value: 'KOS_PUTRA', label: 'Kos Putra' },
  { value: 'KOS_PUTRI', label: 'Kos Putri' },
  { value: 'KOS_CAMPUR', label: 'Kos Campur' },
]

export const BATHROOM_OPTIONS = [
  { value: 'private', label: 'Kamar mandi dalam' },
  { value: 'shared', label: 'Kamar mandi luar' },
]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga terendah' },
  { value: 'price_desc', label: 'Harga tertinggi' },
]
