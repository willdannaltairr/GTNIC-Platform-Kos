import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import {
  deleteRoomConditionObject,
  extensionFor,
  roomConditionSignedUrl,
  sniffImageType,
  uploadRoomConditionObject,
  type BerkasUnggahan,
} from './_shared/storage.ts'
import type { AuthUser } from './_shared/auth.ts'
import { notificationsService } from './notifications.service.ts'
import {
  LABEL_JENIS,
  type AcknowledgeInput,
  type CreateRoomConditionInput,
  type ListRoomConditionsQuery,
  type SetChecklistInput,
  type SubmitRoomConditionInput,
  type UpdateRoomConditionInput,
} from './room-condition.validator.ts'

/**
 * Room Passport: catatan kondisi kamar saat masuk dan keluar.
 *
 * Bedanya dengan laporan perbaikan, dan kenapa keduanya tetap perlu:
 * laporan perbaikan mencatat apa yang RUSAK dan siapa yang memperbaikinya,
 * sedangkan pemeriksaan kondisi mencatat bagaimana keadaan kamarnya pada satu
 * titik waktu, lalu DISETUJUI kedua pihak. Kerusakan yang sudah ada sejak awal
 * karena itu tidak perlu diperdebatkan saat penghuninya keluar nanti: ada
 * catatannya, dan kedua pihak pernah menyetujuinya.
 *
 * Pemeriksaan lahir dari KONTRAK, bukan dari kamar yang dipilih dari daftar.
 * Yang berhak memeriksa kamar adalah orang yang sedang atau pernah menempatinya,
 * dan hanya kontraknya yang membuktikan itu.
 *
 * Kamar hanya boleh punya SATU pemeriksaan masuk dan SATU pemeriksaan keluar
 * per kontrak (dijaga indeks unik parsial di database). Yang berkala tidak
 * dibatasi: kos yang dihuni bertahun-tahun wajar diperiksa beberapa kali.
 */

/** Lama berlaku URL bertanda tangan foto kondisi. Selaraskan dengan modul lain. */
const MASA_TAUTAN_FOTO = 300

/** Status yang sudah tidak menerima perubahan isi lagi. */
const TERKUNCI = ['ACKNOWLEDGED', 'COMPLETED']

interface KondisiRow {
  id: string
  room_id: string
  room_number: string
  tenant_id: string
  tenant_name: string
  owner_id: string | null
  owner_name: string | null
  contract_id: string | null
  contract_number: string | null
  property_id: string
  property_name: string
  report_type: string
  report_date: Date | null
  general_condition: string | null
  notes: string | null
  report_status: string
  created_at: Date
  updated_at: Date
}

const KOLOM = `
  rc.id, rc.room_id, r.room_number,
  rc.tenant_id, t.full_name AS tenant_name,
  rc.owner_id, o.full_name AS owner_name,
  rc.contract_id, c.contract_number,
  c.property_id, p.name AS property_name,
  rc.report_type, rc.report_date, rc.general_condition, rc.notes,
  rc.status AS report_status, rc.created_at, rc.updated_at
`

/**
 * Sambungan tabelnya ditulis terpisah dari sumbernya, sama seperti modul lain:
 * query yang membaca hasil INSERT atau UPDATE lewat CTE memakai nama tabel yang
 * berbeda, sementara sambungannya tetap sama persis.
 */
const JOIN = `
  JOIN rooms r ON r.id = rc.room_id
  JOIN users t ON t.id = rc.tenant_id
  LEFT JOIN users o ON o.id = rc.owner_id
  JOIN contracts c ON c.id = rc.contract_id
  JOIN properties p ON p.id = c.property_id
`

const DARI = `FROM room_condition_reports rc ${JOIN}`

/**
 * Sumbernya hasil INSERT atau UPDATE yang baru dijalankan, bukan tabelnya
 * langsung. Ditulis sebagai konstanta sendiri, bukan disusun dengan
 * mengganti-ganti teks: penggantian teks membuat nama tabelnya tidak terlihat
 * lagi di query, dan satu penggantian yang salah sasaran menghasilkan query
 * yang tetap jalan tetapi membaca tabel yang berbeda.
 */
const DARI_BARU = `FROM baru rc ${JOIN}`
const DARI_DIUBAH = `FROM diubah rc ${JOIN}`

const tanggal = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

const keBentuk = (row: KondisiRow) => ({
  id: row.id,
  roomId: row.room_id,
  roomNumber: row.room_number,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  contractId: row.contract_id,
  contractNumber: row.contract_number,
  propertyId: row.property_id,
  propertyName: row.property_name,
  reportType: row.report_type,
  reportDate: tanggal(row.report_date),
  generalCondition: row.general_condition,
  notes: row.notes,
  status: row.report_status,
  createdAt: tanggal(row.created_at),
  updatedAt: tanggal(row.updated_at),
})

/**
 * Ambil satu pemeriksaan dengan pemeriksaan hak akses.
 *
 * Yang terlibat dua: penghuni yang menempati kamarnya dan pemilik propertinya.
 * Selain admin, keduanya yang boleh melihat, dan yang lain dijawab 404 supaya
 * keberadaan pemeriksaan orang lain tidak bocor lewat perbedaan 403 dan 404.
 */
const ambil = async (user: AuthUser, id: string): Promise<KondisiRow> => {
  const row = await queryOne<KondisiRow>(`SELECT ${KOLOM} ${DARI} WHERE rc.id = $1`, [id])

  if (!row) throw new HttpError(404, 'Pemeriksaan kondisi tidak ditemukan')

  const boleh =
    user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!boleh) throw new HttpError(404, 'Pemeriksaan kondisi tidak ditemukan')

  return row
}

export const roomConditionService = {
  /**
   * Buka satu pemeriksaan kondisi baru.
   *
   * Hanya penghuni, dan hanya dari kontraknya sendiri. Pemeriksaan masuk
   * menuntut kontrak yang sudah ACTIVE: kamar yang belum diserahkan belum ada
   * isinya untuk diperiksa. Pemeriksaan keluar boleh dari kontrak yang sudah
   * selesai, karena serah terima kunci sering terjadi beberapa hari setelah
   * kontraknya berakhir.
   */
  async create(user: AuthUser, input: CreateRoomConditionInput) {
    if (user.role !== 'TENANT') {
      throw new HttpError(
        403,
        'Pemeriksaan kondisi dibuat penghuni yang menempati kamarnya. Pemilik menyetujuinya, bukan membuatnya.',
      )
    }

    const kontrak = await queryOne<{
      id: string
      contract_number: string
      room_id: string
      room_number: string
      owner_id: string
      property_id: string
      property_name: string
      contract_status: string
    }>(
      `SELECT c.id, c.contract_number, c.room_id, r.room_number,
              c.owner_id, c.property_id, p.name AS property_name, c.contract_status
       FROM contracts c
       JOIN rooms r ON r.id = c.room_id
       JOIN properties p ON p.id = c.property_id
       WHERE c.id = $1 AND c.tenant_id = $2 AND p.deleted_at IS NULL`,
      [input.contractId, user.userId],
    )

    if (!kontrak) {
      throw new HttpError(
        404,
        'Kontrak sewa itu tidak ditemukan di akun Anda. Pemeriksaan kondisi hanya bisa dibuat untuk kamar yang Anda tempati sendiri.',
      )
    }

    const bolehDibuat =
      kontrak.contract_status === 'ACTIVE' ||
      (input.reportType === 'CHECK_OUT' && kontrak.contract_status === 'COMPLETED')

    if (!bolehDibuat) {
      throw new HttpError(
        409,
        `Kontrak berstatus ${kontrak.contract_status} belum bisa diperiksa. ` +
          'Pemeriksaan masuk dibuat setelah kontrak aktif, dan pemeriksaan keluar saat kontraknya aktif atau sudah selesai.',
      )
    }

    const sudahAda = await queryOne<{ id: string }>(
      `SELECT id FROM room_condition_reports
       WHERE contract_id = $1 AND report_type = $2::"ReportType"`,
      [kontrak.id, input.reportType],
    )

    if (sudahAda) {
      throw new HttpError(
        409,
        `${LABEL_JENIS[input.reportType] ?? input.reportType} untuk kontrak ini sudah ada. Yang ada bisa dilanjutkan, tidak perlu dibuat kedua.`,
      )
    }

    const row = await queryOne<KondisiRow>(
      `WITH baru AS (
         INSERT INTO room_condition_reports (
           room_id, tenant_id, owner_id, contract_id, report_type,
           general_condition, notes, status
         )
         VALUES ($1, $2, $3, $4, $5::"ReportType", $6, $7, 'DRAFT')
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_BARU}`,
      [
        kontrak.room_id,
        user.userId,
        kontrak.owner_id,
        kontrak.id,
        input.reportType,
        input.generalCondition ?? null,
        input.notes ?? null,
      ],
    )

    if (!row) throw new HttpError(500, 'Pemeriksaan kondisi gagal dibuat')

    return keBentuk(row)
  },

  /**
   * Daftar pemeriksaan sesuai peran.
   *
   * Penyaringnya ditentukan peran, bukan parameter permintaan: penghuni
   * melihat yang ia buat, pemilik melihat yang tertuju padanya, admin melihat
   * semuanya.
   */
  async list(user: AuthUser, params: ListRoomConditionsQuery) {
    const kondisi =
      user.role === 'ADMIN'
        ? ['TRUE']
        : user.role === 'OWNER'
          ? ['rc.owner_id = $1']
          : ['rc.tenant_id = $1']

    const values: unknown[] = user.role === 'ADMIN' ? [] : [user.userId]

    if (params.status) {
      values.push(params.status)
      kondisi.push(`rc.status = $${values.length}::"ReportStatus"`)
    }

    if (params.reportType) {
      values.push(params.reportType)
      kondisi.push(`rc.report_type = $${values.length}::"ReportType"`)
    }

    if (params.contractId) {
      values.push(params.contractId)
      kondisi.push(`rc.contract_id = $${values.length}`)
    }

    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total ${DARI} ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    const nilaiHalaman = [...values, params.limit, offset]

    const rows = await query<KondisiRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY rc.created_at DESC
       LIMIT $${nilaiHalaman.length - 1} OFFSET $${nilaiHalaman.length}`,
      nilaiHalaman,
    )

    const total = hitung?.total ?? 0

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

  /**
   * Satu pemeriksaan beserta daftar periksa, fotonya, dan persetujuannya.
   *
   * Ketiganya dibaca bersamaan karena halaman ini memang menampilkan ketiganya
   * sekaligus: keadaan tiap butir, bukti fotonya, dan siapa yang sudah
   * menyetujui.
   */
  async detail(user: AuthUser, id: string) {
    const kondisi = await ambil(user, id)

    const [periksa, foto, persetujuan] = await Promise.all([
      query<{ id: string; item_name: string; condition_status: string | null; notes: string | null }>(
        `SELECT id, item_name, condition_status, notes
         FROM room_condition_checklist_items
         WHERE report_id = $1
         ORDER BY created_at, item_name`,
        [id],
      ),
      query<{ id: string; storage_path: string; area_name: string | null; description: string | null; uploaded_by: string; uploader_name: string; created_at: Date }>(
        `SELECT rci.id, rci.storage_path, rci.area_name, rci.description,
                rci.uploaded_by, u.full_name AS uploader_name, rci.created_at
         FROM room_condition_images rci
         JOIN users u ON u.id = rci.uploaded_by
         WHERE rci.report_id = $1
         ORDER BY rci.created_at`,
        [id],
      ),
      query<{ id: string; user_id: string; user_name: string; acknowledgement_type: string; notes: string | null; acknowledged_at: Date }>(
        `SELECT a.id, a.user_id, u.full_name AS user_name,
                a.acknowledgement_type, a.notes, a.acknowledged_at
         FROM room_condition_acknowledgements a
         JOIN users u ON u.id = a.user_id
         WHERE a.report_id = $1
         ORDER BY a.acknowledged_at`,
        [id],
      ),
    ])

    /** Ringkasan keadaan, dihitung di sini supaya halaman tidak menghitung ulang. */
    const ringkasan: Record<string, number> = {
      BAIK: 0,
      RUSAK_RINGAN: 0,
      RUSAK_BERAT: 0,
      TIDAK_ADA: 0,
      belumDiperiksa: 0,
    }

    for (const butir of periksa) {
      if (!butir.condition_status) ringkasan.belumDiperiksa += 1
      else ringkasan[butir.condition_status] = (ringkasan[butir.condition_status] ?? 0) + 1
    }

    return {
      ...keBentuk(kondisi),
      checklist: periksa.map((butir) => ({
        id: butir.id,
        itemName: butir.item_name,
        conditionStatus: butir.condition_status,
        notes: butir.notes,
      })),
      photos: await Promise.all(
        foto.map(async (baris) => ({
          id: baris.id,
          areaName: baris.area_name,
          description: baris.description,
          uploadedBy: baris.uploaded_by,
          uploaderName: baris.uploader_name,
          createdAt: tanggal(baris.created_at),
          // URL bertanda tangan dibuat saat dibaca, bukan disimpan: tautan yang
          // tersimpan akan kedaluwarsa sendiri dan tampil sebagai gambar rusak.
          signedUrl: await roomConditionSignedUrl(baris.storage_path, MASA_TAUTAN_FOTO),
        })),
      ),
      acknowledgements: persetujuan.map((baris) => ({
        id: baris.id,
        userId: baris.user_id,
        userName: baris.user_name,
        type: baris.acknowledgement_type,
        notes: baris.notes,
        acknowledgedAt: tanggal(baris.acknowledged_at),
      })),
      ringkasan,
    }
  },

  /**
   * Ubah keterangan umum dan catatan.
   *
   * Hanya penghuni pemilik pemeriksaannya, dan tidak setelah disetujui:
   * pemeriksaan yang isinya berubah setelah pemilik menyetujuinya membuat
   * persetujuan itu tidak lagi berarti apa apa.
   */
  async update(user: AuthUser, id: string, input: UpdateRoomConditionInput) {
    const kondisi = await ambil(user, id)

    if (kondisi.tenant_id !== user.userId) {
      throw new HttpError(403, 'Pemeriksaan ini hanya bisa diubah oleh penghuni yang membuatnya')
    }

    if (TERKUNCI.includes(kondisi.report_status)) {
      throw new HttpError(
        409,
        'Pemeriksaan ini sudah disetujui pemilik, jadi isinya tidak bisa diubah lagi. Buat pemeriksaan berkala bila ada yang perlu dicatat.',
      )
    }

    const row = await queryOne<KondisiRow>(
      `WITH diubah AS (
         UPDATE room_condition_reports SET
           general_condition = COALESCE($2, general_condition),
           notes = COALESCE($3, notes),
           report_date = COALESCE($4::timestamptz, report_date)
         WHERE id = $1
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_DIUBAH}`,
      [id, input.generalCondition ?? null, input.notes ?? null, input.reportDate ?? null],
    )

    if (!row) throw new HttpError(500, 'Pemeriksaan kondisi gagal diperbarui')

    return keBentuk(row)
  },

  /**
   * Simpan seluruh daftar periksa sekaligus.
   *
   * Dikirim sebagai satu larik, bukan satu per satu: daftar periksa kamar
   * isinya belasan butir, dan mengirimnya satu per satu berarti belasan
   * perjalanan untuk satu layar yang sama. Seluruh isinya diganti, bukan
   * ditambahi, supaya butir yang sengaja dihapus penghuni benar-benar hilang.
   */
  async setChecklist(user: AuthUser, id: string, input: SetChecklistInput) {
    const kondisi = await ambil(user, id)

    if (kondisi.tenant_id !== user.userId) {
      throw new HttpError(403, 'Daftar periksa hanya bisa diisi penghuni yang membuat pemeriksaannya')
    }

    if (TERKUNCI.includes(kondisi.report_status)) {
      throw new HttpError(
        409,
        'Pemeriksaan ini sudah disetujui pemilik, jadi daftar periksa tidak bisa diubah lagi.',
      )
    }

    const nama = input.items.map((item) => item.itemName.trim().toLowerCase())
    const kembar = nama.find((nilai, indeks) => nama.indexOf(nilai) !== indeks)

    if (kembar !== undefined) {
      throw new HttpError(
        400,
        `Butir "${kembar}" tercantum lebih dari sekali. Satu butir satu baris, supaya keadaannya tidak saling bertentangan.`,
      )
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM room_condition_checklist_items WHERE report_id = $1', [id])

      for (const item of input.items) {
        await client.query(
          `INSERT INTO room_condition_checklist_items
             (report_id, item_name, condition_status, notes)
           VALUES ($1, $2, $3, $4)`,
          [id, item.itemName, item.conditionStatus, item.notes ?? null],
        )
      }

      await client.query(
        `UPDATE room_condition_reports
         SET report_date = COALESCE(report_date, now()), updated_at = now()
         WHERE id = $1`,
        [id],
      )
    })

    return this.detail(user, id)
  },

  /**
   * Kirim pemeriksaan ke pemilik untuk disetujui.
   *
   * Pemeriksaan kosong tidak boleh dikirim: pemilik yang diminta menyetujui
   * sesuatu tanpa butir periksa apa pun tidak sedang menyetujui apa-apa.
   * Karena itu minimal satu butir wajib ada, dan keterangan umumnya wajib diisi.
   */
  async submit(user: AuthUser, id: string, input: SubmitRoomConditionInput) {
    const kondisi = await ambil(user, id)

    if (kondisi.tenant_id !== user.userId) {
      throw new HttpError(403, 'Pemeriksaan ini hanya bisa dikirim oleh penghuni yang membuatnya')
    }

    if (kondisi.report_status !== 'DRAFT') {
      throw new HttpError(
        409,
        `Pemeriksaan ini sudah berstatus ${kondisi.report_status}, jadi tidak perlu dikirim lagi.`,
      )
    }

    const jumlah = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM room_condition_checklist_items WHERE report_id = $1`,
      [id],
    )

    if ((jumlah?.total ?? 0) === 0) {
      throw new HttpError(
        400,
        'Daftar periksa masih kosong. Isi keadaan tiap bagian kamar dulu sebelum dikirim ke pemilik.',
      )
    }

    const keterangan = input.generalCondition?.trim() ?? kondisi.general_condition?.trim() ?? ''

    if (keterangan.length < 10) {
      throw new HttpError(
        400,
        'Keadaan umum wajib diisi minimal 10 karakter sebelum dikirim, supaya pemilik tahu apa yang ia setujui.',
      )
    }

    const row = await queryOne<KondisiRow>(
      `WITH diubah AS (
         UPDATE room_condition_reports SET
           general_condition = $2,
           status = 'SUBMITTED',
           report_date = COALESCE(report_date, now())
         WHERE id = $1
         RETURNING *
       )
       SELECT ${KOLOM} ${DARI_DIUBAH}`,
      [id, keterangan],
    )

    if (!row) throw new HttpError(500, 'Pemeriksaan kondisi gagal dikirim')

    if (kondisi.owner_id) {
      await notificationsService.create({
        userId: kondisi.owner_id,
        jenis: 'ROOM_CONDITION_SUBMITTED',
        judul: 'Pemeriksaan kondisi kamar menunggu persetujuan',
        pesan: `${kondisi.tenant_name} mengirim ${(LABEL_JENIS[kondisi.report_type] ?? kondisi.report_type).toLowerCase()} untuk ${kondisi.property_name} kamar ${kondisi.room_number}.`,
        entityType: 'ROOM_CONDITION',
        entityId: id,
      })
    }

    return keBentuk(row)
  },

  /**
   * Setujui atau ajukan keberatan.
   *
   * Hanya pemilik propertinya (atau admin). Keberatan wajib disertai alasan,
   * dan diberitahukan ke penghuni: keberatan tanpa alasan membuat penghuni
   * menebak bagian mana yang tidak disetujui, dan sengketa yang sama akan
   * berulang saat ia keluar nanti.
   *
   * Persetujuan bisa diberikan berkali-kali, dan keberatan sesudahnya juga:
   * pemeriksaan yang sudah disetujui lalu disengketakan karena ada yang
   * terlewat harus bisa dicatat, dan menutup jalan itu berarti satu-satunya
   * cara memperbaikinya adalah menghapus laporannya.
   */
  async acknowledge(user: AuthUser, id: string, input: AcknowledgeInput) {
    const kondisi = await ambil(user, id)

    if (user.role !== 'ADMIN' && kondisi.owner_id !== user.userId) {
      throw new HttpError(
        403,
        'Pemeriksaan ini hanya bisa disetujui pemilik propertinya',
      )
    }

    if (kondisi.report_status === 'DRAFT') {
      throw new HttpError(
        409,
        'Pemeriksaan ini belum dikirim penghuninya, jadi belum ada yang bisa disetujui.',
      )
    }

    const statusBaru = input.setuju ? 'ACKNOWLEDGED' : 'DISPUTED'

    if (kondisi.report_status === statusBaru) {
      throw new HttpError(
        409,
        input.setuju
          ? 'Pemeriksaan ini sudah Anda setujui sebelumnya.'
          : 'Pemeriksaan ini sudah dalam keadaan disengketakan.',
      )
    }

    const row = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO room_condition_acknowledgements
           (report_id, user_id, acknowledgement_type, notes)
         VALUES ($1, $2, 'OWNER', $3)`,
        [id, user.userId, input.notes ?? null],
      )

      const rows = await client.query<KondisiRow>(
        `WITH diubah AS (
           UPDATE room_condition_reports SET
             status = $2::"ReportStatus",
             updated_at = now()
           WHERE id = $1
           RETURNING *
         )
         SELECT ${KOLOM} ${DARI_DIUBAH}`,
        [id, statusBaru],
      )

      return rows[0]
    })

    if (!row) throw new HttpError(500, 'Keputusan gagal disimpan')

    await notificationsService.create({
      userId: kondisi.tenant_id,
      jenis: input.setuju ? 'ROOM_CONDITION_ACKNOWLEDGED' : 'ROOM_CONDITION_DISPUTED',
      judul: input.setuju
        ? 'Pemeriksaan kondisi kamar disetujui'
        : 'Pemeriksaan kondisi kamar dipertanyakan',
      pesan: input.setuju
        ? `Pemilik menyetujui ${(LABEL_JENIS[kondisi.report_type] ?? kondisi.report_type).toLowerCase()} untuk kamar ${kondisi.room_number}.`
        : `Pemilik tidak menyetujui sebagian isi pemeriksaan kamar ${kondisi.room_number}. Alasan: ${input.notes}`,
      entityType: 'ROOM_CONDITION',
      entityId: id,
    })

    return keBentuk(row)
  },

  /**
   * Tambah satu foto kondisi.
   *
   * Yang boleh mengunggah hanya pihak yang terlibat, dan bukan admin: admin
   * memutuskan sengketa dengan membaca bukti, bukan dengan menambahkannya.
   * Pemeriksaan yang sudah disetujui tidak menerima foto lagi, supaya isinya
   * berhenti pada keadaan yang disetujui itu.
   */
  async addPhoto(
    user: AuthUser,
    id: string,
    berkas: BerkasUnggahan,
    meta: { areaName?: string; description?: string } = {},
  ) {
    const kondisi = await ambil(user, id)

    if (
      user.role === 'ADMIN' ||
      (kondisi.tenant_id !== user.userId && kondisi.owner_id !== user.userId)
    ) {
      throw new HttpError(
        403,
        'Hanya penghuni yang diperiksa dan pemilik propertinya yang bisa menambah foto kondisi',
      )
    }

    if (TERKUNCI.includes(kondisi.report_status)) {
      throw new HttpError(
        409,
        'Pemeriksaan ini sudah disetujui, jadi tidak menerima foto baru lagi. Buat pemeriksaan berkala bila ada yang perlu dicatat.',
      )
    }

    // Jenis gambar ditentukan dari isi berkasnya, bukan dari Content-Type yang
    // dikirim klien: yang terakhir itu bisa ditulis apa saja.
    const mime = sniffImageType(berkas.bytes)
    if (!mime) {
      throw new HttpError(400, 'Berkas yang dikirim bukan gambar JPEG, PNG, atau WebP')
    }

    // Nama objek selalu dibuat server dan selalu di dalam folder pemeriksaan
    // ini, sehingga nama berkas dari klien tidak pernah menentukan lokasinya.
    const objectPath = `kondisi/${kondisi.id}/${crypto.randomUUID()}.${extensionFor(mime)}`
    await uploadRoomConditionObject(objectPath, berkas.bytes, mime)

    try {
      const row = await queryOne<{
        id: string
        area_name: string | null
        description: string | null
        uploaded_by: string
        uploader_name: string
        created_at: Date
      }>(
        `WITH baru AS (
           INSERT INTO room_condition_images
             (report_id, storage_path, area_name, description, uploaded_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, storage_path, area_name, description, uploaded_by, created_at
         )
         SELECT b.id, b.storage_path, b.area_name, b.description,
                b.uploaded_by, u.full_name AS uploader_name, b.created_at
         FROM baru b
         JOIN users u ON u.id = b.uploaded_by`,
        [kondisi.id, objectPath, meta.areaName ?? null, meta.description ?? null, user.userId],
      )

      if (!row) throw new HttpError(500, 'Foto kondisi gagal disimpan')

      return {
        id: row.id,
        areaName: row.area_name,
        description: row.description,
        uploadedBy: row.uploaded_by,
        uploaderName: row.uploader_name,
        createdAt: tanggal(row.created_at),
        signedUrl: await roomConditionSignedUrl(objectPath, MASA_TAUTAN_FOTO),
      }
    } catch (error) {
      // Berkasnya sudah terunggah tetapi barisnya gagal: tanpa pembersihan ini
      // berkas itu tidak akan pernah bisa dijangkau lagi dari mana pun.
      await deleteRoomConditionObject(objectPath)
      throw error
    }
  },

  /**
   * Hapus satu foto.
   *
   * Hanya yang mengunggahnya, dan admin. Pemeriksaan yang sudah disetujui tidak
   * bisa diubah lagi, termasuk fotonya: foto itu bagian dari yang disetujui.
   */
  async removePhoto(user: AuthUser, id: string, photoId: string) {
    const kondisi = await ambil(user, id)

    if (TERKUNCI.includes(kondisi.report_status)) {
      throw new HttpError(
        409,
        'Foto tidak bisa dihapus dari pemeriksaan yang sudah disetujui.',
      )
    }

    const storagePath = await withTransaction(async (client) => {
      // `report_id` ikut jadi syarat: tanpa itu, id foto milik pemeriksaan lain
      // bisa dihapus lewat pemeriksaan yang bukan miliknya.
      const rows = await client.query<{ storage_path: string; uploaded_by: string }>(
        `SELECT storage_path, uploaded_by FROM room_condition_images
         WHERE id = $1 AND report_id = $2`,
        [photoId, kondisi.id],
      )

      const foto = rows[0]
      if (!foto) throw new HttpError(404, 'Foto tidak ditemukan pada pemeriksaan ini')

      if (user.role !== 'ADMIN' && foto.uploaded_by !== user.userId) {
        throw new HttpError(403, 'Foto hanya bisa dihapus oleh yang mengunggahnya')
      }

      await client.query('DELETE FROM room_condition_images WHERE id = $1', [photoId])
      return foto.storage_path
    })

    await deleteRoomConditionObject(storagePath)

    return { id: photoId }
  },
}
