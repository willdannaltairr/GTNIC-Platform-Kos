'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Camera, Check, Loader2, Plus, Send, Trash2, X } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import {
  BUTIR_BAWAAN,
  fetchPemeriksaanDetail,
  hapusFotoKondisi,
  KEADAAN_BUTIR,
  kirimPemeriksaan,
  LABEL_JENIS,
  putuskanPemeriksaan,
  simpanChecklist,
  ubahPemeriksaan,
  unggahFotoKondisi,
  type ButirInput,
  type KeadaanButir,
  type PemeriksaanDetail,
} from '@/lib/room-condition'
import { formatTanggal, formatTanggalJam } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu pemeriksaan kondisi kamar.
 *
 * Halaman ini tempat kedua pihak bekerja, dan yang boleh dilakukan berbeda
 * menurut statusnya: penghuni mengisi daftar periksa, menambah foto, lalu
 * mengirimnya; pemilik menyetujui atau mengajukan keberatan. Aturan mana yang
 * berlaku ditentukan server, dan tombol di sini hanya menampilkan yang masuk
 * akal dari keadaan sekarang.
 *
 * Daftar periksa disimpan sebagai satu kesatuan lewat tombol simpan, bukan
 * setiap butir diubah langsung. Isian yang diketik setengah jalan karena satu
 * butir tersimpan lebih dulu akan membuat butir lain ikut tersimpan dalam
 * keadaan yang belum selesai.
 */

interface ButirLokal extends ButirInput {
  /** Kunci stabil untuk React; butir baru belum punya id dari server. */
  kunci: string
}

const kunciBaru = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `k-${Math.random().toString(36).slice(2)}`

/** Keadaan yang menandai ada yang perlu ditangani, bukan sekadar tercatat. */
const PERLU_DIPERIKSA: KeadaanButir[] = ['RUSAK_RINGAN', 'RUSAK_BERAT', 'TIDAK_ADA']

export default function KondisiKamarDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<PemeriksaanDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const [butir, setButir] = useState<ButirLokal[]>([])
  const [butirBaru, setButirBaru] = useState('')
  const [keadaanUmum, setKeadaanUmum] = useState('')
  const [alasan, setAlasan] = useState('')
  const [area, setArea] = useState('')
  const berkasRef = useRef<HTMLInputElement>(null)

  const muat = useCallback(async (): Promise<void> => {
    const hasil = await fetchPemeriksaanDetail(params.id)
    setData(hasil)

    if (hasil) {
      setKeadaanUmum(hasil.generalCondition ?? '')
      setButir(
        hasil.checklist.map((item) => ({
          kunci: item.id,
          itemName: item.itemName,
          conditionStatus: (item.conditionStatus ?? 'BAIK') as KeadaanButir,
          notes: item.notes ?? undefined,
        })),
      )
    }
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchPemeriksaanDetail(params.id).then((hasil) => {
      if (!aktif) return

      setData(hasil)

      if (hasil) {
        setKeadaanUmum(hasil.generalCondition ?? '')
        setButir(
          hasil.checklist.map((item) => ({
            kunci: item.id,
            itemName: item.itemName,
            conditionStatus: (item.conditionStatus ?? 'BAIK') as KeadaanButir,
            notes: item.notes ?? undefined,
          })),
        )
      }

      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const jalankan = async (aksi: () => Promise<unknown>, pesanSukses: string): Promise<void> => {
    setSibuk(true)
    setPesan(null)
    setSukses(null)

    try {
      await aksi()
      await muat()
      setSukses(pesanSukses)
    } catch (error) {
      setPesan(error instanceof Error ? error.message : 'Perubahan tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  const ubahButir = (kunci: string, perubahan: Partial<ButirLokal>): void => {
    setButir((lama) => lama.map((item) => (item.kunci === kunci ? { ...item, ...perubahan } : item)))
  }

  const tambahButir = (): void => {
    const nama = butirBaru.trim()
    if (nama.length < 2) return

    // Nama yang sama dua kali ditolak server, dan menolaknya di sini dulu
    // membuat penghuni tidak menunggu perjalanan bolak-balik untuk tahu.
    const kembar = butir.some((item) => item.itemName.trim().toLowerCase() === nama.toLowerCase())
    if (kembar) {
      setPesan(`Butir "${nama}" sudah ada di daftar.`)
      return
    }

    setButir((lama) => [...lama, { kunci: kunciBaru(), itemName: nama, conditionStatus: 'BAIK' }])
    setButirBaru('')
    setPesan(null)
  }

  const kirimFoto = async (berkas: File): Promise<void> => {
    await unggahFotoKondisi(params.id, berkas, { areaName: area.trim() || undefined })
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka pemeriksaan ini</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <Link
          href="/kondisi-kamar"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kondisi kamar
        </Link>
        <div className="mt-6">
          <EmptyRow>
            Pemeriksaan tidak bisa dimuat. Pemeriksaannya mungkin tidak ada, atau bukan milik akun
            Anda.
          </EmptyRow>
        </div>
      </div>
    )
  }

  const penghuni = user.role === 'TENANT'
  const pemilik = data.ownerId === user.id || user.role === 'ADMIN'

  // Penghuni boleh mengisi selama belum disetujui; keberatan pemilik justru
  // membuka jalan untuk memperbaikinya, bukan menutupnya.
  const bolehIsi = penghuni && (data.status === 'DRAFT' || data.status === 'DISPUTED')
  const bolehPutuskan = pemilik && data.status !== 'DRAFT' && data.status !== 'ACKNOWLEDGED'
  const terkunci = data.status === 'ACKNOWLEDGED' || data.status === 'COMPLETED'

  const perluDiperiksa = butir.filter((item) =>
    PERLU_DIPERIKSA.includes(item.conditionStatus),
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href="/kondisi-kamar"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar pemeriksaan
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
            {data.propertyName} · kamar {data.roomNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {LABEL_JENIS[data.reportType] ?? data.reportType}
            {penghuni ? '' : ` · ${data.tenantName}`}
            {data.contractNumber ? ` · ${data.contractNumber}` : ''} ·{' '}
            {formatTanggal(data.reportDate ?? data.createdAt)}
          </p>
        </div>
        <StatusBadge status={data.status} jenis="kondisi" />
      </header>

      {pesan && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {pesan}
        </p>
      )}

      {sukses && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200"
        >
          {sukses}
        </p>
      )}

      {data.status === 'DISPUTED' && (
        <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
          Pemilik tidak menyetujui sebagian isinya. Bacalah alasannya di bawah, perbaiki yang perlu,
          lalu kirim ulang.
        </div>
      )}

      {data.status === 'ACKNOWLEDGED' && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-800 ring-1 ring-emerald-200">
          Pemeriksaan ini sudah disetujui pemilik dan isinya terkunci. Catatan ini yang dipakai bila
          nanti ada perbedaan soal kerusakan.
        </div>
      )}

      {/* Ringkasan keadaan */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Kotak label="Butir diperiksa" nilai={butir.length} />
        <Kotak label="Perlu diketahui pemilik" nilai={perluDiperiksa.length} />
        <Kotak label="Foto" nilai={data.photos.length} />
      </div>

      {/* Daftar periksa */}
      <div className="mt-6">
        <Panel
          title="Daftar periksa"
          description={
            bolehIsi
              ? 'Sebutkan keadaan tiap bagian kamar. Yang rusak beri keterangan sejak kapan, supaya tidak terdebatkan nanti.'
              : 'Keadaan tiap bagian kamar menurut pencatatnya.'
          }
        >
          {butir.length === 0 ? (
            <EmptyRow>
              {bolehIsi
                ? 'Belum ada butir periksa. Tambahkan bagian kamar yang perlu dicatat di bawah.'
                : 'Penghuni belum mengisi daftar periksa.'}
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {butir.map((item) => (
                <li key={item.kunci} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.itemName}</p>

                      {!bolehIsi && item.notes && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {bolehIsi ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={item.conditionStatus}
                          onChange={(event) =>
                            ubahButir(item.kunci, {
                              conditionStatus: event.target.value as KeadaanButir,
                            })
                          }
                          aria-label={`Keadaan ${item.itemName}`}
                          className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {KEADAAN_BUTIR.map((pilihan) => (
                            <option key={pilihan.nilai} value={pilihan.nilai}>
                              {pilihan.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setButir((lama) => lama.filter((x) => x.kunci !== item.kunci))}
                          aria-label={`Buang butir ${item.itemName}`}
                          title="Buang butir"
                          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-rose-600"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <StatusBadge status={item.conditionStatus ?? 'BAIK'} jenis="keadaan" />
                    )}
                  </div>

                  {bolehIsi && (
                    <input
                      value={item.notes ?? ''}
                      onChange={(event) => ubahButir(item.kunci, { notes: event.target.value })}
                      maxLength={500}
                      placeholder="Keterangan, mis. goresan di pintu sudah ada sejak awal"
                      className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {bolehIsi && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium">Tambah butir</span>
                <div className="flex gap-2">
                  <input
                    value={butirBaru}
                    onChange={(event) => setButirBaru(event.target.value)}
                    onKeyDown={(event) => {
                      // Enter menambah butir, bukan mengirim formulir halaman:
                      // daftar periksa diisi dengan banyak penambahan berturut,
                      // dan satu Enter yang mengirim semuanya akan mengagetkan.
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        tambahButir()
                      }
                    }}
                    maxLength={150}
                    placeholder="Mis. Keran wastafel"
                    className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={tambahButir}
                    disabled={butirBaru.trim().length < 2}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Tambah
                  </button>
                </div>
              </label>

              {/* Saran butir yang belum dipakai. Daftarnya sama dengan yang
                  ditawarkan server, dan yang sudah ada disaring keluar supaya
                  tidak ditambahkan dua kali. */}
              {BUTIR_BAWAAN.filter(
                (nama) => !butir.some((item) => item.itemName.toLowerCase() === nama.toLowerCase()),
              ).length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] text-muted-foreground">Bagian yang belum dicatat:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {BUTIR_BAWAAN.filter(
                      (nama) =>
                        !butir.some((item) => item.itemName.toLowerCase() === nama.toLowerCase()),
                    ).map((nama) => (
                      <button
                        key={nama}
                        type="button"
                        onClick={() =>
                          setButir((lama) => [
                            ...lama,
                            { kunci: kunciBaru(), itemName: nama, conditionStatus: 'BAIK' },
                          ])
                        }
                        className="rounded-lg bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        + {nama}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  jalankan(
                    () =>
                      simpanChecklist(
                        params.id,
                        butir.map((item) => ({
                          itemName: item.itemName,
                          conditionStatus: item.conditionStatus,
                          notes: item.notes?.trim() || undefined,
                        })),
                      ),
                    `Daftar periksa tersimpan: ${butir.length} butir.`,
                  )
                }
                disabled={sibuk || butir.length === 0}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
              >
                {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Simpan daftar periksa
              </button>
            </div>
          )}
        </Panel>
      </div>

      {/* Keadaan umum */}
      <div className="mt-6">
        <Panel
          title="Keadaan umum"
          description={
            bolehIsi
              ? 'Satu paragraf tentang keadaan kamar secara keseluruhan. Wajib diisi sebelum dikirim ke pemilik.'
              : 'Keterangan pencatat tentang keadaan kamar secara keseluruhan.'
          }
        >
          {bolehIsi ? (
            <textarea
              value={keadaanUmum}
              onChange={(event) => setKeadaanUmum(event.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Mis. Kamar bersih dan siap dihuni. Lemari bergores ringan sejak awal, ventilasi tidak ada sehingga perlu dibuka pintunya."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {data.generalCondition ?? 'Belum ada keterangan umum.'}
            </p>
          )}

          {bolehIsi && (
            <button
              type="button"
              onClick={() =>
                jalankan(
                  () => ubahPemeriksaan(params.id, { generalCondition: keadaanUmum.trim() || undefined }),
                  'Keterangan umum tersimpan.',
                )
              }
              disabled={sibuk}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
            >
              {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Simpan keterangan
            </button>
          )}
        </Panel>
      </div>

      {/* Foto */}
      <div className="mt-6">
        <Panel
          title="Foto kondisi"
          description="Bukti keadaan yang bisa diperiksa kedua pihak. Foto lama tetap tersimpan sebagai riwayat."
        >
          {data.photos.length === 0 ? (
            <EmptyRow>
              {bolehIsi
                ? 'Belum ada foto. Foto bagian yang rusak sangat menolong saat serah terima kunci nanti.'
                : 'Penghuni belum menambahkan foto.'}
            </EmptyRow>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {data.photos.map((foto) => (
                <li key={foto.id} className="overflow-hidden rounded-xl border border-border">
                  {foto.signedUrl ? (
                    // `img` biasa, bukan `next/image`: tautannya bertanda tangan
                    // dan kedaluwarsa dalam lima menit, sehingga pengoptimal
                    // gambar Next akan menyimpan salinan yang tidak bisa
                    // disegarkan saat tautannya mati.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={foto.signedUrl}
                      alt={foto.description ?? `Foto kondisi kamar ${data.roomNumber}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-muted px-2 text-center text-[11px] text-muted-foreground">
                      Foto tidak bisa dimuat sekarang
                    </div>
                  )}

                  <div className="p-2.5">
                    {foto.areaName && (
                      <p className="text-xs font-medium">{foto.areaName}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {foto.uploaderName} · {formatTanggalJam(foto.createdAt)}
                    </p>

                    {!terkunci && foto.uploadedBy === user.id && (
                      <button
                        type="button"
                        onClick={() => void jalankan(() => hapusFotoKondisi(params.id, foto.id), 'Foto dihapus.')}
                        disabled={sibuk}
                        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11px] font-medium transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Hapus
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!terkunci && (penghuni || pemilik) && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium">
                  Bagian yang difoto <span className="text-muted-foreground">(opsional)</span>
                </span>
                <input
                  value={area}
                  onChange={(event) => setArea(event.target.value)}
                  maxLength={100}
                  placeholder="Mis. Lemari"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <input
                ref={berkasRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const berkas = event.target.files?.[0]
                  if (!berkas) return

                  void jalankan(
                    () => kirimFoto(berkas),
                    'Foto ditambahkan.',
                  ).then(() => {
                    // Isian berkasnya dikosongkan supaya berkas yang sama bisa
                    // dipilih lagi setelah dihapus; tanpa itu, memilih berkas
                    // yang sama dua kali tidak memicu apa pun.
                    if (berkasRef.current) berkasRef.current.value = ''
                  })
                }}
              />

              <button
                type="button"
                onClick={() => berkasRef.current?.click()}
                disabled={sibuk}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                {sibuk ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="size-4" aria-hidden="true" />
                )}
                Tambah foto
              </button>
            </div>
          )}
        </Panel>
      </div>

      {/* Tindakan penghuni */}
      {bolehIsi && (
        <div className="mt-6">
          <Panel
            title="Kirim ke pemilik"
            description="Setelah dikirim, pemilik menyetujui atau mengajukan keberatan. Selama itu isinya tidak bisa diubah."
          >
            {perluDiperiksa.length > 0 && (
              <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
                Ada {perluDiperiksa.length} bagian yang tidak dalam keadaan baik:{' '}
                {perluDiperiksa.map((item) => item.itemName).join(', ')}. Pastikan keterangannya
                cukup jelas sebelum dikirim.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                jalankan(
                  () =>
                    kirimPemeriksaan(
                      params.id,
                      keadaanUmum.trim().length >= 10 ? keadaanUmum.trim() : undefined,
                    ),
                  'Pemeriksaan dikirim ke pemilik untuk disetujui.',
                )
              }
              disabled={sibuk || butir.length === 0 || keadaanUmum.trim().length < 10}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {sibuk ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Kirim ke pemilik
            </button>

            {(butir.length === 0 || keadaanUmum.trim().length < 10) && (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Yang kurang sebelum bisa dikirim:{' '}
                {[
                  butir.length === 0 ? 'daftar periksa masih kosong' : null,
                  keadaanUmum.trim().length < 10 ? 'keadaan umum minimal 10 karakter' : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
                .
              </p>
            )}
          </Panel>
        </div>
      )}

      {/* Tindakan pemilik */}
      {bolehPutuskan && (
        <div className="mt-6">
          <Panel
            title="Keputusan Anda"
            description="Yang Anda setujui di sini jadi acuan bila nanti ada perbedaan soal kerusakan kamar."
          >
            <label className="grid gap-1.5">
              <span className="text-xs font-medium">
                Catatan <span className="text-muted-foreground">(wajib bila tidak setuju)</span>
              </span>
              <textarea
                value={alasan}
                onChange={(event) => setAlasan(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Mis. kran di kamar mandi sudah diganti bulan lalu, tolong dicek ulang keadaannya."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  jalankan(
                    () =>
                      putuskanPemeriksaan(params.id, {
                        setuju: true,
                        notes: alasan.trim() || undefined,
                      }),
                    'Pemeriksaan disetujui. Isinya terkunci sebagai acuan bersama.',
                  )
                }
                disabled={sibuk}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
              >
                {sibuk ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                Setujui
              </button>

              <button
                type="button"
                onClick={() =>
                  jalankan(
                    () => putuskanPemeriksaan(params.id, { setuju: false, notes: alasan.trim() }),
                    'Keberatan tersimpan dan dikirim ke penghuninya.',
                  )
                }
                disabled={sibuk || alasan.trim().length < 10}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                <X className="size-4" aria-hidden="true" />
                Ajukan keberatan
              </button>
            </div>

            {alasan.trim().length < 10 && (
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Keberatan wajib disertai alasan minimal 10 karakter, supaya penghuni tahu bagian mana
                yang tidak Anda setujui.
              </p>
            )}
          </Panel>
        </div>
      )}

      {/* Riwayat persetujuan */}
      {data.acknowledgements.length > 0 && (
        <div className="mt-6">
          <Panel title="Riwayat keputusan" description="Terlama lebih dulu.">
            <ul className="divide-y divide-border">
              {data.acknowledgements.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm font-medium">
                    {item.userName}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {item.type === 'OWNER' ? 'pemilik' : 'penghuni'} ·{' '}
                      {formatTanggalJam(item.acknowledgedAt)}
                    </span>
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Foto disimpan di penyimpanan privat dan hanya bisa dibuka kedua pihak beserta admin, dengan
        tautan yang berlaku sebentar.
      </p>
    </div>
  )
}

/** Kotak angka ringkas di atas halaman. */
function Kotak({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-2 text-2xl font-bold tracking-tight', nilai > 0 && 'text-foreground')}>
        {nilai}
      </p>
    </div>
  )
}
