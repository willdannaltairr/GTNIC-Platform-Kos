import { query, queryOne, withTransaction } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import { notificationsService } from './notifications.service.ts'
import type { AuthUser } from './_shared/auth.ts'
import {
  type KirimPesanInput,
  type ListConversationsQuery,
  type ListMessagesQuery,
  type MulaiPercakapanInput,
} from './conversations.validator.ts'

/**
 * Percakapan penghuni dengan pemilik kos.
 *
 * Satu percakapan per penghuni per properti, dan pesan teks di dalamnya.
 *
 * Aturan yang menentukan seluruh bentuk modul ini: percakapan hanya boleh dibaca
 * dua orang yang namanya tercatat di barisnya. `tenant_id` dan `owner_id`
 * disimpan saat percakapan dimulai, bukan disimpulkan dari propertinya saat
 * dibaca. Properti yang berpindah tangan karena itu tidak membuat pemilik baru
 * bisa membaca percakapan yang bukan urusannya, dan pemilik lama tetap melihat
 * percakapan yang memang ia jawab.
 *
 * Pemilik properti ditentukan dari data, bukan dari isi permintaan: yang
 * mengirim `propertyId` hanya menunjuk propertinya, dan pemiliknya dibaca dari
 * baris properti itu.
 */

interface PercakapanRow {
  id: string
  tenant_id: string
  tenant_name: string
  owner_id: string
  owner_name: string
  property_id: string
  property_name: string
  property_slug: string
  last_message_at: Date | null
  created_at: Date
  pesan_terakhir: string | null
  belum_dibaca: number
}

interface PesanRow {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  body: string
  read_at: Date | null
  created_at: Date
}

const waktu = (nilai: Date | null): string | null =>
  nilai === null
    ? null
    : nilai instanceof Date
      ? nilai.toISOString()
      : new Date(String(nilai)).toISOString()

/**
 * Kolom percakapan beserta dua hal yang selalu ditanyakan daftarnya:
 * potongan pesan terakhir dan jumlah yang belum dibaca.
 *
 * Keduanya dihitung di dalam query, bukan dengan permintaan terpisah per baris.
 * Daftar dua puluh percakapan berarti dua puluh perjalanan tambahan ke database
 * kalau dihitung di aplikasi, dan itu terjadi setiap kali halaman dibuka.
 */
const KOLOM = `
  c.id, c.tenant_id, t.full_name AS tenant_name,
  c.owner_id, o.full_name AS owner_name,
  c.property_id, p.name AS property_name, p.slug AS property_slug,
  c.last_message_at, c.created_at,
  (SELECT m.body FROM conversation_messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC LIMIT 1) AS pesan_terakhir,
  (SELECT count(*)::int FROM conversation_messages m
    WHERE m.conversation_id = c.id
      AND m.read_at IS NULL
      AND m.sender_id <> $1) AS belum_dibaca
`

const DARI = `
  FROM conversations c
  JOIN users t ON t.id = c.tenant_id
  JOIN users o ON o.id = c.owner_id
  JOIN properties p ON p.id = c.property_id
`

const keBentuk = (row: PercakapanRow, user: AuthUser) => ({
  id: row.id,
  tenantId: row.tenant_id,
  tenantName: row.tenant_name,
  ownerId: row.owner_id,
  ownerName: row.owner_name,
  propertyId: row.property_id,
  propertyName: row.property_name,
  propertySlug: row.property_slug,
  /**
   * Lawan bicaranya, supaya halaman tidak perlu memilih sendiri antara
   * `tenantName` dan `ownerName` hanya untuk memberi judul percakapan.
   */
  lawanBicara: user.userId === row.tenant_id ? row.owner_name : row.tenant_name,
  pesanTerakhir: row.pesan_terakhir,
  belumDibaca: row.belum_dibaca,
  lastMessageAt: waktu(row.last_message_at),
  createdAt: waktu(row.created_at),
})

const kePesan = (row: PesanRow) => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  senderName: row.sender_name,
  body: row.body,
  readAt: waktu(row.read_at),
  createdAt: waktu(row.created_at),
})

/**
 * Ambil satu percakapan dengan pemeriksaan hak akses.
 *
 * Yang bukan pesertanya dijawab 404, bukan 403: membedakan keduanya
 * memberitahu penebak bahwa percakapan dengan id itu memang ada, walaupun ia
 * tidak berhak membukanya.
 */
const ambil = async (user: AuthUser, id: string): Promise<PercakapanRow> => {
  // `$1` sudah dipakai kolom-kolom yang menghitung pesan belum dibaca, jadi
  // idnya menempati `$2`. Menukarnya membuat jumlah parameter tidak cocok
  // dengan yang dirujuk query, dan PostgreSQL menolaknya sebagai galat.
  const row = await queryOne<PercakapanRow>(`SELECT ${KOLOM} ${DARI} WHERE c.id = $2`, [
    user.userId,
    id,
  ])

  if (!row) throw new HttpError(404, 'Percakapan tidak ditemukan')

  const peserta = user.role === 'ADMIN' || row.tenant_id === user.userId || row.owner_id === user.userId
  if (!peserta) throw new HttpError(404, 'Percakapan tidak ditemukan')

  return row
}

export const conversationsService = {
  /**
   * Mulai percakapan tentang satu properti, atau ambil yang sudah ada.
   *
   * Yang boleh memulai hanya penghuni. Pemilik tidak menghubungi orang lewat
   * sini: ia memang yang menerima pertanyaan, dan jalur pertama selalu dari
   * calon penghuni yang melihat kosnya. Admin juga tidak, dengan alasan yang
   * sama seperti modul lain: percakapan atas nama orang lain adalah jalur yang
   * tidak boleh ada.
   *
   * Pemilik propertinya dibaca dari baris properti, bukan dari permintaan.
   * Kalau pemilik boleh menyebut dirinya sendiri, siapa pun bisa membuat
   * percakapan atas nama pemilik mana pun dan pesannya masuk ke kotak masuk
   * orang yang tidak pernah membuka kos itu.
   */
  async mulai(user: AuthUser, input: MulaiPercakapanInput) {
    if (user.role !== 'TENANT') {
      throw new HttpError(
        403,
        'Percakapan dimulai penghuni yang berminat pada kosnya. Pemilik properti menjawab dari kotak masuknya.',
      )
    }

    const properti = await queryOne<{ id: string; owner_id: string; name: string }>(
      `SELECT id, owner_id, name FROM properties
       WHERE id = $1 AND deleted_at IS NULL`,
      [input.propertyId],
    )

    if (!properti) throw new HttpError(404, 'Properti tidak ditemukan')

    if (properti.owner_id === user.userId) {
      throw new HttpError(400, 'Anda tidak bisa memulai percakapan untuk kos milik sendiri')
    }

    const id = await withTransaction(async (client) => {
      // Percakapan yang sudah ada dipakai ulang, bukan dibuat kedua. Indeks
      // uniknya yang menahan percakapan ganda, dan `DO UPDATE` di sini membuat
      // dua permintaan bersamaan berakhir pada baris yang sama.
      const rows = await client.query<{ id: string }>(
        `INSERT INTO conversations (tenant_id, owner_id, property_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, property_id, owner_id)
         DO UPDATE SET updated_at = now()
         RETURNING id`,
        [user.userId, properti.owner_id, properti.id],
      )

      const percakapanId = rows[0].id

      if (input.pesan) {
        await client.query(
          `INSERT INTO conversation_messages (conversation_id, sender_id, body)
           VALUES ($1, $2, $3)`,
          [percakapanId, user.userId, input.pesan],
        )

        await client.query(
          `UPDATE conversations SET last_message_at = now() WHERE id = $1`,
          [percakapanId],
        )
      }

      return percakapanId
    })

    // Pemberitahuan hanya dikirim kalau ada pesan pertamanya. Membuka
    // percakapan kosong lalu meninggalkannya bukan sesuatu yang perlu
    // diberitahukan ke pemilik.
    const hasil = await this.detail(user, id)

    if (input.pesan) {
      await notificationsService.create({
        userId: properti.owner_id,
        jenis: 'NEW_MESSAGE',
        judul: 'Pesan baru',
        pesan: `${hasil.tenantName} bertanya tentang ${properti.name}.`,
        entityType: 'conversation',
        entityId: id,
      })
    }

    return hasil
  },

  /**
   * Percakapan pada lingkup peran yang sedang masuk.
   *
   * Penyaringnya ditentukan peran, bukan parameter permintaan: penghuni melihat
   * percakapan yang ia mulai, pemilik melihat yang tertuju padanya, admin
   * melihat semuanya. Percakapan tanpa pesan tidak ikut tampil — yang dibuka
   * lalu ditinggalkan tanpa sepatah kata bukan percakapan, dan menampilkannya
   * membuat kotak masuk penuh baris kosong.
   */
  async list(user: AuthUser, params: ListConversationsQuery) {
    const kondisi = [
      user.role === 'ADMIN'
        ? 'TRUE'
        : user.role === 'OWNER'
          ? 'c.owner_id = $2'
          : 'c.tenant_id = $2',
      'c.last_message_at IS NOT NULL',
    ]

    const values: unknown[] = user.role === 'ADMIN' ? [user.userId] : [user.userId, user.userId]
    const where = `WHERE ${kondisi.join(' AND ')}`

    const hitung = await queryOne<{ total: number; belum: number }>(
      `SELECT
         count(*)::int AS total,
         COALESCE(sum((
           SELECT count(*) FROM conversation_messages m
           WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id <> $1
         )), 0)::int AS belum
       ${DARI} ${where}`,
      values,
    )

    const offset = (params.page - 1) * params.limit
    const nilaiHalaman = [...values, params.limit, offset]

    const rows = await query<PercakapanRow>(
      `SELECT ${KOLOM} ${DARI} ${where}
       ORDER BY c.last_message_at DESC
       LIMIT $${nilaiHalaman.length - 1} OFFSET $${nilaiHalaman.length}`,
      nilaiHalaman,
    )

    const total = hitung?.total ?? 0

    return {
      items: rows.map((row) => keBentuk(row, user)),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
        /** Jumlah pesan yang belum dibaca pada seluruh percakapan. */
        belumDibaca: hitung?.belum ?? 0,
      },
    }
  },

  /**
   * Satu percakapan beserta pesannya.
   *
   * Pesan yang dibuka penerimanya ditandai terbaca di sini, bukan lewat
   * endpoint tersendiri: halaman yang membuka percakapan memang sedang
   * membacanya, dan memisahkannya berarti setiap pembuka harus ingat memanggil
   * kedua permintaan itu — yang pertama terlupa akan membuat angka belum
   * dibaca tidak pernah turun.
   */
  async detail(user: AuthUser, id: string, params: ListMessagesQuery = { page: 1, limit: 50 }) {
    const percakapan = await ambil(user, id)

    // Ditandai terbaca SEBELUM pesannya dibaca, supaya keadaan yang dikembalikan
    // ke pemanggil sudah mencerminkan sesudahnya. Kalau dibalik, halaman akan
    // menampilkan angka lama dan terlihat seperti tandanya tidak bekerja.
    await query(
      `UPDATE conversation_messages
       SET read_at = now()
       WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [percakapan.id, user.userId],
    )

    const hitung = await queryOne<{ total: number; belum: number }>(
      `SELECT
         count(*)::int AS total,
         count(*) FILTER (WHERE read_at IS NULL AND sender_id <> $2)::int AS belum
       FROM conversation_messages
       WHERE conversation_id = $1`,
      [percakapan.id, user.userId],
    )

    const offset = (params.page - 1) * params.limit

    // Pesan diambil dari yang terbaru lalu dibalik di akhir, bukan diurutkan
    // menaik dengan OFFSET: pada percakapan panjang, yang dibuka orang adalah
    // halaman terakhir, dan mengurutkan menaik lalu memotong dari belakang
    // memaksa database membaca seluruh percakapan lebih dulu.
    const rows = await query<PesanRow>(
      `SELECT m.id, m.conversation_id, m.sender_id, u.full_name AS sender_name,
              m.body, m.read_at, m.created_at
       FROM conversation_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [percakapan.id, params.limit, offset],
    )

    const total = hitung?.total ?? 0

    return {
      ...keBentuk(percakapan, user),
      belumDibaca: hitung?.belum ?? 0,
      pesan: rows.reverse().map(kePesan),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /**
   * Kirim satu pesan.
   *
   * Kedua peserta boleh mengirim, dan penerimanya selalu satu-satunya orang
   * lain di percakapan itu. Pemberitahuannya dikirim setelah pesannya
   * tersimpan, dan kegagalannya tidak membatalkan pesan yang sudah sah.
   */
  async kirim(user: AuthUser, id: string, input: KirimPesanInput) {
    const percakapan = await ambil(user, id)

    if (user.role === 'ADMIN') {
      throw new HttpError(
        403,
        'Admin tidak mengirim pesan atas nama siapa pun. Sengketa diselesaikan lewat laporan, bukan percakapan penghuni.',
      )
    }

    const penerima =
      percakapan.tenant_id === user.userId ? percakapan.owner_id : percakapan.tenant_id

    const row = await withTransaction(async (client) => {
      const rows = await client.query<PesanRow>(
        `WITH baru AS (
           INSERT INTO conversation_messages (conversation_id, sender_id, body)
           VALUES ($1, $2, $3)
           RETURNING id, conversation_id, sender_id, body, read_at, created_at
         )
         SELECT b.id, b.conversation_id, b.sender_id, u.full_name AS sender_name,
                b.body, b.read_at, b.created_at
         FROM baru b
         JOIN users u ON u.id = b.sender_id`,
        [percakapan.id, user.userId, input.pesan],
      )

      await client.query(`UPDATE conversations SET last_message_at = now() WHERE id = $1`, [
        percakapan.id,
      ])

      return rows[0]
    })

    if (!row) throw new HttpError(500, 'Pesan gagal disimpan')

    await notificationsService.create({
      userId: penerima,
      jenis: 'NEW_MESSAGE',
      judul: 'Pesan baru',
      pesan: `${row.sender_name} mengirim pesan tentang ${percakapan.property_name}.`,
      entityType: 'conversation',
      entityId: percakapan.id,
    })

    return kePesan(row)
  },
}
