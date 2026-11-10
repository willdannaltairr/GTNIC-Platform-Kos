import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import {
  deleteMaintenanceObject,
  extensionFor,
  maintenanceSignedUrl,
  sniffImageType,
  uploadMaintenanceObject,
  type BerkasUnggahan,
} from './_shared/storage.ts'
import type { AuthUser } from './_shared/auth.ts'
import { notificationsService } from './notifications.service.ts'
import {
  LABEL_STATUS_PERBAIKAN,
  PERPINDAHAN_PERBAIKAN,
  type CreateMaintenanceInput,
  type CreateCommentInput,
  type ListMaintenanceQuery,
  type UpdateMaintenanceStatusInput,
} from './maintenance.validator.ts'

/**
 * Laporan perbaikan.
 *
 * Satu laporan punya dua pihak dan keduanya perlu tempat yang sama: penghuni
 * yang menemukan kerusakan menuliskan apa yang rusak beserta fotonya, pemilik
 * yang menanganinya memindahkan statusnya sampai selesai. Karena itu laporan
 * hanya boleh lahir dari sewa yang benar-benar berjalan, bukan dari properti
 * mana pun yang dipilih dari daftar.
 *
 * Pemilik properti dibaca dari propertinya saat laporan dibuat, bukan dari
 * permintaan, sehingga properti yang berpindah tangan tetap menghasilkan
 * laporan untuk pemilik yang berhak menanganinya.
 *
 * Kolom `assigned_to` sengaja tidak dipakai: belum ada model petugas atau
 * teknisi di platform ini, dan mengisinya dengan id sembarang hanya akan
 * membuat kolom itu tampak berarti padahal tidak.
 */

/** Lama berlaku URL bertanda tangan foto laporan, dalam detik. */
const MASA_TAUTAN_FOTO = 300

/** Status yang tidak menerima foto baru lagi. */
const TIDAK_MENERIMA_FOTO = ['CLOSED']

interface PerbaikanRow {
  id: string
  tenant_id: string
  tenant_name: string
  owner_id: string
  owner_name: string
  property_id: string
  property_name: string
  room_id: string | null
  room_number: string | null
  title: string
  description: string | null
  category: string
  priority: string
  maintenance_status: string
  reported_at: Date
  resolved_at: Date | null
  created_at: Date
  updated_at: Date
}

interface FotoRow {
  id: string
  storage_path: string
  uploaded_by: string
  uploader_name: string
  created_at: Date
}

const KOLOM = `
  m.id, m.tenant_id, t.full_name AS tenant_name,
  m.owner_id, o.full_name AS owner_name,
  m.property_id, p.name AS property_name,
  m.room_id, r.room_number,
  m.title, m.description, m.category, m.priority, m.status AS maintenance_status,
  m.reported_at, m.resolved_at, m.created_at, m.updated_at
`

/**
 * Sambungan tabelnya ditulis terpisah dari sumbernya.
 *
 * Alasannya satu: query perubahan status membaca hasil UPDATE-nya sendiri lewat
 * CTE, sehingga tabel sumbernya bernama lain (`diubah`) sementara sambungan
 * tabelnya tetap sama persis. Menyalin blok JOIN untuk keperluan itu berarti
 * dua tempat yang harus ikut berubah setiap kali ada tabel yang disambungkan.
 */
const JOIN = `
  JOIN users t ON t.id = m.tenant_id
  JOIN users o ON o.id = m.owner_id
  JOIN properties p ON p.id = m.property_id
  LEFT JOIN rooms r ON r.id = m.room_id
`

const DARI = `
  FROM maintenance_requests m
  ${JOIN}
`

/** Sumbernya hasil UPDATE yang baru dijalankan, bukan tabelnya langsung. */
const DARI_DIUBAH = `
  FROM diubah m
  ${JOIN}
`

const tanggal = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

const keBentuk = (row: PerbaikanRow) => ({
  id: row.id,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  roomId: row.room_id,
  roomNumber: row.room_number,
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  status: row.maintenance_status,
  reportedAt: tanggal(row.reported_at),
  resolvedAt: tanggal(row.resolved_at),
  createdAt: tanggal(row.created_at),
  updatedAt: tanggal(row.updated_at),
})

/**
 * Ambil satu laporan dengan pemeriksaan hak akses.
 *
 * Yang terlibat hanya dua: penghuni yang melaporkan dan pemilik propertinya.
 * Selain admin, keduanya yang boleh melihat, dan yang lain dijawab 404 supaya
 * keberadaan laporan orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const ambil = async (user: AuthUser, id: string): Promise<PerbaikanRow> => {
  const row = await queryOne<PerbaikanRow>(`SELECT ${KOLOM} ${DARI} WHERE m.id = $1`, [id])

  if (!row) throw new HttpError(404, 'Laporan tidak ditemukan')

  const boleh =
    user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!boleh) throw new HttpError(404, 'Laporan tidak ditemukan')

  return row
}

export const maintenanceService = {
  /**
   * Buat laporan baru.
   *
   * Hanya penghuni, dan hanya untuk kamar yang sedang disewanya. Aturan itu
   * yang membedakan laporan dari keluhan sembarang orang: yang boleh melapor
   * adalah yang menempatinya, sehingga pemilik tahu laporan ini datang dari
   * kamar yang memang ada di bawah pengelolaannya.
   */
  async create(user: AuthUser, input: CreateMaintenanceInput) {
    if (user.role !== 'TENANT') {
      throw new HttpError(
        403,
        'Laporan perbaikan dibuat oleh penghuni yang menempati kamarnya. Pemilik memperbarui statusnya, bukan membuat laporannya.',
      )
    }

    const kontrak = await queryOne<{
      id: string
      owner_id: string
      property_id: string
      property_name: string
      room_id: string
      room_number: string
    }>(
      `SELECT c.id, c.owner_id, c.property_id, p.name AS property_name,
              c.room_id, r.room_number
       FROM contracts c
       JOIN properties p ON p.id = c.property_id
       JOIN rooms r ON r.id = c.room_id
       WHERE c.tenant_id = $1
         AND c.property_id = $2
         AND c.contract_status = 'ACTIVE'
         AND p.deleted_at IS NULL
         AND ($3::uuid IS NULL OR c.room_id = $3::uuid)
       ORDER BY c.start_date DESC
       LIMIT 1`,
      [user.userId, input.propertyId, input.roomId ?? null],
    )

    if (!kontrak) {
      throw new HttpError(
        403,
        'Laporan perbaikan hanya bisa dibuat untuk kamar yang sedang Anda sewa. Kontrak aktif untuk kamar itu tidak ditemukan di akun Anda.',
      )
    }

    const row = await withTransaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO maintenance_requests
           (tenant_id, owner_id, property_id, room_id, title, description, category, priority, status, reported_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::"MaintenancePriority", 'OPEN', now())
         RETURNING id`,
        [
          user.userId,
          kontrak.owner_id,
          kontrak.property_id,
          kontrak.room_id,
          input.title,
          input.description ?? null,
          input.category,
          input.priority,
        ],
      )

      const rows = await client.query<PerbaikanRow>(
        `SELECT ${KOLOM} ${DARI} WHERE m.id = $1`,
        [inserted[0].id],
      )

      return rows[0]
    })

    await notificationsService.create({
      userId: kontrak.owner_id,
      jenis: 'NEW_MAINTENANCE_REPORT',
      judul: 'Laporan perbaikan baru',
      pesan: `${row.tenant_name} melaporkan "${row.title}" di ${kontrak.property_name} kamar ${kontrak.room_number}.`,
      entityType: 'MAINTENANCE',
      entityId: row.id,
    })

    return keBentuk(row)
  },

  /**
   * Daftar laporan sesuai peran.
   *
   * Penyaringnya ditentukan peran, bukan parameter permintaan: penghuni melihat
   * laporan yang ia buat, pemilik melihat yang masuk ke propertinya, admin
   * melihat semuanya. Jumlah per status dihitung pada seluruh lingkup peran,
   * bukan pada halaman yang sedang tampil, supaya tabnya tidak menipu.
   */
  async list(user: AuthUser, params: ListMaintenanceQuery) {
    const lingkup =
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? 'm.owner_id = $1'
          : 'm.tenant_id = $1'

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]
    const kondisi = [lingkup]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`m.status = $${values.length}::"MaintenanceStatus"`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`
    const whereLingkup =
      user.role === 'ADMIN'
        ? ''
        : `WHERE ${user.role === 'OWNER' ? 'm.owner_id = $1' : 'm.tenant_id = $1'}`

    const [hitung, perStatus] = await Promise.all([
      queryOne<{ total: number }>(`SELECT count(*)::int AS total ${DARI} ${where}`, values),
      query<{ status: string; jumlah: number }>(
        `SELECT m.status, count(*)::int AS jumlah ${DARI} ${whereLingkup} GROUP BY m.status`,
        user.role === 'ADMIN' ? [] : [user.userId],
      ),
    ])

    const offset = (params.page - 1) * params.limit
    const nilaiHalaman = [...values, params.limit, offset]

    const rows = await query<PerbaikanRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY m.created_at DESC
       LIMIT $${nilaiHalaman.length - 1} OFFSET $${nilaiHalaman.length}`,
      nilaiHalaman,
    )

    // Seluruh status selalu ada di ringkasannya, termasuk yang berjumlah nol,
    // supaya tabnya tidak perlu menebak dan angka nol tetap terlihat sebagai
    // keadaan yang sah, bukan sebagai data yang belum termuat.
    const ringkasan: Record<string, number> = {
      OPEN: 0,
      REVIEWING: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_PARTS: 0,
      RESOLVED: 0,
      REJECTED: 0,
      CLOSED: 0,
    }
    for (const baris of perStatus) ringkasan[baris.status] = baris.jumlah

    const total = hitung?.total ?? 0

    return {
      items: rows.map(keBentuk),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        ringkasan,
      },
    }
  },

  /** Detail satu laporan, beserta fotonya dan perjalanan statusnya. */
  async detail(user: AuthUser, id: string) {
    const perbaikan = await ambil(user, id)

    const [foto, riwayat, komentar] = await Promise.all([
      query<FotoRow>(
        `SELECT mi.id, mi.storage_path, mi.uploaded_by, u.full_name AS uploader_name, mi.created_at
         FROM maintenance_images mi
         JOIN users u ON u.id = mi.uploaded_by
         WHERE mi.maintenance_request_id = $1
         ORDER BY mi.created_at`,
        [id],
      ),
      query<{
        id: string
        previous_status: string | null
        new_status: string
        notes: string | null
        changed_by_name: string | null
        created_at: Date
      }>(
        `SELECT h.id, h.previous_status, h.new_status, h.notes,
                u.full_name AS changed_by_name, h.created_at
         FROM maintenance_status_histories h
         LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.maintenance_request_id = $1
         ORDER BY h.created_at`,
        [id],
      ),
      // Komentar diurut dari yang paling lama: satu laporan dibaca sebagai satu
      // percakapan, dan percakapan yang dimulai dari pesan terbaru memaksa
      // pembacanya menyusun urutan sendiri di kepalanya.
      query<{
        id: string
        author_id: string
        author_name: string
        author_role: string
        body: string
        created_at: Date
      }>(
        `SELECT mc.id, mc.author_id, u.full_name AS author_name, u.role AS author_role,
                mc.body, mc.created_at
         FROM maintenance_comments mc
         JOIN users u ON u.id = mc.author_id
         WHERE mc.request_id = $1
         ORDER BY mc.created_at ASC`,
        [id],
      ),
    ])

    return {
      ...keBentuk(perbaikan),
      photos: await Promise.all(
        foto.map(async (baris) => ({
          id: baris.id,
          uploadedBy: baris.uploaded_by,
          uploaderName: baris.uploader_name,
          createdAt: tanggal(baris.created_at),
          signedUrl: await maintenanceSignedUrl(baris.storage_path, MASA_TAUTAN_FOTO),
        })),
      ),
      riwayat: riwayat.map((baris) => ({
        id: baris.id,
        previousStatus: baris.previous_status,
        newStatus: baris.new_status,
        notes: baris.notes,
        changedByName: baris.changed_by_name,
        createdAt: tanggal(baris.created_at),
      })),
      komentar: komentar.map((baris) => ({
        id: baris.id,
        authorId: baris.author_id,
        authorName: baris.author_name,
        authorRole: baris.author_role,
        body: baris.body,
        createdAt: tanggal(baris.created_at),
      })),
    }
  },

  /**
   * Tulis satu komentar pada laporan.
   *
   * Pihak yang boleh menulis sama dengan yang boleh membaca laporan ini:
   * penghuni pelapornya, pemilik propertinya, dan admin. Selain itu dijawab 404
   * dengan alasan yang sama seperti `ambil`: membedakan 403 dari 404 akan
   * memberi tahu penebak bahwa laporan dengan id itu memang ada.
   *
   * Penghuni pelapor tidak dibatasi hanya saat laporan masih terbuka. Kerusakan
   * yang sama sering muncul kembali setelah dinyatakan selesai, dan menutup
   * percakapan pada laporan yang sudah ditutup hanya memindahkan keluhannya ke
   * tempat yang tidak tercatat.
   */
  async komentar(user: AuthUser, id: string, input: CreateCommentInput) {
    const perbaikan = await ambil(user, id)

    const row = await queryOne<{
      id: string
      author_id: string
      author_name: string
      author_role: string
      body: string
      created_at: Date
    }>(
      `WITH baru AS (
         INSERT INTO maintenance_comments (request_id, author_id, body)
         VALUES ($1, $2, $3)
         RETURNING id, author_id, body, created_at
       )
       SELECT b.id, b.author_id, u.full_name AS author_name, u.role AS author_role,
              b.body, b.created_at
       FROM baru b
       JOIN users u ON u.id = b.author_id`,
      [perbaikan.id, user.userId, input.body],
    )

    if (!row) throw new HttpError(500, 'Komentar gagal disimpan')

    return {
      id: row.id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role,
      body: row.body,
      createdAt: tanggal(row.created_at),
    }
  },

  /**
   * Pindahkan status laporan.
   *
   * Hanya pemilik propertinya, sebab yang tahu pekerjaannya sudah dikerjakan
   * atau belum adalah dia, bukan penghuni yang melaporkan. Penghuni tetap
   * melihat perpindahannya, dan tiap perpindahan meninggalkan satu baris
   * riwayat: laporan yang statusnya berpindah tanpa jejak tidak bisa
   * dipertanggungjawabkan saat kedua pihak berbeda ingatan.
   */
  async updateStatus(user: AuthUser, id: string, input: UpdateMaintenanceStatusInput) {
    const perbaikan = await ambil(user, id)

    if (user.role !== 'ADMIN' && perbaikan.owner_id !== user.userId) {
      throw new HttpError(403, 'Hanya pemilik propertinya yang bisa memindahkan status laporan ini')
    }

    const mungkin = PERPINDAHAN_PERBAIKAN[perbaikan.maintenance_status] ?? []
    if (!mungkin.includes(input.status)) {
      throw new HttpError(
        409,
        `Status laporan ini ${perbaikan.maintenance_status}, jadi belum bisa dipindah ke ${input.status}. ` +
          (mungkin.length > 0
            ? `Yang mungkin: ${mungkin.join(', ')}.`
            : 'Laporan ini sudah selesai dan tidak punya lanjutan.'),
      )
    }

    const row = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO maintenance_status_histories
           (maintenance_request_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2::"MaintenanceStatus", $3::"MaintenanceStatus", $4, $5)`,
        [id, perbaikan.maintenance_status, input.status, user.userId, input.notes ?? null],
      )

      // Statusnya dikirim dua kali sebagai parameter terpisah: sekali untuk
      // kolom berenum, sekali sebagai teks untuk perbandingan di CASE. Satu
      // parameter yang dipakai untuk keduanya membuat PostgreSQL menebak
      // tipenya dan menolak query-nya.
      const rows = await client.query<PerbaikanRow>(
        `WITH diubah AS (
           UPDATE maintenance_requests
           SET status = $2::"MaintenanceStatus",
               priority = COALESCE($3::"MaintenancePriority", priority),
               resolved_at = CASE
                 WHEN $4::text = 'RESOLVED' THEN now()
                 WHEN $4::text IN ('OPEN', 'REVIEWING', 'IN_PROGRESS', 'WAITING_FOR_PARTS') THEN NULL
                 ELSE resolved_at
               END,
               updated_at = now()
           WHERE id = $1
           RETURNING *
         )
         SELECT ${KOLOM} ${DARI_DIUBAH}`,
        [id, input.status, input.priority ?? null, input.status],
      )

      return rows[0]
    })

    const label = LABEL_STATUS_PERBAIKAN[input.status] ?? input.status
    await notificationsService.create({
      userId: perbaikan.tenant_id,
      jenis: 'MAINTENANCE_UPDATED',
      judul: 'Perbaikan diperbarui',
      pesan:
        `Laporan "${perbaikan.title}" di ${perbaikan.property_name} kini ${label}.` +
        (input.notes ? ` Catatan pemilik: ${input.notes}` : ''),
      entityType: 'MAINTENANCE',
      entityId: id,
    })

    return keBentuk(row)
  },

  /**
   * Tambah satu foto pada laporan.
   *
   * Yang boleh mengunggah hanya pihak yang terlibat, dan bukan admin: admin
   * memutuskan sengketa dengan membaca bukti, bukan dengan menambahkannya.
   * Laporan yang sudah ditutup tidak menerima foto lagi supaya catatannya
   * berhenti pada keadaan saat ditutup.
   */
  async addPhoto(user: AuthUser, id: string, berkas: BerkasUnggahan) {
    const perbaikan = await ambil(user, id)

    if (
      user.role === 'ADMIN' ||
      (perbaikan.tenant_id !== user.userId && perbaikan.owner_id !== user.userId)
    ) {
      throw new HttpError(403, 'Hanya penghuni pelapor dan pemilik propertinya yang bisa menambah foto')
    }

    if (TIDAK_MENERIMA_FOTO.includes(perbaikan.maintenance_status)) {
      throw new HttpError(409, 'Laporan ini sudah ditutup, jadi tidak menerima foto baru lagi')
    }

    // Jenis gambar ditentukan dari isi berkasnya, bukan dari Content-Type yang
    // dikirim klien: yang terakhir itu bisa ditulis apa saja.
    const mime = sniffImageType(berkas.bytes)
    if (!mime) {
      throw new HttpError(400, 'Berkas yang dikirim bukan gambar JPEG, PNG, atau WebP')
    }

    // Nama objek selalu dibuat server dan selalu di dalam folder laporan ini,
    // sehingga nama berkas dari klien tidak pernah menentukan lokasinya.
    const objectPath = `perbaikan/${perbaikan.id}/${crypto.randomUUID()}.${extensionFor(mime)}`
    await uploadMaintenanceObject(objectPath, berkas.bytes, mime)

    try {
      const row = await queryOne<FotoRow>(
        `WITH baru AS (
           INSERT INTO maintenance_images (maintenance_request_id, storage_path, uploaded_by)
           VALUES ($1, $2, $3)
           RETURNING id, storage_path, uploaded_by, created_at
         )
         SELECT b.id, b.storage_path, b.uploaded_by, u.full_name AS uploader_name, b.created_at
         FROM baru b
         JOIN users u ON u.id = b.uploaded_by`,
        [perbaikan.id, objectPath, user.userId],
      )

      if (!row) throw new HttpError(500, 'Foto gagal disimpan')

      return {
        id: row.id,
        uploadedBy: row.uploaded_by,
        uploaderName: row.uploader_name,
        createdAt: tanggal(row.created_at),
        signedUrl: await maintenanceSignedUrl(row.storage_path, MASA_TAUTAN_FOTO),
      }
    } catch (error) {
      // Berkasnya sudah terunggah tetapi barisnya gagal: tanpa pembersihan ini
      // berkas itu tidak akan pernah bisa dijangkau lagi dari mana pun.
      await deleteMaintenanceObject(objectPath)
      throw error
    }
  },

  /**
   * Hapus satu foto.
   *
   * Hanya yang mengunggahnya, dan admin. Pemilik properti sengaja tidak
   * termasuk: foto laporan adalah bukti keadaan kamar saat kerusakan terjadi,
   * dan pihak yang menangani kerusakannya tidak boleh menghapus bukti itu
   * sebelum laporannya ditutup.
   */
  async removePhoto(user: AuthUser, id: string, photoId: string) {
    const perbaikan = await ambil(user, id)

    const storagePath = await withTransaction(async (client) => {
      // `maintenance_request_id` ikut jadi syarat: tanpa itu, id foto milik
      // laporan lain bisa dihapus lewat laporan yang bukan miliknya.
      const rows = await client.query<{ storage_path: string; uploaded_by: string }>(
        `SELECT storage_path, uploaded_by FROM maintenance_images
         WHERE id = $1 AND maintenance_request_id = $2`,
        [photoId, perbaikan.id],
      )

      const foto = rows[0]
      if (!foto) throw new HttpError(404, 'Foto tidak ditemukan pada laporan ini')

      if (user.role !== 'ADMIN' && foto.uploaded_by !== user.userId) {
        throw new HttpError(403, 'Foto hanya bisa dihapus oleh yang mengunggahnya')
      }

      await client.query('DELETE FROM maintenance_images WHERE id = $1', [photoId])
      return foto.storage_path
    })

    await deleteMaintenanceObject(storagePath)

    return { id: photoId }
  },
}
