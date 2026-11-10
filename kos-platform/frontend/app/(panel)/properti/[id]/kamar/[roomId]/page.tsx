'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Loader2, Trash2 } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { EmptyRow, Panel } from '@/components/dashboard/kit'
import { KamarForm } from '@/components/owner/kamar-form'
import { fetchMyProperty, type PropertiKelolaDetail } from '@/lib/my-properties'
import {
  deleteRoom,
  deleteRoomPhoto,
  fetchRoom,
  updateRoom,
  uploadRoomPhoto,
  type KamarDetail,
  type KamarUbahInput,
} from '@/lib/rooms'
import { BATHROOM_LABEL, ROOM_STATUS_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Satu kamar milik pemilik: rincian, foto, dan formulir ubah.
 *
 * Halaman ini juga tempat penghapusan kamar, dengan konfirmasi yang menyebut
 * nomor kamarnya. Kamar yang masih terikat booking atau kontrak ditolak server,
 * dan pesannya ditampilkan apa adanya supaya pemiliknya tahu apa yang menahan.
 */
export default function KamarDetailPage() {
  const params = useParams<{ id: string; roomId: string }>()
  const router = useRouter()
  const { user, status } = useSession()
  const [properti, setProperti] = useState<PropertiKelolaDetail | null>(null)
  const [kamar, setKamar] = useState<KamarDetail | null>(null)
  const [siap, setSiap] = useState(false)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<string | null>(null)
  const [sukses, setSukses] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)
  const berkasRef = useRef<HTMLInputElement>(null)

  const muat = useCallback(async (): Promise<void> => {
    const [k, p] = await Promise.all([fetchRoom(params.roomId), fetchMyProperty(params.id)])
    setKamar(k)
    setProperti(p)
  }, [params.roomId, params.id])

  useEffect(() => {
    let aktif = true

    if (status === 'memuat') return

    if (status === 'tamu' || !user) {
      setSiap(true)
      return
    }

    void Promise.all([fetchRoom(params.roomId), fetchMyProperty(params.id)]).then(([k, p]) => {
      if (!aktif) return
      setKamar(k)
      setProperti(p)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.roomId, params.id])

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

  const kirimFoto = async (berkas: File): Promise<void> => {
    // Foto pertama otomatis jadi utama: kamar tanpa foto utama akan tampil
    // sebagai kotak kosong di halaman pencarian, dan pemilik yang baru
    // mengunggah satu foto hampir pasti menginginkannya sebagai wajah kamarnya.
    await uploadRoomPhoto(params.roomId, berkas, {
      altText: alt.trim() || undefined,
      isPrimary: (kamar?.photos.length ?? 0) === 0,
    })
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Masuk untuk membuka kamar</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!kamar || !properti) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-20 text-center sm:px-6 lg:px-8">
        <h1 className="text-balance font-heading text-2xl font-semibold tracking-[-0.03em]">Kamar tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kamar ini mungkin sudah dihapus, atau bukan milik properti Anda.
        </p>
        <Link
          href={`/properti/${params.id}`}
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
        >
          Kembali ke properti
        </Link>
      </div>
    )
  }

  const simpanUbah = async (input: KamarUbahInput): Promise<void> => {
    await updateRoom(kamar.id, input)
    await muat()
    setSukses('Perubahan kamar tersimpan')
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <Link
        href={`/properti/${properti.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {properti.name}
      </Link>

      <header className="mt-4">
        <h1 className="text-balance font-heading font-semibold leading-[1.08] tracking-[-0.035em] text-[clamp(1.75rem,3.6vw,2.6rem)]">
          Kamar {kamar.roomNumber}
          {kamar.roomName ? ` · ${kamar.roomName}` : ''}
        </h1>
        {/* Harga sengaja tidak diulang di sini: nomor kamar adalah identitas
            barisnya, dan harganya sudah punya tempat sendiri di formulir
            penyuntingan di bawah. Dua angka rupiah di satu layar membuat
            yang mana bisa diubah jadi tidak jelas. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {BATHROOM_LABEL[kamar.bathroomType] ?? kamar.bathroomType} ·{' '}
          {ROOM_STATUS_LABEL[kamar.availabilityStatus] ?? kamar.availabilityStatus}
        </p>
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

      <div className="mt-6 space-y-6">
        <Panel
          title="Foto kamar"
          description={
            kamar.photos.length === 0
              ? 'Belum ada foto. Kamar tanpa foto jarang dibuka calon penghuni.'
              : `${kamar.photos.length} foto. Foto pertama jadi wajah kamar ini.`
          }
        >
          {kamar.photos.length === 0 ? (
            <EmptyRow>Belum ada foto untuk kamar ini.</EmptyRow>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kamar.photos.map((foto) => (
                <li key={foto.id} className="group relative">
                  <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted">
                    {foto.url ? (
                      <Image
                        src={foto.url}
                        alt={foto.alt ?? `Kamar ${kamar.roomNumber}`}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-xs text-muted-foreground">
                        Foto tidak bisa dimuat
                      </span>
                    )}
                  </div>

                  {foto.isPrimary && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Utama
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={sibuk}
                    onClick={() =>
                      jalankan(() => deleteRoomPhoto(kamar.id, foto.id), 'Foto dihapus')
                    }
                    aria-label={`Hapus foto kamar ${kamar.roomNumber}`}
                    className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-rose-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                  >
                    {sibuk ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-border pt-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Keterangan foto untuk pembaca layar
              </span>
              <input
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                maxLength={200}
                placeholder="Mis. Kamar dengan tempat tidur dan meja belajar"
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <input
              ref={berkasRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const berkas = event.target.files?.[0]
                if (!berkas) return
                setAlt('')
                void jalankan(() => kirimFoto(berkas), 'Foto terunggah')
                event.target.value = ''
              }}
            />

            <button
              type="button"
              disabled={sibuk}
              onClick={() => berkasRef.current?.click()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {sibuk ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              Unggah foto
            </button>

            <p className="mt-2 text-xs text-muted-foreground">
              JPEG, PNG, atau WebP, maksimal 8 MB per foto.
            </p>
          </div>
        </Panel>

        <Panel title="Ubah data kamar" description="Perubahan langsung tersimpan.">
          <KamarForm
            propertyId={properti.id}
            awal={{
              roomNumber: kamar.roomNumber,
              roomName: kamar.roomName,
              description: kamar.description,
              roomType: kamar.roomType,
              areaWidth: kamar.areaWidth,
              areaLength: kamar.areaLength,
              monthlyPrice: kamar.monthlyPrice,
              maximumOccupants: kamar.maximumOccupants,
              bathroomType: kamar.bathroomType,
              floorNumber: kamar.floorNumber,
              availabilityStatus: kamar.availabilityStatus,
              facilityNames: kamar.facilities,
            }}
            labelKirim="Simpan perubahan"
            onKirim={simpanUbah}
          />
        </Panel>

        <Panel title="Hapus kamar" description="Penghapusan tidak bisa dibatalkan.">
          {konfirmasiHapus ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm leading-relaxed text-rose-800">
                Hapus kamar {kamar.roomNumber} beserta fotonya? Riwayat sewa yang pernah menunjuk
                kamar ini akan kehilangan kamarnya.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() =>
                    jalankan(async () => {
                      await deleteRoom(kamar.id)
                      router.push(`/properti/${properti.id}`)
                      router.refresh()
                    }, 'Kamar dihapus')
                  }
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:opacity-60',
                  )}
                >
                  {sibuk && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                  Ya, hapus kamar ini
                </button>
                <button
                  type="button"
                  onClick={() => setKonfirmasiHapus(false)}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKonfirmasiHapus(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Hapus kamar ini
            </button>
          )}
        </Panel>
      </div>
    </div>
  )
}
