/**
 * Klien data verifikasi pemilik kos.
 *
 * Dipakai dua sisi sekaligus: pemilik yang mengunggah dokumen dan mengajukan
 * verifikasi, serta admin yang meninjau dan memutuskan. Keduanya berbicara
 * tentang data yang sama, jadi menaruhnya di satu berkas membuat perbedaan
 * kedua sisi itu terlihat dalam satu layar.
 *
 * Fungsi baca mengembalikan `null` bila API tidak dapat dihubungi atau sesinya
 * bukan peran yang tepat, sama seperti klien lain. Fungsi tulis melempar pesan
 * dari server, karena sebab kegagalannya spesifik (dokumen wajib belum
 * lengkap, pengajuan sudah dikirim) dan penggunanya perlu membaca yang mana.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** Jenis dokumen yang bisa diunggah, beserta sebutannya. */
export const JENIS_DOKUMEN = [
  {
    value: 'KTP',
    label: 'KTP',
    hint: 'Foto KTP yang datanya masih terbaca jelas.',
    wajib: true,
  },
  {
    value: 'SELFIE_KTP',
    label: 'Swafoto dengan KTP',
    hint: 'Wajah Anda dan KTP dalam satu foto, tanpa penutup kepala yang menutupi wajah.',
    wajib: true,
  },
  {
    value: 'NPWP',
    label: 'NPWP',
    hint: 'Kosongkan bila Anda belum punya. Untuk keperluan pajak sewa.',
    wajib: false,
  },
  {
    value: 'IZIN_USAHA',
    label: 'Izin usaha',
    hint: 'Kosongkan bila kos dikelola perorangan tanpa badan usaha.',
    wajib: false,
  },
  {
    value: 'REKENING',
    label: 'Buku rekening',
    hint: 'Halaman yang memuat nama pemilik dan nomor rekeningnya.',
    wajib: false,
  },
] as const

export type JenisDokumen = (typeof JENIS_DOKUMEN)[number]['value']

export interface DokumenVerifikasi {
  id: string
  documentType: string
  label: string
  verificationStatus: string
  rejectionReason: string | null
  createdAt: string | null
  signedUrl: string | null
}

export interface VerifikasiPemilik {
  status: string
  documentStatus: string
  businessName: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  requiredDocuments: string[]
  documents: DokumenVerifikasi[]
}

export interface PemilikAdmin {
  id: string
  fullName: string
  email: string
  phoneNumber: string | null
  status: string
  businessName: string | null
  totalDocuments: number
  verifiedAt: string | null
  updatedAt: string | null
  createdAt: string | null
}

export interface PemilikDetail extends PemilikAdmin {
  accountStatus: string
  documentStatus: string
  description: string | null
  requiredDocuments: string[]
  documents: DokumenVerifikasi[]
}

const pesan = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const data = payload as { message?: string; errors?: { message: string }[] }
    return data.errors?.[0]?.message ?? data.message ?? fallback
  }
  return fallback
}

async function ambil<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1${path}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: T }
    return payload.data
  } catch {
    return null
  }
}

async function kirim<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: 'include',
    ...init,
  })

  const payload = (await response.json().catch(() => null)) as { data?: T } | null

  if (!response.ok) {
    throw new Error(pesan(payload, 'Permintaan tidak berhasil'))
  }

  return payload?.data as T
}

/** Keadaan verifikasi pemilik yang sedang masuk, beserta dokumennya. */
export async function fetchVerifikasiSaya(): Promise<VerifikasiPemilik | null> {
  return ambil<VerifikasiPemilik>('/owner-verification')
}

/**
 * Unggah satu dokumen, atau ganti dokumen jenis itu yang sudah ada.
 *
 * Batas ukuran dan jenis berkas tidak ditulis di sini: server yang menentukan,
 * dan pesannya yang ditampilkan bila ditolak. Menyalin batasnya di klien
 * membuat dua angka yang harus diubah bersamaan tanpa ada yang mengingatkan.
 */
export async function unggahDokumen(
  documentType: JenisDokumen,
  file: File,
): Promise<DokumenVerifikasi> {
  const form = new FormData()
  form.append('documentType', documentType)
  form.append('document', file)

  // Tanpa header Content-Type: peramban yang menuliskannya sendiri beserta
  // boundary multipart-nya, dan menuliskannya manual membuat berkasnya rusak.
  return kirim<DokumenVerifikasi>('/owner-verification/documents', {
    method: 'POST',
    body: form,
  })
}

export async function hapusDokumen(id: string): Promise<unknown> {
  return kirim(`/owner-verification/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function kirimPengajuanVerifikasi(): Promise<{ status: string }> {
  return kirim<{ status: string }>('/owner-verification/submit', { method: 'POST' })
}

/** Daftar pemilik untuk admin. */
export async function fetchPemilikAdmin(
  params: { status?: string; q?: string } = {},
): Promise<PemilikAdmin[] | null> {
  const query = new URLSearchParams({ limit: '50' })
  if (params.status) query.set('status', params.status)
  if (params.q) query.set('q', params.q)

  return ambil<PemilikAdmin[]>(`/admin/pemilik?${query.toString()}`)
}

/** Satu pemilik beserta dokumennya, dengan tautan bertanda tangan. */
export async function fetchPemilikDetail(id: string): Promise<PemilikDetail | null> {
  return ambil<PemilikDetail>(`/admin/pemilik/${encodeURIComponent(id)}`)
}

export async function putuskanPemilik(
  id: string,
  status: 'VERIFIED' | 'REJECTED',
  notes?: string,
): Promise<unknown> {
  return kirim(`/admin/pemilik/${encodeURIComponent(id)}/verifikasi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  })
}
