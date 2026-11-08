'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useSession } from '@/components/session/session-provider'
import { KamarForm } from '@/components/owner/kamar-form'
import { fetchMyProperty, type PropertiKelolaDetail } from '@/lib/my-properties'
import { createRoom, type KamarInput } from '@/lib/rooms'

/**
 * Penambahan kamar pada satu properti.
 *
 * Judulnya menyebut nama propertinya, bukan sekadar "Tambah kamar": pemilik
 * yang mengelola beberapa kos sering berpindah-pindah, dan tanpa nama properti
 * di layar tidak ada cara memastikan kamar ini masuk ke kos yang benar sebelum
 * menekan simpan.
 */
export default function KamarBaruPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, status } = useSession()
  const [properti, setProperti] = useState<PropertiKelolaDetail | null>(null)
  const [siap, setSiap] = useState(false)

  const muat = useCallback(async (): Promise<void> => {
    setProperti(await fetchMyProperty(params.id))
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
      setProperti(hasil)
      setSiap(true)
    })

    return () => {
      aktif = false
    }
  }, [status, user, params.id])

  const simpan = async (input: KamarInput | Partial<KamarInput>): Promise<void> => {
    const hasil = await createRoom(input as KamarInput)
    router.push(`/properti/${params.id}/kamar/${hasil.id}`)
    router.refresh()
  }

  if (status === 'memuat' || !siap) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Masuk untuk menambah kamar</h1>
        <Link
          href="/masuk"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk
        </Link>
      </div>
    )
  }

  if (!properti) {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/properti/${properti.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {properti.name}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tambah kamar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Kamar baru untuk <span className="font-medium text-foreground">{properti.name}</span>.
          Foto bisa ditambahkan setelah kamarnya tersimpan.
        </p>
      </header>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <KamarForm propertyId={properti.id} labelKirim="Simpan kamar" onKirim={simpan} />
      </div>
    </div>
  )
}
