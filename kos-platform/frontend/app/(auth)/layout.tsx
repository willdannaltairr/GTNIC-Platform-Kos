/**
 * Chrome untuk halaman autentikasi: tanpa header, footer, maupun sidebar.
 *
 * Halaman masuk dan daftar sengaja dipisahkan dari grup (site) maupun chrome
 * situs: navigasi ke halaman lain di tengah pengisian formulir hanya
 * mengalihkan pandangan. Tiap halaman auth membawa logonya sendiri sebagai
 * jalan kembali ke beranda.
 *
 * Tingginya dikunci ke tinggi layar (`h-svh`) dan potongan lubernya disembunyikan,
 * supaya halaman ini tidak ikut tergulir saat pengunjung memindahkan pandangan -
 * isi formulir dan warnanya tetap di tempat. Kapasitas gulirnya diserahkan ke
 * kolom formulir masing-masing halaman (lihat masuk/page.tsx).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex h-svh flex-col overflow-hidden">{children}</main>
}
