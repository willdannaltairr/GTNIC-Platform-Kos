/**
 * Perhitungan jarak di antara dua titik koordinat.
 *
 * Dipakai modul properties (kos di sekitar pengunjung) dan places (kampus di
 * sekitar pengunjung). Ditaruh di satu tempat karena rumusnya punya jebakan
 * yang tidak terlihat dari membacanya sekilas.
 */

/** Titik koordinat dalam derajat. */
export interface GeoPoint {
  lat: number
  lng: number
}

/**
 * Ekspresi SQL jarak lingkaran besar (haversine) antara dua titik.
 *
 * `dari` dan `ke` berisi potongan SQL, bukan angka: keduanya bisa berupa
 * parameter (`$2`) maupun nama kolom (`p.latitude`). Nilai yang berasal dari
 * pengguna selalu masuk sebagai parameter di pemanggil, tidak pernah dirangkai
 * ke sini.
 *
 * Dua pengaman yang keduanya wajib ada:
 *
 *  1. `CASE ... IS NULL THEN NULL`. `GREATEST`/`LEAST` di PostgreSQL
 *     MENGABAIKAN NULL: bila salah satu koordinat kosong, `greatest(-1, NULL)`
 *     menghasilkan -1, `acos(-1)` menghasilkan π, dan jaraknya menjadi
 *     ≈ 20.015 km. Tanpa `CASE` ini, properti yang belum punya koordinat justru
 *     tampak sebagai yang paling jauh — bukan sebagai "jarak tidak diketahui".
 *  2. `least(1, greatest(-1, …))` menahan galat pembulatan: cosinus yang
 *     meleset sedikit di luar rentang −1..1 membuat `acos` mengembalikan NaN,
 *     dan satu nilai NaN sudah cukup merusak seluruh hasil pengurutan.
 *
 * Jari-jari bumi dipakai 6371 km (rata-rata), memadai untuk jarak antar-kota.
 */
export const haversineSql = (
  dari: { lat: string; lng: string },
  ke: { lat: string; lng: string },
): string => `(CASE
  WHEN ${dari.lat} IS NULL OR ${dari.lng} IS NULL OR ${ke.lat} IS NULL OR ${ke.lng} IS NULL
    THEN NULL
  ELSE 6371 * acos(least(1, greatest(-1,
    sin(radians(${dari.lat})) * sin(radians(${ke.lat})) +
    cos(radians(${dari.lat})) * cos(radians(${ke.lat})) *
    cos(radians(${ke.lng}) - radians(${dari.lng}))
  )))
END)`

/**
 * Bungkus ekspresi jarak dengan pembulatan satu desimal untuk dikirim ke klien.
 *
 * Hasilnya `numeric`, bukan `double precision`: angka pecahan biner bisa
 * memunculkan ekor seperti 4.300000000000001 di JSON. `pg` mengembalikan kolom
 * numeric sebagai string, jadi pemanggil tetap harus mengubahnya dengan
 * `Number()`.
 */
export const roundedDistanceSql = (ekspresi: string): string =>
  `ROUND((${ekspresi})::numeric, 1)`

/**
 * Daftarkan sebuah titik sebagai parameter, lalu kembalikan ekspresi jaraknya
 * terhadap kolom yang ditunjuk.
 *
 * Penomoran `$n` diserahkan ke fungsi ini supaya pemanggil tidak perlu menghitung
 * sendiri posisi parameternya — di query yang filternya berubah-ubah, nomor
 * yang ditulis manual adalah sumber salah yang paling mudah terjadi.
 *
 * Mengembalikan `NULL` (teks SQL) bila titiknya tidak diminta, sehingga kolom
 * jaraknya tetap ada dengan nilai kosong alih-alih hilang dari hasil.
 */
export const distanceFromPoint = (
  values: unknown[],
  point: GeoPoint | undefined,
  columns: { lat: string; lng: string },
): string => {
  if (!point) return 'NULL'

  // Cast eksplisit ke `double precision` bukan hiasan: tanpa itu, PostgreSQL
  // menolak seluruh query dengan "could not determine data type of parameter
  // $n". `radians()` punya dua kelebihan beban — `double precision` dan
  // `numeric` — dan parameter yang tidak bertipe membuat pemilih fungsi
  // menyerah sebelum sempat melihat kolom di sisi lain rumusnya.
  values.push(point.lat)
  const lat = `$${values.length}::double precision`
  values.push(point.lng)
  const lng = `$${values.length}::double precision`

  return haversineSql({ lat, lng }, columns)
}
