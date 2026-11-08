'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { LOCATIONS } from '@/lib/constants'
import type { PropertiInput } from '@/lib/my-properties'

interface PropertiFormProps {
  /** Nilai awal saat mengubah properti yang sudah ada. */
  awal?: Partial<PropertiInput>
  /** Label tombol kirim, berbeda antara tambah dan simpan perubahan. */
  labelKirim: string
  onKirim: (input: PropertiInput) => Promise<void>
}

const KOTA = Array.from(new Set(LOCATIONS.map((location) => location.city)))

/**
 * Formulir properti, dipakai bersama oleh halaman tambah dan halaman ubah.
 *
 * Satu formulir untuk keduanya supaya isian yang wajib tidak bisa berbeda
 * antara saat mendaftarkan kos dan saat mengubahnya. Kalau dua formulir
 * ditulis terpisah, salah satunya hampir pasti tertinggal ketika aturan
 * validasinya berubah.
 *
 * Koordinat diisi manual, bukan lewat peta. Peta butuh kunci penyedia layanan
 * dan koneksi internet yang belum tentu ada di tempat pemilik mengisi; dua
 * isian angka selalu bisa dipakai, dan yang salah ketik masih bisa diperbaiki
 * kapan saja.
 */
export function PropertiForm({ awal, labelKirim, onKirim }: PropertiFormProps) {
  const [name, setName] = useState(awal?.name ?? '')
  const [description, setDescription] = useState(awal?.description ?? '')
  const [address, setAddress] = useState(awal?.address ?? '')
  const [province, setProvince] = useState(awal?.province ?? '')
  const [city, setCity] = useState(awal?.city ?? '')
  const [district, setDistrict] = useState(awal?.district ?? '')
  const [subdistrict, setSubdistrict] = useState(awal?.subdistrict ?? '')
  const [postalCode, setPostalCode] = useState(awal?.postalCode ?? '')
  const [propertyType, setPropertyType] = useState(awal?.propertyType ?? 'KOS_CAMPUR')
  const [genderPolicy, setGenderPolicy] = useState(awal?.genderPolicy ?? 'campur')
  const [latitude, setLatitude] = useState(awal?.latitude?.toString() ?? '')
  const [longitude, setLongitude] = useState(awal?.longitude?.toString() ?? '')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  // Satu koordinat tanpa pasangannya ditolak sejak di sini, bukan dibiarkan
  // terkirim lalu ditolak server: pesannya sama, tetapi yang ini muncul sebelum
  // pemilik menekan tombol dan kehilangan isian lain di layar kecil.
  const koordinatSetengah = (latitude.trim() === '') !== (longitude.trim() === '')

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (koordinatSetengah) {
      setGalat('Isi lintang dan bujur bersamaan, atau kosongkan keduanya.')
      return
    }

    setSibuk(true)
    setGalat(null)

    try {
      await onKirim({
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        province: province.trim(),
        city: city.trim(),
        district: district.trim(),
        subdistrict: subdistrict.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        latitude: latitude.trim() === '' ? undefined : Number(latitude),
        longitude: longitude.trim() === '' ? undefined : Number(longitude),
        propertyType,
        genderPolicy,
      })
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Properti tidak tersimpan')
    } finally {
      setSibuk(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Isian label="Nama properti" wajib>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder="Mis. Kos Melati Putri"
          className={ISIAN}
        />
      </Isian>

      <Isian label="Deskripsi" keterangan="Pilih-pilih layak disebut di sini, misalnya suasana dan aturan yang khas.">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Ceritakan singkat tentang kos ini"
          className={`${ISIAN} h-auto py-3`}
        />
      </Isian>

      <Isian label="Alamat" wajib>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          required
          minLength={5}
          maxLength={300}
          placeholder="Jalan, nomor, RT/RW"
          className={ISIAN}
        />
      </Isian>

      <div className="grid gap-4 sm:grid-cols-2">
        <Isian label="Provinsi" wajib>
          <input
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            required
            maxLength={80}
            placeholder="Mis. Jawa Barat"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Kota atau kabupaten" wajib>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            required
            maxLength={80}
            list="daftar-kota"
            placeholder="Mis. Bandung"
            className={ISIAN}
          />
          <datalist id="daftar-kota">
            {KOTA.map((nama) => (
              <option key={nama} value={nama} />
            ))}
          </datalist>
        </Isian>

        <Isian label="Kecamatan" wajib>
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            required
            maxLength={80}
            placeholder="Mis. Coblong"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Kelurahan">
          <input
            value={subdistrict}
            onChange={(event) => setSubdistrict(event.target.value)}
            maxLength={80}
            className={ISIAN}
          />
        </Isian>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Isian label="Kode pos">
          <input
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            maxLength={10}
            inputMode="numeric"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Lintang" keterangan="Mis. -6.8901">
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            inputMode="decimal"
            className={ISIAN}
          />
        </Isian>

        <Isian label="Bujur" keterangan="Mis. 107.6108">
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            inputMode="decimal"
            className={ISIAN}
          />
        </Isian>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Isian label="Jenis kos" wajib>
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className={ISIAN}
          >
            <option value="KOS_PUTRA">Kos Putra</option>
            <option value="KOS_PUTRI">Kos Putri</option>
            <option value="KOS_CAMPUR">Kos Campur</option>
          </select>
        </Isian>

        <Isian label="Kebijakan penghuni" wajib>
          <select
            value={genderPolicy}
            onChange={(event) => setGenderPolicy(event.target.value)}
            className={ISIAN}
          >
            <option value="putra">Hanya putra</option>
            <option value="putri">Hanya putri</option>
            <option value="campur">Campur</option>
          </select>
        </Isian>
      </div>

      {koordinatSetengah && (
        <p className="text-sm text-rose-700">
          Isi lintang dan bujur bersamaan, atau kosongkan keduanya.
        </p>
      )}

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
          disabled={sibuk || koordinatSetengah}
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

/** Satu isian beserta label dan keterangan pendek di bawahnya. */
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
      {keterangan && <span className="mt-1 block text-[11px] text-muted-foreground/80">{keterangan}</span>}
    </label>
  )
}
