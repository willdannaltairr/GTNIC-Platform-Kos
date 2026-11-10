'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchFacilities, type Fasilitas, type KamarInput, type KamarUbahInput } from '@/lib/rooms'

export interface KamarAwal {
  roomNumber?: string
  roomName?: string | null
  description?: string | null
  roomType?: string
  areaWidth?: number | null
  areaLength?: number | null
  monthlyPrice?: number
  maximumOccupants?: number
  bathroomType?: string
  floorNumber?: number | null
  availabilityStatus?: string
  facilityNames?: string[]
}

interface KamarFormProps {
  /** Id properti pemilik kamar ini; hanya dipakai saat menambah. */
  propertyId: string
  awal?: KamarAwal
  labelKirim: string
  onKirim: (input: KamarInput | KamarUbahInput) => Promise<void>
}

const STATUS = [
  { value: 'AVAILABLE', label: 'Tersedia' },
  { value: 'RESERVED', label: 'Dipesan' },
  { value: 'OCCUPIED', label: 'Terisi' },
  { value: 'MAINTENANCE', label: 'Perawatan' },
  { value: 'INACTIVE', label: 'Nonaktif' },
]

/**
 * Formulir kamar, dipakai bersama halaman tambah dan halaman ubah.
 *
 * Fasilitas dicentang dari daftar yang sudah ada, bukan diketik bebas. Yang
 * diketik bebas akan jadi teks yang berbeda-beda untuk hal yang sama, dan
 * penyaring fasilitas di halaman pencarian tidak akan pernah menemukannya.
 *
 * Fasilitas yang sudah melekat pada kamar dicocokkan lewat namanya. Backend
 * menyimpan relasinya sebagai id, tetapi hanya mengirim nama di respons kamar,
 * jadi pencocokannya dilakukan di sini dengan satu permintaan daftar fasilitas.
 */
export function KamarForm({ propertyId, awal, labelKirim, onKirim }: KamarFormProps) {
  const [daftarFasilitas, setDaftarFasilitas] = useState<Fasilitas[] | null>(null)
  const [facilityIds, setFacilityIds] = useState<string[]>([])
  const [roomNumber, setRoomNumber] = useState(awal?.roomNumber ?? '')
  const [roomName, setRoomName] = useState(awal?.roomName ?? '')
  const [description, setDescription] = useState(awal?.description ?? '')
  const [roomType] = useState(awal?.roomType ?? 'reguler')
  const [monthlyPrice, setMonthlyPrice] = useState(awal?.monthlyPrice?.toString() ?? '')
  const [maximumOccupants, setMaximumOccupants] = useState(String(awal?.maximumOccupants ?? 1))
  const [bathroomType, setBathroomType] = useState(awal?.bathroomType ?? 'shared')
  const [areaWidth, setAreaWidth] = useState(awal?.areaWidth?.toString() ?? '')
  const [areaLength, setAreaLength] = useState(awal?.areaLength?.toString() ?? '')
  const [floorNumber, setFloorNumber] = useState(awal?.floorNumber?.toString() ?? '')
  const [availabilityStatus, setAvailabilityStatus] = useState(awal?.availabilityStatus ?? 'AVAILABLE')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true

    void fetchFacilities('ROOM').then((hasil) => {
      if (!aktif) return
      setDaftarFasilitas(hasil)

      // Fasilitas kamar yang sudah ada dicentang lewat namanya.
      if (hasil && awal?.facilityNames) {
        const nama = new Set(awal.facilityNames)
        setFacilityIds(hasil.filter((item) => nama.has(item.name)).map((item) => item.id))
      }
    })

    return () => {
      aktif = false
    }
  }, [awal?.facilityNames])

  const angkaAtau = (teks: string): number | undefined => {
    const bersih = teks.trim()
    if (bersih === '') return undefined
    const n = Number(bersih)
    return Number.isFinite(n) ? n : undefined
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    const harga = angkaAtau(monthlyPrice)
    if (harga === undefined || harga <= 0) {
      setGalat('Harga sewa wajib diisi dan lebih dari nol.')
      return
    }

    setSibuk(true)
    setGalat(null)

    try {
      await onKirim({
        propertyId,
        roomNumber: roomNumber.trim(),
        roomName: roomName.trim() || undefined,
        description: description.trim() || undefined,
        roomType,
        monthlyPrice: harga,
        maximumOccupants: Number(maximumOccupants) || 1,
        bathroomType: bathroomType as 'private' | 'shared',
        areaWidth: angkaAtau(areaWidth),
        areaLength: angkaAtau(areaLength),
        floorNumber: angkaAtau(floorNumber),
        availabilityStatus,
        facilityIds,
      })
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Kamar tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Isian label="Nomor kamar" wajib keterangan="Boleh huruf dan angka, mis. A1 atau 3B">
          <input
            value={roomNumber}
            onChange={(event) => setRoomNumber(event.target.value)}
            required
            maxLength={20}
            className={ISIAN}
          />
        </Isian>

        <Isian label="Nama kamar" keterangan="Opsional, mis. Kamar Sudut">
          <input
            value={roomName ?? ''}
            onChange={(event) => setRoomName(event.target.value)}
            maxLength={100}
            className={ISIAN}
          />
        </Isian>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Isian label="Harga per bulan" wajib>
          <input
            value={monthlyPrice}
            onChange={(event) => setMonthlyPrice(event.target.value)}
            required
            inputMode="numeric"
            placeholder="1500000"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Maksimal penghuni">
          <select
            value={maximumOccupants}
            onChange={(event) => setMaximumOccupants(event.target.value)}
            className={ISIAN}
          >
            {[1, 2, 3, 4].map((jumlah) => (
              <option key={jumlah} value={jumlah}>
                {jumlah} orang
              </option>
            ))}
          </select>
        </Isian>

        <Isian label="Kamar mandi">
          <select
            value={bathroomType}
            onChange={(event) => setBathroomType(event.target.value)}
            className={ISIAN}
          >
            <option value="shared">Luar kamar</option>
            <option value="private">Dalam kamar</option>
          </select>
        </Isian>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Isian label="Lebar (m)">
          <input
            value={areaWidth}
            onChange={(event) => setAreaWidth(event.target.value)}
            inputMode="decimal"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Panjang (m)">
          <input
            value={areaLength}
            onChange={(event) => setAreaLength(event.target.value)}
            inputMode="decimal"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Lantai">
          <input
            value={floorNumber}
            onChange={(event) => setFloorNumber(event.target.value)}
            inputMode="numeric"
            className={ISIAN}
          />
        </Isian>
      </div>

      <div className="grid gap-4">
        <Isian label="Status ketersediaan" wajib>
          <select
            value={availabilityStatus}
            onChange={(event) => setAvailabilityStatus(event.target.value)}
            className={ISIAN}
          >
            {STATUS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Isian>
      </div>

      <Isian label="Deskripsi" keterangan="Keadaan kamar apa adanya, mis. jendela menghadap jalan.">
        <textarea
          value={description ?? ''}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={2000}
          className={`${ISIAN} h-auto py-3`}
        />
      </Isian>

      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">Fasilitas kamar</legend>

        {daftarFasilitas === null ? (
          <p className="mt-2 text-xs text-muted-foreground">Fasilitas belum bisa dimuat.</p>
        ) : daftarFasilitas.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Belum ada fasilitas kamar yang bisa dipilih.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {daftarFasilitas.map((item) => {
              const dipilih = facilityIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={dipilih}
                  onClick={() =>
                    setFacilityIds((nilai) =>
                      dipilih ? nilai.filter((id) => id !== item.id) : [...nilai, item.id],
                    )
                  }
                  className={
                    dipilih
                      ? 'rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors'
                      : 'rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
                  }
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        )}
      </fieldset>

      {galat && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {galat}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={sibuk}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-60"
        >
          {sibuk && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {sibuk ? 'Menyimpan...' : labelKirim}
        </button>
      </div>
    </form>
  )
}

const ISIAN =
  'mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Isian({
  label,
  keterangan,
  wajib = false,
  children,
}: {
  label: string
  keterangan?: string
  wajib?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
        {wajib && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {keterangan && (
        <span className="mt-1 block text-[11px] text-muted-foreground/80">{keterangan}</span>
      )}
    </label>
  )
}
