/**
 * Klien data jadwal kunjungan.
 *
 * Kunjungan dipakai bersama dua peran: penghuni menyusun jadwal survei dan
 * mengisi daftar periksanya, pemilik melihat jadwal ke propertinya. Penyaring
 * perannya ada di backend, jadi fungsi di sini tidak menerima id pengguna.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type KunjunganStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface Kunjungan {
  id: string
  propertyId: string
  propertyName: string
  propertySlug: string
  roomNumber: string | null
  scheduledAt: string | null
  status: KunjunganStatus
  notes: string | null
  tenantName: string
  createdAt: string
}

export interface ButirPeriksa {
  id: string
  item: string
  checked: boolean
  notes: string | null
}

export interface CatatanKunjungan {
  id: string
  category: string
  content: string
  createdAt: string
}

export interface KunjunganDetail extends Kunjungan {
  checklist: ButirPeriksa[]
  catatan: CatatanKunjungan[]
}

export interface JadwalkanKunjunganInput {
  propertyId: string
  roomId?: string
  scheduledAt: string
  catatan?: string
}

export async function fetchVisits(): Promise<Kunjungan[] | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: Kunjungan[] }
    return payload.data
  } catch {
    return null
  }
}

export async function fetchVisit(id: string): Promise<KunjunganDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits/${encodeURIComponent(id)}`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: KunjunganDetail }
    return payload.data
  } catch {
    return null
  }
}

/** Jadwalkan kunjungan; melempar pesan server supaya sebabnya terbaca. */
export async function createVisit(input: JadwalkanKunjunganInput): Promise<Kunjungan> {
  const response = await fetch(`${API_BASE}/api/v1/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => null)) as
    | { data?: Kunjungan; message?: string; errors?: { message: string }[] }
    | null

  if (!response.ok) {
    throw new Error(
      payload?.errors?.[0]?.message ?? payload?.message ?? 'Jadwal kunjungan tidak tersimpan',
    )
  }

  return payload!.data!
}

export async function updateVisit(
  id: string,
  perubahan: { scheduledAt?: string; status?: KunjunganStatus; catatan?: string },
): Promise<Kunjungan> {
  const response = await fetch(`${API_BASE}/api/v1/visits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(perubahan),
  })

  const payload = (await response.json().catch(() => null)) as
    | { data?: Kunjungan; message?: string; errors?: { message: string }[] }
    | null

  if (!response.ok) {
    throw new Error(payload?.errors?.[0]?.message ?? payload?.message ?? 'Kunjungan tidak berubah')
  }

  return payload!.data!
}

export async function deleteVisit(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Simpan daftar periksa sekaligus.
 *
 * Seluruh butir dikirim dalam satu permintaan, bukan satu per satu: pengunjung
 * mengisi daftar ini sambil berdiri di depan kamar, dan satu permintaan per
 * butir berarti jaringan yang buruk memutus pengisian di tengah jalan.
 */
export async function saveChecklist(
  id: string,
  items: { item: string; checked: boolean; catatan?: string }[],
): Promise<KunjunganDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits/${encodeURIComponent(id)}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items }),
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: KunjunganDetail }
    return payload.data
  } catch {
    return null
  }
}

export async function toggleChecklistItem(
  id: string,
  itemId: string,
  checked: boolean,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/visits/${encodeURIComponent(id)}/checklist/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ checked }),
      },
    )

    return response.ok
  } catch {
    return false
  }
}

export async function addVisitNote(
  id: string,
  kategori: string,
  isi: string,
): Promise<CatatanKunjungan | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/visits/${encodeURIComponent(id)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ kategori, isi }),
    })

    if (!response.ok) return null

    const payload = (await response.json()) as { data: CatatanKunjungan }
    return payload.data
  } catch {
    return null
  }
}
