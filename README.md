# KosPlatform

**Cari kos dengan informasi yang bisa diperiksa, bukan sekadar harga sewa yang terpampang.**

KosPlatform adalah marketplace pencarian dan pengelolaan kos. Web-nya menyusun ulang
informasi sewa supaya bisa dipercaya sebelum keputusan diambil: berapa total biayanya,
seberapa jauh jaraknya, dan kapan kamarnya benar-benar tersedia.

## Masalah yang dijawab

Mencari kos jarang soal kurang pilihan, sering soal kurang kejelasan:

- **Harga sewa hampir selalu bukan biaya sesungguhnya.** Ada deposit, listrik, air, internet,
  kebersihan, dan biaya lain yang baru muncul belakangan.
- **Ketersediaan kamar sering baru diketahui saat sampai di lokasi.**
- **Jarak ke kampus atau kantor jadi pertimbangan terakhir**, padahal dampaknya terasa tiap hari.

Web ini memindahkan informasi itu ke depan, dan menyebutkan terus terang mana angka yang sudah
dikonfirmasi pemilik dan mana yang masih perkiraan.

## Untuk siapa

**Pencari kos** — mahasiswa, pekerja, atau siapa pun yang pindah ke kota baru. Bisa mencari,
membandingkan, dan menyimpan kos tanpa akun; akun dibutuhkan saat ingin mengurus sewa.

**Pemilik kos** — yang ingin propertinya dilihat calon penghuni dengan informasi yang jujur,
sehingga percakapan saat survei tidak dimulai dari selisih angka.

## Yang bisa dilakukan di web ini

### Mencari dan menyaring kos — `/kos`

Masukkan nama kos atau wilayah, lalu saring menurut kota, kecamatan, tipe kos (putra, putri,
campur), kamar mandi dalam atau luar, rentang harga bulanan, dan fasilitas — mulai dari Wi-Fi,
AC, kasur, lemari, parkir, dapur bersama, laundry, CCTV, sampai penjaga kos. Hasilnya bisa
diurutkan dari yang terbaru atau menurut harga.

Setiap pilihan filter ikut tertulis di alamat halaman, jadi hasil pencarian bisa disalin dan
dibagikan persis seperti yang Anda lihat.

### Melihat detail kos dan total biayanya — `/kos/[slug]`

Halaman detail menampilkan kamar yang tersedia, fasilitas, aturan kos, dan rincian biaya:
sewa bulanan, deposit, listrik, air, internet, kebersihan. **Deposit tidak dihitung sebagai
biaya bulanan.** Estimasi ditampilkan untuk biaya masuk, bulanan, 3 bulan, 6 bulan, dan
12 bulan, lengkap dengan rumus yang dipakai supaya bisa Anda periksa sendiri.

Setiap rincian punya label kepercayaan:

| Label | Artinya |
| --- | --- |
| Biaya lengkap | Komponen utama sudah dikonfirmasi pemilik |
| Biaya sebagian | Sebagian angka masih berupa perkiraan |
| Perlu konfirmasi biaya | Ada komponen penting yang belum diketahui — sebaiknya ditanyakan saat survei |

### Membuat akun — `/masuk` dan `/daftar`

Mendaftar sebagai pencari kos atau sebagai pemilik kos. Sesi masuk disimpan dengan pengaturan
keamanan yang membuatnya tidak bisa dibaca skrip lain di halaman.

### Beranda — `/`

Beranda menjelaskan cara kerja platform: foto bangunan kos saat pagi dan malam, kawasan yang
bisa langsung dibuka pencariannya, penjelasan alat-alat yang disiapkan, langkah mencari kos
dari menyaring sampai menempati kamar, manfaat untuk kedua sisi, tanya jawab, dan contoh kos
terbaru yang bisa langsung diklik.

### Kredit foto — `/kredit`

Daftar foto pihak ketiga yang dipakai sebagai ilustrasi, lengkap dengan fotografer dan lisensi
yang berlaku.

## Alat yang sedang disiapkan

Tiga alat ini sudah tampil di beranda dan sedang dikerjakan bertahap:

- **KosMatch** — skor kecocokan untuk tiap kos, dipecah menjadi empat faktor berbobot: anggaran
  35%, lokasi 30%, fasilitas 20%, dan preferensi kamar 15%. Setiap skor disertai alasannya,
  bukan angka misterius. *Belum aktif — belum bisa dipakai di halaman pencarian.*
- **Rute & Sekitar** — jarak dan estimasi waktu tempuh ke kampus, kantor, stasiun, atau terminal,
  plus tempat penting di sekitar kos. *Belum aktif — koordinat properti sudah disiapkan.*
- **Room Passport** — dokumentasi kondisi kamar saat masuk dan keluar masa sewa, lengkap dengan
  foto dan catatan, disetujui kedua pihak. *Belum aktif.*

## Prinsip yang dipegang

- **Verifikasi dulu, baru tayang.** Kos hanya muncul di pencarian setelah diperiksa admin.
- **Setiap angka membawa sumbernya.** Nilai yang dikonfirmasi pemilik dipisahkan dari nilai
  perkiraan, sehingga tidak ada angka yang tampak pasti padahal belum dicek.
- **Batasannya disebutkan.** Kalau ada komponen biaya yang belum diketahui, web ini
  menuliskannya sebagai daftar pertanyaan untuk survei — bukan mengosongkannya.
- **Ketersediaan yang lama tidak diperbarui ditandai**, bukan ditampilkan seolah pasti.
- **Kami tidak menebak, kami mencatat.** Ulasan hanya dari penyewa yang punya transaksi sah.

## Peta halaman

| Halaman | Alamat | Isi |
| --- | --- | --- |
| Beranda | `/` | Penjelasan platform, contoh kos terbaru, kartu 3D bangunan kos |
| Pencarian kos | `/kos` | Daftar kos terverifikasi dengan filter dan urutan |
| Detail kos | `/kos/[slug]` | Kamar, fasilitas, aturan, dan rincian biaya |
| Masuk | `/masuk` | Form masuk |
| Daftar | `/daftar` | Form pendaftaran pencari kos atau pemilik kos |
| Kredit foto | `/kredit` | Sumber dan lisensi foto yang dipakai |

## Status saat ini

**Sudah bisa dicoba:** jelajah beranda, pencarian beserta seluruh filternya, halaman detail
dengan rincian biaya, serta pendaftaran dan masuk akun.

**Belum ada:** skor KosMatch, peta jarak, halaman pengelolaan bagi pemilik kos, pemesanan dan
pembayaran sewa, dokumentasi kamar (Room Passport), dan ulasan penghuni.

> **Datanya masih contoh.** Yang tampil sekarang adalah 6 kos demo di 6 kota — Bandung, Depok,
> Jakarta Selatan, Malang, Sleman, dan Surabaya — beserta kamar, fasilitas, aturan, dan komponen
> biayanya. Semuanya fiktif dan dipakai supaya alur pencarian sampai rincian biaya bisa dicoba
> apa adanya, bukan untuk menggambarkan harga pasar yang sebenarnya.

## Ingin menjalankan atau mengembangkan web ini?

Langkah pemasangan, daftar perintah, dan penjelasan teknisnya ada di
[`kos-platform/README.md`](kos-platform/README.md).
