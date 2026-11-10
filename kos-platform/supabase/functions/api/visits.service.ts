import { query, queryOne } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import type { AuthUser } from './_shared/auth.ts'
import { notificationsService } from './notifications.service.ts'
import type {
  ChecklistInput,
  CreateVisitInput,
  ListVisitsQuery,
  UpdateVisitInput,
  VisitNoteInput,
} from './visits.validator.ts'

interface KunjunganRow {
  id: string
  tenant_id: string
  property_id: string
  owner_id: string
  property_name: string
  property_slug: string
  room_number: string | null
  scheduled_at: Date | null
  visit_status: string
  notes: string | null
  created_at: Date
  tenant_name: string
}

const KOLOM = `
  v.id, v.tenant_id, v.property_id, p.name AS property_name, p.slug AS property_slug,
  p.owner_id, r.room_number, v.scheduled_at, v.visit_status, v.notes, v.created_at,
  u.full_name AS tenant_name
`

/** Waktu diubah ke teks ISO di sini supaya bentuknya tetap sama bagi klien. */
const waktu = (nilai: Date | null): string | null =>
  nilai === null ? null : nilai instanceof Date ? nilai.toISOString() : new Date(String(nilai)).toISOString()

/**
 * Ambil satu kunjungan beserta propertinya, atau menolak.
 *
 * Pemeriksaan hak akses ada di sini, bukan di rute, karena hanya di sini id
 * pemilik properti sudah tersedia. Pengunjung boleh melihat kunjungannya
 * sendiri, pemilik boleh melihat kunjungan ke propertinya, admin melihat semua.
 * Selain itu dijawab 404, bukan 403: membedakan keduanya memberi tahu penyerang
 * bahwa kunjungan dengan id itu memang ada.
 */
const ambil = async (user: AuthUser, id: string): Promise<KunjunganRow> => {
  const row = await queryOne<KunjunganRow>(
    `SELECT ${KOLOM}
     FROM visits v
     JOIN properties p ON p.id = v.property_id
     JOIN users u ON u.id = v.tenant_id
     LEFT JOIN rooms r ON r.id = v.room_id
     WHERE v.id = $1`,
    [id],
  )

  if (!row) throw new HttpError(404, 'Kunjungan tidak ditemukan')

  const boleh = user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId

  if (!boleh) throw new HttpError(404, 'Kunjungan tidak ditemukan')

  return row
}

/** Bentuk kunjungan untuk daftar dan detail. */
const keBentuk = (row: KunjunganRow) => ({
  id: row.id,
  propertyId: row.property_id,
  propertyName: row.property_name,
  propertySlug: row.property_slug,
  roomNumber: row.room_number,
  scheduledAt: waktu(row.scheduled_at),
  status: row.visit_status,
  notes: row.notes,
  tenantName: row.tenant_name,
  createdAt: waktu(row.created_at),
})

export const visitsService = {
  async list(user: AuthUser, params: ListVisitsQuery) {
    // Pemilik melihat kunjungan ke propertinya, penghuni melihat kunjungannya
    // sendiri. Penyaringnya dipilih dari peran di token, bukan dari parameter
    // yang bisa dikirim klien.
    const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'
    const conditions = [pemilik ? 'p.owner_id = $1' : 'v.tenant_id = $1']
    const values: unknown[] = [user.userId]

    if (params.status) {
      values.push(params.status)
      conditions.push(`v.visit_status = $${values.length}`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM visits v
       JOIN properties p ON p.id = v.property_id
       ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    values.push(params.limit, offset)

    const rows = await query<KunjunganRow>(
      `SELECT ${KOLOM}
       FROM visits v
       JOIN properties p ON p.id = v.property_id
       JOIN users u ON u.id = v.tenant_id
       LEFT JOIN rooms r ON r.id = v.room_id
       ${where}
       ORDER BY v.scheduled_at DESC NULLS LAST, v.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    const total = countRow?.total ?? 0

    return {
      items: rows.map(keBentuk),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  async detail(user: AuthUser, id: string) {
    const kunjungan = await ambil(user, id)

    // Keduanya digabung dalam satu Promise.all: isinya kecil dan selalu
    // ditampilkan bersamaan di halaman detail.
    const [checklist, catatan] = await Promise.all([
      query<{ id: string; checklist_item: string; is_checked: boolean; notes: string | null }>(
        `SELECT id, checklist_item, is_checked, notes
         FROM visit_checklists
         WHERE visit_id = $1
         ORDER BY created_at ASC`,
        [id],
      ),
      query<{ id: string; category: string; content: string; created_at: Date }>(
        `SELECT id, category, content, created_at
         FROM visit_notes
         WHERE visit_id = $1
         ORDER BY created_at DESC`,
        [id],
      ),
    ])

    return {
      ...keBentuk(kunjungan),
      checklist: checklist.map((item) => ({
        id: item.id,
        item: item.checklist_item,
        checked: item.is_checked,
        notes: item.notes,
      })),
      catatan: catatan.map((note) => ({
        id: note.id,
        category: note.category,
        content: note.content,
        createdAt: waktu(note.created_at),
      })),
    }
  },

  /**
   * Rencana survei: jadwal yang masih akan berlangsung, ditambah ringkasan
   * hasil kunjungan yang sudah dilakukan.
   *
   * Dibuat sebagai satu endpoint, bukan dua, karena keduanya selalu dibuka
   * bersama: yang sedang merencanakan survei ingin melihat apa yang sudah
   * ditemukan di kos sebelumnya, dan yang sedang membandingkan hasil ingin tahu
   * jadwal berikutnya. Dua permintaan terpisah berarti dua keadaan memuat di
   * halaman yang sama.
   *
   * Daftar periksa dan catatan diambil sekaligus untuk seluruh kunjungan, bukan
   * satu per kunjungan: dua puluh kunjungan berarti empat puluh satu permintaan
   * ke database bila diambil satu per satu, dan jumlahnya bertambah setiap kali
   * pengguna mengisi survei berikutnya.
   */
  async rencana(user: AuthUser) {
    // Penyaring perannya sama dengan `list`: penghuni melihat surveinya
    // sendiri, pemilik melihat kunjungan ke propertinya.
    const pemilik = user.role === 'OWNER' || user.role === 'ADMIN'
    const syarat = pemilik ? 'p.owner_id = $1' : 'v.tenant_id = $1'
    const dari = `
      FROM visits v
      JOIN properties p ON p.id = v.property_id
      JOIN users u ON u.id = v.tenant_id
      LEFT JOIN rooms r ON r.id = v.room_id`

    const [agenda, selesai, jumlah] = await Promise.all([
      query<KunjunganRow>(
        `SELECT ${KOLOM}
         ${dari}
         WHERE ${syarat} AND v.visit_status = 'SCHEDULED'
         ORDER BY v.scheduled_at ASC NULLS LAST, v.created_at ASC
         LIMIT 50`,
        [user.userId],
      ),
      query<KunjunganRow>(
        `SELECT ${KOLOM}
         ${dari}
         WHERE ${syarat} AND v.visit_status = 'COMPLETED'
         ORDER BY v.scheduled_at DESC NULLS LAST, v.created_at DESC
         LIMIT 20`,
        [user.userId],
      ),
      query<{ visit_status: string; total: number }>(
        `SELECT v.visit_status, count(*)::int AS total
         FROM visits v
         JOIN properties p ON p.id = v.property_id
         WHERE ${syarat}
         GROUP BY v.visit_status`,
        [user.userId],
      ),
    ])

    const id = selesai.map((row) => row.id)

    // Penanda posisi disusun ulang untuk setiap query, bukan dibagi: dua
    // pernyataan berbeda tidak boleh berbagi penomoran parameter, dan
    // PostgreSQL menolak pernyataan yang menerima parameter lebih banyak
    // daripada yang dirujuk.
    const penanda = id.map((_, urutan) => `$${urutan + 1}`).join(', ')

    const [butir, catatan] =
      id.length === 0
        ? [[], []]
        : await Promise.all([
            query<{ visit_id: string; checklist_item: string; is_checked: boolean }>(
              `SELECT visit_id, checklist_item, is_checked
               FROM visit_checklists
               WHERE visit_id IN (${penanda})
               ORDER BY created_at ASC`,
              id,
            ),
            query<{ visit_id: string; category: string; content: string; created_at: Date }>(
              `SELECT visit_id, category, content, created_at
               FROM visit_notes
               WHERE visit_id IN (${penanda})
               ORDER BY created_at DESC`,
              id,
            ),
          ])

    const totalButir = new Map<string, number>()
    const tercentang = new Map<string, number>()
    const belum = new Map<string, string[]>()

    for (const satu of butir) {
      totalButir.set(satu.visit_id, (totalButir.get(satu.visit_id) ?? 0) + 1)

      if (satu.is_checked) {
        tercentang.set(satu.visit_id, (tercentang.get(satu.visit_id) ?? 0) + 1)
      } else {
        belum.set(satu.visit_id, [...(belum.get(satu.visit_id) ?? []), satu.checklist_item])
      }
    }

    const hitung = new Map<string, number>()
    const catatanPer = new Map<string, { kategori: string; isi: string; createdAt: string | null }[]>()

    for (const satu of catatan) {
      hitung.set(satu.visit_id, (hitung.get(satu.visit_id) ?? 0) + 1)

      // Yang diambil hanya lima catatan terbaru per kunjungan. Catatan survei
      // ditulis berurutan saat berdiri di depan kamar, dan yang terakhir
      // biasanya yang paling menentukan; seluruhnya tetap terbaca di halaman
      // detail kunjungannya.
      const daftar = catatanPer.get(satu.visit_id) ?? []
      if (daftar.length < 5) {
        daftar.push({
          kategori: satu.category,
          isi: satu.content,
          createdAt: waktu(satu.created_at),
        })
      }
      catatanPer.set(satu.visit_id, daftar)
    }

    const jumlahPer = (status: string): number =>
      jumlah.find((row) => row.visit_status === status)?.total ?? 0

    return {
      agenda: agenda.map(keBentuk),
      ringkasan: selesai.map((row) => ({
        ...keBentuk(row),
        daftarPeriksa: {
          tercentang: tercentang.get(row.id) ?? 0,
          total: totalButir.get(row.id) ?? 0,
          // Yang BELUM tercentang justru yang paling berguna: itulah hal yang
          // tidak ditemukan di kos itu, dan yang perlu ditanyakan lagi sebelum
          // memutuskan.
          belum: belum.get(row.id) ?? [],
        },
        catatan: catatanPer.get(row.id) ?? [],
        jumlahCatatan: hitung.get(row.id) ?? 0,
      })),
      meta: {
        akanDatang: agenda.length,
        sudahDisurvei: selesai.length,
        dibatalkan: jumlahPer('CANCELLED'),
        tidakHadir: jumlahPer('NO_SHOW'),
      },
    }
  },

  async create(user: AuthUser, input: CreateVisitInput) {
    const properti = await queryOne<{ id: string; owner_id: string; name: string }>(
      `SELECT id, owner_id, name FROM properties
       WHERE id = $1
         AND deleted_at IS NULL
         AND publication_status = 'PUBLISHED'
         AND verification_status = 'VERIFIED'`,
      [input.propertyId],
    )

    if (!properti) throw new HttpError(404, 'Properti tidak ditemukan')

    if (input.roomId) {
      const kamar = await queryOne<{ id: string }>(
        `SELECT id FROM rooms WHERE id = $1 AND property_id = $2`,
        [input.roomId, input.propertyId],
      )

      // Kamar yang bukan milik properti itu membuat kunjungan menunjuk kamar
      // di gedung lain, dan jadwalnya jadi tidak berarti apa-apa.
      if (!kamar) throw new HttpError(400, 'Kamar itu bukan milik properti ini')
    }

    const row = await queryOne<KunjunganRow>(
      `WITH baru AS (
         INSERT INTO visits (tenant_id, property_id, room_id, scheduled_at, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *
       )
       SELECT ${KOLOM}
       FROM baru v
       JOIN properties p ON p.id = v.property_id
       JOIN users u ON u.id = v.tenant_id
       LEFT JOIN rooms r ON r.id = v.room_id`,
      [user.userId, input.propertyId, input.roomId ?? null, input.scheduledAt, input.catatan ?? null],
    )

    if (!row) throw new HttpError(500, 'Kunjungan gagal disimpan')

    await notificationsService.create({
      userId: properti.owner_id,
      jenis: 'NEW_BOOKING',
      judul: 'Ada permintaan kunjungan',
      pesan: `${row.tenant_name} ingin melihat ${properti.name}.`,
      entityType: 'visit',
      entityId: row.id,
    })

    return keBentuk(row)
  },

  async update(user: AuthUser, id: string, input: UpdateVisitInput) {
    const kunjungan = await ambil(user, id)

    // Jadwal hanya boleh diubah penghuni, dan hanya selama kunjungannya belum
    // berlangsung. Setelah statusnya final, menggeser jadwalnya membuat
    // catatan kunjungan menunjuk waktu yang tidak pernah terjadi.
    if (input.scheduledAt !== undefined) {
      if (kunjungan.tenant_id !== user.userId) {
        throw new HttpError(403, 'Hanya penghuni yang bisa mengubah jadwal')
      }

      if (kunjungan.visit_status !== 'SCHEDULED') {
        throw new HttpError(409, 'Kunjungan yang sudah selesai tidak bisa dijadwalkan ulang')
      }
    }

    const potongan: string[] = []
    const values: unknown[] = []

    if (input.scheduledAt !== undefined) {
      values.push(input.scheduledAt)
      potongan.push(`scheduled_at = $${values.length}`)
    }

    if (input.status !== undefined) {
      values.push(input.status)
      potongan.push(`visit_status = $${values.length}`)
    }

    if (input.catatan !== undefined) {
      values.push(input.catatan)
      potongan.push(`notes = $${values.length}`)
    }

    values.push(id)

    await query(`UPDATE visits SET ${potongan.join(', ')} WHERE id = $${values.length}`, values)

    return keBentuk(await ambil(user, id))
  },

  async remove(user: AuthUser, id: string) {
    const kunjungan = await ambil(user, id)

    if (kunjungan.tenant_id !== user.userId) {
      throw new HttpError(403, 'Hanya penghuni yang bisa menghapus jadwal kunjungannya')
    }

    // Jadwal yang sudah berlangsung adalah catatan, bukan rencana; menghapusnya
    // menghilangkan riwayat bahwa kunjungan itu pernah terjadi.
    if (kunjungan.visit_status !== 'SCHEDULED') {
      throw new HttpError(409, 'Kunjungan yang sudah berlangsung tidak bisa dihapus')
    }

    await query(`DELETE FROM visits WHERE id = $1`, [id])

    return { id }
  },

  async addChecklist(user: AuthUser, id: string, input: ChecklistInput) {
    await ambil(user, id)

    // Nilainya dikirim per baris, satu butir per kelompok parameter, bukan lewat
    // `unnest` atas tiga larik sejajar. Bentuk tiga larik itu membalas 500 pada
    // uji pertama, dan pesannya tidak sampai ke klien karena galat tak terduga
    // sengaja diganti generik, jadi sebabnya tidak bisa dipastikan dari layar.
    // Bentuk per baris tidak menyerahkan apa pun ke driver dan tetap satu kali
    // jalan ke database, berapa pun banyak butirnya.
    const nilai: unknown[] = [id]
    const baris = input.items.map((butir) => {
      nilai.push(butir.item, butir.checked, butir.catatan ?? null)
      return `($1, $${nilai.length - 2}, $${nilai.length - 1}, $${nilai.length})`
    })

    await query(
      `INSERT INTO visit_checklists (visit_id, checklist_item, is_checked, notes)
       VALUES ${baris.join(', ')}`,
      nilai,
    )

    return this.detail(user, id)
  },

  async toggleChecklist(
    user: AuthUser,
    id: string,
    itemId: string,
    checked: boolean,
    catatan?: string,
  ) {
    await ambil(user, id)

    const rows = await query<{ id: string }>(
      `UPDATE visit_checklists
       SET is_checked = $1, notes = COALESCE($2, notes)
       WHERE id = $3 AND visit_id = $4
       RETURNING id`,
      [checked, catatan ?? null, itemId, id],
    )

    if (rows.length === 0) throw new HttpError(404, 'Butir periksa tidak ditemukan')

    return { id: itemId, checked }
  },

  async addNote(user: AuthUser, id: string, input: VisitNoteInput) {
    await ambil(user, id)

    const row = await queryOne<{ id: string; category: string; content: string; created_at: Date }>(
      `INSERT INTO visit_notes (visit_id, category, content)
       VALUES ($1, $2, $3)
       RETURNING id, category, content, created_at`,
      [id, input.kategori, input.isi],
    )

    return {
      id: row!.id,
      category: row!.category,
      content: row!.content,
      createdAt: waktu(row!.created_at),
    }
  },
}
