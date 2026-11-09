import { z } from 'npm:zod@3'

/**
 * Pemeriksaan bentuk nilai di batas masuk.
 *
 * Ditaruh di satu tempat karena dua hal yang sama diulang di banyak rute:
 * memastikan id berbentuk UUID, dan mengambil nilai kueri yang boleh kosong.
 *
 * Keduanya punya akibat yang tidak terlihat dari namanya. Tanpa pemeriksaan
 * UUID, id seperti "bukan-uuid" diteruskan apa adanya ke PostgreSQL dan ditolak
 * di sana sebagai galat sintaks, yang sampai ke klien sebagai 500 seolah server
 * yang rusak, padahal permintaannya yang salah bentuk. Tanpa penolong kueri,
 * `searchParams.get` mengembalikan null, sementara seluruh validator mengharap
 * `undefined` untuk field yang tidak dikirim, dan null akan ditolak sebagai
 * nilai yang salah jenis.
 */

export const idParam = (nilai: string, label: string): string =>
  z.string().uuid(`${label} tidak valid`).parse(nilai)

/** Nilai kueri yang tidak dikirim diubah menjadi `undefined`, bukan null. */
export const kueri = (nilai: string | null): string | undefined =>
  nilai === null || nilai === '' ? undefined : nilai

/** Seluruh kueri sebagai objek, dengan nilai kosong dibuang. */
export const kueriObjek = (url: URL): Record<string, string> => {
  const hasil: Record<string, string> = {}
  for (const [kunci, nilai] of url.searchParams) {
    if (nilai !== '') hasil[kunci] = nilai
  }
  return hasil
}
