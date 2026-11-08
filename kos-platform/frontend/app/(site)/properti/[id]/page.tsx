'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel, StatusBadge } from '@/components/dashboard/kit'
import { PropertiForm } from '@/components/owner/properti-form'
import {
  fetchMyProperty,
  setPropertyPublication,
  submitPropertyForReview,
  updateProperty,
  type PropertiInput,
  type PropertiKelolaDetail,
} from '@/lib/my-properties'
import {
  BATHROOM_LABEL,
  PROPERTY_TYPE_LABEL,
  ROOM_STATUS_LABEL,
  formatRupiah,
} from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu properti milik pemilik: rincian, daftar kamar, dan formulir ubah.
 *
 * Formulirnya ada di halaman yang sama, bukan halaman ubah tersendiri. Pemilik
 * yang mengubah properti hampir selalu ingin melihat kamar dan statusnya
 * sekaligus, dan berpindah halaman hanya untuk mengganti satu isian membuat
 * konteksnya hilang.
 *
 * Tombol pengajuan verifikasi baru muncul saat properti punya setidaknya satu
 * kamar. Properti tanpa kamar tidak bisa dipesan siapa pun, jadi meloloskan
 * verifikasinya hanya menghasilkan halaman kos yang tidak menawarkan apa-apa.
 */
export default function PropertiDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, status } = useSession()
  const [data, setData] = useState<PropertiKelolaDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)

  const muat = useCallback(async (): Promise<void> => {
    setData(await fetchMyProperty(params.id))
  }, [params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void fetchMyProperty(params.id).then((hasil) => {
      if (!aktif) return
      setData(hasil)
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

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk membuka properti</h1>
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
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Properti tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Properti ini mungkin sudah dihapus, atau bukan milik akun Anda.
        </p>
        <Link
          href="/properti"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke properti saya
        </Link>
      </div>
    )
  }

  const bisaDiajukan =
    (data.verificationStatus === 'PENDING' || data.verificationStatus === 'REJECTED') &&
    data.rooms.length > 0

  const simpanUbah = async (input: PropertiInput): Promise<void> => {
    await updateProperty(data.id, input)
    await muat()
    setSukses('Perubahan tersimpan')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/properti"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Properti saya
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{data.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.district}, {data.city} · {PROPERTY_TYPE_LABEL[data.propertyType] ?? data.propertyType}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={data.verificationStatus} jenis="verifikasi" />
          <StatusBadge status={data.publicationStatus} jenis="publikasi" />
        </div>
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
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {sukses}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {bisaDiajukan && (
          <Tombol
            onClick={() =>
              jalankan(() => submitPropertyForReview(data.id), 'Properti diajukan untuk ditinjau admin')
            }
            sibuk={sibuk}
            utama
          >
            Ajukan verifikasi
          </Tombol>
        )}

        {data.verificationStatus === 'VERIFIED' && data.publicationStatus !== 'PUBLISHED' && (
          <Tombol
            onClick={() =>
              jalankan(
                () => setPropertyPublication(data.id, 'PUBLISHED'),
                'Properti terbit di daftar pencarian',
              )
            }
            sibuk={sibuk}
            utama
          >
            Terbitkan
          </Tombol>
        )}

        {data.publicationStatus === 'PUBLISHED' && (
          <>
            <Link
              href={`/kos/${data.slug}`}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Lihat halaman kos
            </Link>
            <Tombol
              onClick={() =>
                jalankan(
                  () => setPropertyPublication(data.id, 'UNPUBLISHED'),
                  'Properti ditarik dari daftar publik',
                )
              }
              sibuk={sibuk}
            >
              Tarik dari daftar
            </Tombol>
          </>
        )}
      </div>

      {data.verificationStatus === 'PENDING' && data.rooms.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Tambahkan kamar lebih dulu sebelum mengajukan verifikasi. Properti tanpa kamar tidak bisa
          dipesan siapa pun, jadi belum ada yang bisa ditinjau admin.
        </p>
      )}

      {data.verificationStatus === 'REJECTED' && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
          Properti ini ditolak admin. Perbaiki isinya sesuai catatan peninjauan, lalu ajukan ulang.
        </p>
      )}

      <div className="mt-6 space-y-6">
        <Panel title="Kamar" description={`${data.rooms.length} kamar terdaftar.`}>
          {data.rooms.length === 0 ? (
            <EmptyRow>
              Belum ada kamar. Kamar ditambahkan lewat halaman detail kos, karena harga dan
              fasilitasnya melekat ke kamar, bukan ke bangunannya.
            </EmptyRow>
          ) : (
            <ul className="divide-y divide-border">
              {data.rooms.map((kamar) => (
                <li key={kamar.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      Kamar {kamar.roomNumber}
                      {kamar.roomName ? ` · ${kamar.roomName}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRupiah(kamar.monthlyPrice)} per bulan ·{' '}
                      {BATHROOM_LABEL[kamar.bathroomType] ?? kamar.bathroomType} · maksimal{' '}
                      {kamar.maximumOccupants} orang
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {ROOM_STATUS_LABEL[kamar.availabilityStatus] ?? kamar.availabilityStatus}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {data.costs.length > 0 && (
          <Panel title="Komponen biaya" description="Yang tampil di halaman kos sebagai rincian biaya.">
            <ul className="divide-y divide-border">
              {data.costs.map((biaya) => (
                <li key={biaya.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{biaya.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {biaya.isMandatory ? 'Wajib' : 'Opsional'}
                      {biaya.isRefundable ? ' · dapat dikembalikan' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatRupiah(biaya.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Ubah data properti" description="Perubahan langsung tersimpan, tanpa draf terpisah.">
          <PropertiForm
            awal={{
              name: data.name,
              description: data.description ?? '',
              address: data.address,
              province: data.province,
              city: data.city,
              district: data.district,
              subdistrict: data.subdistrict ?? '',
              postalCode: data.postalCode ?? '',
              propertyType: data.propertyType,
              genderPolicy: data.genderPolicy,
              latitude: data.latitude ?? undefined,
              longitude: data.longitude ?? undefined,
            }}
            labelKirim="Simpan perubahan"
            onKirim={simpanUbah}
          />
        </Panel>
      </div>
    </div>
  )
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama = false,
}: {
  children: React.ReactNode
  onClick: () => void
  sibuk: boolean
  utama?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sibuk}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60',
        utama
          ? 'bg-primary text-primary-foreground hover:bg-primary-strong'
          : 'border border-border hover:bg-muted',
      )}
    >
      {sibuk && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
