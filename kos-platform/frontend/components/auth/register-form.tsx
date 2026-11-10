'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Loader2, MailCheck, UserPlus } from 'lucide-react'
import { AuthField } from '@/components/auth/auth-field'
import { AuthMark } from '@/components/auth/auth-mark'
import { registerAccount, type ApiError } from '@/lib/api'
import { fetchFacilities, type Fasilitas } from '@/lib/rooms'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  {
    value: 'TENANT' as const,
    title: 'Saya mencari kos',
    description: 'Cari, bandingkan, dan ajukan sewa kos. Gratis.',
  },
  {
    value: 'OWNER' as const,
    title: 'Saya pemilik kos',
    description: 'Daftarkan kos Anda, kelola kamar, penyewa, dan tagihannya.',
  },
]

/**
 * Syarat password yang ditampilkan di bawah isiannya.
 *
 * Hanya syarat yang benar-benar diperiksa server yang ditulis di sini -
 * `registerSchema` di backend menuntut minimal 8 karakter. Menampilkan syarat
 * seperti "harus ada karakter khusus" hanya akan membuat pengunjung menyusun
 * password yang lebih rumit, lalu tetap diterima tanpa syarat itu.
 */
const PASSWORD_RULES = [{ label: 'Minimal 8 karakter', met: (value: string) => value.length >= 8 }]

/** Pilihan jenis kos, disalin dari validator server supaya sama persis. */
const JENIS_KOS = [
  { value: 'KOS_PUTRA', label: 'Kos putra' },
  { value: 'KOS_PUTRI', label: 'Kos putri' },
  { value: 'KOS_CAMPUR', label: 'Kos campur' },
]

/** Pilihan penghuni yang diterima, disalin dari validator server. */
const KEBIJAKAN_PENGHUNI = [
  { value: 'putra', label: 'Putra saja' },
  { value: 'putri', label: 'Putri saja' },
  { value: 'campur', label: 'Putra dan putri' },
]

/** Keadaan kos yang baru dibuat, dipakai di layar setelah pendaftaran. */
interface KosDibuat {
  name: string
  slug: string
}

/**
 * Formulir pendaftaran.
 *
 * Dipisahkan dari page.tsx supaya halamannya tetap server component dan bisa
 * memasang judul dokumennya sendiri. Susunannya sengaja dibuat sebentuk dengan
 * LoginForm, termasuk isiannya yang memakai AuthField yang sama, supaya
 * berpindah antara masuk dan daftar tidak terasa seperti berpindah aplikasi.
 * Tautan pindah ke halaman masuk ada di kaki kolom (AuthShell), bukan di sini.
 *
 * Pemilik kos mengisi kos pertamanya di sini juga. Yang diminta hanya data yang
 * menentukan kosnya bisa tampil: nama, alamat, jenis, dan fasilitas. Jumlah
 * kamar, harga, dan foto sengaja tidak ditanya saat mendaftar, karena ketiganya
 * lebih enak diisi setelah akunnya jadi, dari halaman pengelolaan properti.
 * Menanyakannya sekarang hanya menghentikan orang di tengah formulir.
 *
 * Fasilitas diambil dari tabel master lewat API, bukan disalin sebagai daftar
 * tetap di sini: pilihan yang disalin cepat atau lambat berbeda dari yang ada di
 * database, dan yang dikirim pendaftar akan ditolak tanpa ia tahu sebabnya.
 */
export function RegisterForm() {
  const [role, setRole] = useState<'TENANT' | 'OWNER'>('TENANT')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [terdaftar, setTerdaftar] = useState<{
    email: string
    devToken: string | null
    kos: KosDibuat | null
  } | null>(null)

  // Isian kos, hanya dipakai saat peran pemilik yang dipilih.
  const [namaKos, setNamaKos] = useState('')
  const [alamatKos, setAlamatKos] = useState('')
  const [provinsi, setProvinsi] = useState('')
  const [kota, setKota] = useState('')
  const [kecamatan, setKecamatan] = useState('')
  const [jenisKos, setJenisKos] = useState('KOS_CAMPUR')
  const [kebijakan, setKebijakan] = useState('campur')
  const [fasilitasDipilih, setFasilitasDipilih] = useState<string[]>([])
  const [fasilitas, setFasilitas] = useState<Fasilitas[]>([])

  // Daftar fasilitas diambil sekali saat komponennya dipasang. Kalau API tidak
  // terjangkau, daftarnya kosong dan pendaftaran tetap bisa jalan tanpa
  // fasilitas: menahan pendaftaran karena daftar centang gagal dimuat jauh
  // lebih merugikan daripada kehilangan beberapa centang.
  useEffect(() => {
    void fetchFacilities().then((hasil) => setFasilitas(hasil ?? []))
  }, [])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      const hasil = await registerAccount({
        fullName,
        email,
        password,
        role,
        ...(role === 'OWNER'
          ? {
              property: {
                name: namaKos.trim(),
                address: alamatKos.trim(),
                province: provinsi.trim(),
                city: kota.trim(),
                district: kecamatan.trim(),
                propertyType: jenisKos as 'KOS_PUTRA' | 'KOS_PUTRI' | 'KOS_CAMPUR',
                genderPolicy: kebijakan as 'putra' | 'putri' | 'campur',
                ...(fasilitasDipilih.length > 0 ? { facilitySlugs: fasilitasDipilih } : {}),
              },
            }
          : {}),
      })

      // Tidak langsung dilempar ke halaman masuk: pendaftar perlu tahu bahwa
      // ada tautan verifikasi menunggu di emailnya, dan itu satu-satunya saat
      // ia masih ingat alamat mana yang baru dipakai.
      setTerdaftar({ email, devToken: hasil?.verifyToken ?? null, kos: hasil?.property ?? null })
    } catch (caught) {
      setError(caught as ApiError)
    } finally {
      setSubmitting(false)
    }
  }

  const fieldError = (name: string) =>
    error?.fields.find((entry) => entry.field === name)?.message

  if (terdaftar) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-primary">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Akun dibuat</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Kami sudah mengirim tautan verifikasi ke{' '}
            <span className="font-medium text-foreground">{terdaftar.email}</span>. Buka
            tautannya supaya pemberitahuan booking, tagihan, dan atur ulang sandi sampai ke
            kotak masuk Anda. Tautannya berlaku 24 jam.
          </p>
        </div>

        {terdaftar.kos && (
          <div className="rounded-2xl bg-accent/60 px-4 py-3 text-xs leading-relaxed text-accent-foreground ring-1 ring-primary/15">
            <p className="font-semibold">Kos pertama Anda sudah terdaftar</p>
            <p className="mt-1">
              <span className="font-medium">{terdaftar.kos.name}</span> tersimpan sebagai draf.
              Setelah masuk, lengkapi kamar, harga, dan fotonya dari halaman Properti, lalu ajukan
              verifikasi supaya kosnya bisa tampil di pencarian.
            </p>
          </div>
        )}

        {terdaftar.devToken && (
          <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
            <p className="font-semibold">Mode pengembangan</p>
            <p className="mt-1">
              Email tidak dikirim karena kunci penyedia email belum diisi. Tautannya:
            </p>
            <Link
              href={`/verifikasi-email?token=${encodeURIComponent(terdaftar.devToken)}`}
              className="mt-1 block break-all font-medium underline"
            >
              /verifikasi-email?token={terdaftar.devToken}
            </Link>
          </div>
        )}

        <Link
          href="/masuk"
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong"
        >
          Masuk ke akun
        </Link>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Belum menerima emailnya? Setelah masuk, halaman profil punya tombol kirim ulang.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <AuthMark icon={UserPlus} />

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Buat akun baru</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Pilih peran Anda di bawah ini.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="text-xs font-medium text-muted-foreground">Saya mendaftar sebagai</legend>
        {/* Dua pilihan peran disandingkan, bukan ditumpuk: formulir ini sudah
            memuat tiga isian, dan pada laptop pendek tinggi tambahan dari dua
            kartu bertumpuk membuat kolomnya harus digulir. */}
        <div className="mt-1.5 grid gap-2.5 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const active = role === option.value

            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-2.5 transition-colors ${
                  active
                    ? 'border-primary bg-accent/60'
                    : 'border-border bg-card/70 hover:border-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={active}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                    active ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  }`}
                  aria-hidden
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-3.5">
        <AuthField
          id="fullName"
          name="fullName"
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Nama sesuai identitas"
          required
          minLength={2}
          value={fullName}
          onChange={setFullName}
        >
          {fieldError('fullName') && (
            <p className="mt-1.5 text-xs text-rose-600">{fieldError('fullName')}</p>
          )}
        </AuthField>

        <AuthField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          required
          value={email}
          onChange={setEmail}
        >
          {fieldError('email') && <p className="mt-1.5 text-xs text-rose-600">{fieldError('email')}</p>}
        </AuthField>

        <AuthField
          id="password"
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          required
          minLength={8}
          value={password}
          onChange={setPassword}
        >
          {/* Titik penandanya menyala hijau begitu syaratnya terpenuhi, jadi
              pengunjung tahu sebelum menekan tombol, bukan setelah ditolak. */}
          <ul className="mt-2 grid gap-1.5">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.met(password)

              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    met ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-1.5 shrink-0 rounded-full transition-colors ${
                      met ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                  />
                  {rule.label}
                  <span className="sr-only">{met ? ', terpenuhi' : ', belum terpenuhi'}</span>
                </li>
              )
            })}
          </ul>

          {fieldError('password') && (
            <p className="mt-1.5 text-xs text-rose-600">{fieldError('password')}</p>
          )}
        </AuthField>
      </div>

      {/* Isian kos muncul begitu peran pemilik dipilih, bukan sebagai langkah
          terpisah di halaman lain: pemilik yang mendaftar sedang memikirkan
          kosnya, dan memisahkannya membuat separuh pendaftar berhenti dengan
          akun yang belum punya kos apa pun. */}
      {role === 'OWNER' && (
        <fieldset className="rounded-2xl border border-border bg-card/60 p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Kos pertama Anda
          </legend>

          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Cukup data yang menentukan kosnya tampil. Kamar, harga, dan foto dilengkapi setelah
            masuk, dari halaman Properti.
          </p>

          <div className="mt-4 grid gap-4">
            <AuthField
              id="namaKos"
              name="namaKos"
              label="Nama kos"
              autoComplete="organization"
              placeholder="Mis. Kos Melati Putri"
              required
              minLength={3}
              value={namaKos}
              onChange={setNamaKos}
            >
              {fieldError('property.name') && (
                <p className="mt-1.5 text-xs text-rose-600">{fieldError('property.name')}</p>
              )}
            </AuthField>

            <AuthField
              id="alamatKos"
              name="alamatKos"
              label="Alamat"
              autoComplete="street-address"
              placeholder="Jalan, nomor, RT/RW"
              required
              minLength={5}
              value={alamatKos}
              onChange={setAlamatKos}
            >
              {fieldError('property.address') && (
                <p className="mt-1.5 text-xs text-rose-600">{fieldError('property.address')}</p>
              )}
            </AuthField>

            <div className="grid gap-4 sm:grid-cols-3">
              <AuthField
                id="provinsi"
                name="provinsi"
                label="Provinsi"
                autoComplete="address-level1"
                placeholder="DKI Jakarta"
                required
                value={provinsi}
                onChange={setProvinsi}
              >
                {fieldError('property.province') && (
                  <p className="mt-1.5 text-xs text-rose-600">{fieldError('property.province')}</p>
                )}
              </AuthField>

              <AuthField
                id="kota"
                name="kota"
                label="Kota"
                autoComplete="address-level2"
                placeholder="Jakarta Selatan"
                required
                value={kota}
                onChange={setKota}
              >
                {fieldError('property.city') && (
                  <p className="mt-1.5 text-xs text-rose-600">{fieldError('property.city')}</p>
                )}
              </AuthField>

              <AuthField
                id="kecamatan"
                name="kecamatan"
                label="Kecamatan"
                autoComplete="address-level3"
                placeholder="Kebayoran Baru"
                required
                value={kecamatan}
                onChange={setKecamatan}
              >
                {fieldError('property.district') && (
                  <p className="mt-1.5 text-xs text-rose-600">{fieldError('property.district')}</p>
                )}
              </AuthField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Jenis kos</span>
                <select
                  value={jenisKos}
                  onChange={(event) => setJenisKos(event.target.value)}
                  className="w-full rounded-full bg-card px-5 py-3 text-sm text-foreground outline-none ring-1 ring-border/70 transition-shadow focus:ring-2 focus:ring-primary"
                >
                  {JENIS_KOS.map((pilihan) => (
                    <option key={pilihan.value} value={pilihan.value}>
                      {pilihan.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Penghuni yang diterima
                </span>
                <select
                  value={kebijakan}
                  onChange={(event) => setKebijakan(event.target.value)}
                  className="w-full rounded-full bg-card px-5 py-3 text-sm text-foreground outline-none ring-1 ring-border/70 transition-shadow focus:ring-2 focus:ring-primary"
                >
                  {KEBIJAKAN_PENGHUNI.map((pilihan) => (
                    <option key={pilihan.value} value={pilihan.value}>
                      {pilihan.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Fasilitas yang tersedia (boleh dilewati)
              </p>

              {fasilitas.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Daftar fasilitas belum bisa dimuat. Anda bisa menambahkannya nanti dari halaman
                  Properti.
                </p>
              ) : (
                <ul className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                  {fasilitas.map((item) => {
                    const dipilih = fasilitasDipilih.includes(item.slug)

                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-xs transition-colors',
                            dipilih
                              ? 'border-primary bg-accent/60 text-foreground'
                              : 'border-border bg-card/70 text-muted-foreground hover:border-primary/40',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={dipilih}
                            onChange={() =>
                              setFasilitasDipilih((sebelumnya) =>
                                dipilih
                                  ? sebelumnya.filter((slug) => slug !== item.slug)
                                  : [...sebelumnya, item.slug],
                              )
                            }
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={cn(
                              'grid size-4 shrink-0 place-items-center rounded border',
                              dipilih
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-input',
                            )}
                          >
                            {dipilih && <Check className="size-3" />}
                          </span>
                          {item.name}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}

              {fieldError('property.facilitySlugs') && (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldError('property.facilitySlugs')}
                </p>
              )}
            </div>
          </div>
        </fieldset>
      )}

      {error && fieldError('role') === undefined && error.fields.length === 0 && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
          {error.message}
        </p>
      )}

      {error && error.fields.length > 0 && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
          {error.message}. Periksa kembali isian di atas.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary-strong disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitting ? 'Mendaftarkan…' : role === 'OWNER' ? 'Daftar dan simpan kos' : 'Daftar'}
      </button>
    </form>
  )
}
