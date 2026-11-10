import { randomUUID } from 'node:crypto'

import { PG_ERROR, query, queryOne, withTransaction, type DbClient } from './_shared/db.ts'
import { HttpError } from './_shared/http.ts'
import {
  deleteObject,
  extensionFor,
  publicUrlFor,
  sniffImageType,
  uploadObject,
  type BerkasUnggahan,
} from './_shared/storage.ts'
import type { AuthUser } from './_shared/auth.ts'
import type {
  CreateRoomInput,
  ListRoomsQuery,
  UpdateRoomInput,
  UploadPhotoMeta,
} from './rooms.validator.ts'

/**
 * Kamar tanpa relasi N+1.
 *
 * Fasilitas, jumlah foto, dan foto utamanya dihitung lewat subquery di dalam
 * satu SELECT. Satu halaman hasil karenanya tetap satu query, bukan satu query
 * tambahan per kamar, yang jumlahnya bisa puluhan.
 *
 * Daftar kolomnya eksplisit, tidak ada `SELECT *`: kolom sensitif atau kolom
 * baru tidak akan ikut terkirim hanya karena tabelnya bertambah.
 */
const ROOM_COLUMNS = `
  r.id, r.property_id, r.room_number, r.room_name, r.description, r.room_type,
  r.area_width, r.area_length, r.monthly_price, r.maximum_occupants,
  r.bathroom_type, r.floor_number, r.availability_status, r.created_at,
  p.slug AS property_slug, p.name AS property_name, p.city, p.district,
  COALESCE(
    (SELECT array_agg(f.name ORDER BY f.name)
     FROM room_facilities rf
     JOIN facilities f ON f.id = rf.facility_id
     WHERE rf.room_id = r.id),
    ARRAY[]::text[]
  ) AS facility_names,
  (SELECT ri.storage_path
   FROM room_images ri
   WHERE ri.room_id = r.id
   ORDER BY ri.display_order ASC, ri.created_at ASC
   LIMIT 1) AS primary_photo_path,
  (SELECT count(*)::int FROM room_images ri WHERE ri.room_id = r.id) AS photo_count
`

/** Pengurutan yang diizinkan. Peta tetap, jadi nilainya tidak pernah dari klien. */
const ORDER_BY: Record<ListRoomsQuery['sort'], string> = {
  number_asc: 'r.room_number ASC',
  price_asc: 'r.monthly_price ASC',
  price_desc: 'r.monthly_price DESC',
  newest: 'r.created_at DESC',
}

interface RoomRow {
  id: string
  property_id: string
  room_number: string
  room_name: string | null
  description: string | null
  room_type: string
  area_width: string | null
  area_length: string | null
  monthly_price: string
  maximum_occupants: number
  bathroom_type: string
  floor_number: number | null
  availability_status: string
  created_at: Date
  property_slug: string
  property_name: string
  city: string
  district: string
  facility_names: string[]
  primary_photo_path: string | null
  photo_count: number
}

interface RoomPhotoRow {
  id: string
  storage_path: string
  alt_text: string | null
  display_order: number
}

interface OwnedRoom {
  id: string
  property_id: string
  owner_id: string
}

/**
 * Kolom numeric dikembalikan driver sebagai string supaya tidak kehilangan
 * ketelitian. Klien mengharapkan angka JSON, jadi konversinya dilakukan di
 * sini, satu tempat, bukan tersebar di setiap pemakaian.
 */
const toRoom = (row: RoomRow) => ({
  id: row.id,
  propertyId: row.property_id,
  propertySlug: row.property_slug,
  propertyName: row.property_name,
  city: row.city,
  district: row.district,
  roomNumber: row.room_number,
  roomName: row.room_name,
  description: row.description,
  roomType: row.room_type,
  monthlyPrice: Number(row.monthly_price),
  maximumOccupants: row.maximum_occupants,
  bathroomType: row.bathroom_type,
  areaWidth: row.area_width === null ? null : Number(row.area_width),
  areaLength: row.area_length === null ? null : Number(row.area_length),
  floorNumber: row.floor_number,
  availabilityStatus: row.availability_status,
  facilities: row.facility_names,
  primaryPhotoUrl: publicUrlFor(row.primary_photo_path),
  photoCount: row.photo_count,
  createdAt: row.created_at,
})

const toPhoto = (row: RoomPhotoRow) => ({
  id: row.id,
  url: publicUrlFor(row.storage_path),
  alt: row.alt_text,
  displayOrder: row.display_order,
  isPrimary: row.display_order === 0,
})

/** Kode galat PostgreSQL yang perlu dibedakan pemanggil. */
const isPgError = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === code

/**
 * Syarat visibilitas kamar, ditulis sebagai klausa SQL.
 *
 * Tamu hanya melihat kamar properti yang sudah terbit dan terverifikasi,
 * sama seperti daftar properti publik. Admin melihat semuanya. Pemilik properti
 * melihat seluruh kamar propertinya, termasuk yang masih draf: ia perlu
 * menyiapkan kamar sebelum propertinya dipublikasikan.
 *
 * Nilainya selalu lewat parameter; fungsi ini menambahkan ke `values` dan
 * memakai panjangnya sebagai nomor parameter.
 */
const visibilitySql = (user: AuthUser | null, values: unknown[]): string => {
  const conditions = ['p.deleted_at IS NULL']

  if (user?.role === 'ADMIN') {
    return conditions.join(' AND ')
  }

  if (user) {
    values.push(user.userId)
    conditions.push(
      `((p.publication_status = 'PUBLISHED' AND p.verification_status = 'VERIFIED') OR p.owner_id = $${values.length})`,
    )
    return conditions.join(' AND ')
  }

  conditions.push(`p.publication_status = 'PUBLISHED'`, `p.verification_status = 'VERIFIED'`)
  return conditions.join(' AND ')
}

/**
 * Terjemahkan id kamar menjadi pemilik propertinya, sambil menegakkan aturan
 * kepemilikan.
 *
 * Dijalankan di dalam transaksi supaya kepemilikan tidak berubah antara
 * pemeriksaan dan penulisan. Kamar yang tidak ada menghasilkan 404, kamar
 * milik orang lain 403, pemanggil perlu membedakan keduanya, dan urutannya
 * tidak boleh dibalik supaya keberadaan kamar orang lain tidak bocor.
 */
const findOwnedRoom = async (
  client: DbClient,
  roomId: string,
  actor: AuthUser,
): Promise<OwnedRoom> => {
  const rows = await client.query<OwnedRoom>(
    `SELECT r.id, r.property_id, p.owner_id
     FROM rooms r
     JOIN properties p ON p.id = r.property_id
     WHERE r.id = $1 AND p.deleted_at IS NULL`,
    [roomId],
  )

  const room = rows[0]
  if (!room) {
    throw new HttpError(404, 'Kamar tidak ditemukan')
  }

  if (actor.role !== 'ADMIN' && room.owner_id !== actor.userId) {
    throw new HttpError(403, 'Kamar ini bukan milik properti Anda')
  }

  return room
}

/**
 * Tulis ulang fasilitas kamar: yang lama dihapus, yang baru dimasukkan.
 *
 * Pendekatan ganti-semua, bukan selisih per baris: daftarnya pendek (dibatasi
 * 30 oleh validator) dan hasilnya pasti sama dengan yang dikirim klien, tanpa
 * risiko menyisakan fasilitas lama yang sudah tidak dicentang.
 */
const replaceFacilities = async (
  client: DbClient,
  roomId: string,
  facilityIds: string[],
): Promise<void> => {
  await client.query(`DELETE FROM room_facilities WHERE room_id = $1`, [roomId])

  // Duplikat dibuang lebih dulu: kunci unik (room_id, facility_id) akan menolak
  // id yang sama dua kali, dan itu kesalahan klien yang tidak perlu dilaporkan
  // sebagai kegagalan.
  const unique = [...new Set(facilityIds)]
  if (unique.length === 0) return

  const placeholders = unique.map((_, index) => `($1, $${index + 2})`)

  try {
    await client.query(
      `INSERT INTO room_facilities (room_id, facility_id) VALUES ${placeholders.join(', ')}`,
      [roomId, ...unique],
    )
  } catch (error) {
    if (isPgError(error, PG_ERROR.FOREIGN_KEY_VIOLATION)) {
      throw new HttpError(400, 'Ada fasilitas yang tidak dikenal')
    }
    throw error
  }
}

/**
 * Sinkronkan jumlah kamar properti.
 *
 * `properties.total_rooms` tidak diurus trigger, jadi nilainya dihitung ulang
 * dari tabel `rooms`, bukan ditambah/dikurangi satu. Cara itu tetap benar
 * meski ada perubahan yang gagal di tengah atau data lama yang sudah melenceng.
 */
const syncTotalRooms = async (client: DbClient, propertyId: string): Promise<void> => {
  await client.query(
    `UPDATE properties
     SET total_rooms = (SELECT count(*) FROM rooms WHERE property_id = $1)
     WHERE id = $1`,
    [propertyId],
  )
}

/** Ambil satu kamar lengkap dengan foto dan fasilitasnya. */
const fetchRoomDetail = async (id: string, user: AuthUser | null) => {
  const values: unknown[] = []
  const visibility = visibilitySql(user, values)
  values.push(id)

  const rows = await query<RoomRow>(
    `SELECT ${ROOM_COLUMNS}
     FROM rooms r
     JOIN properties p ON p.id = r.property_id
     WHERE ${visibility} AND r.id = $${values.length}`,
    values,
  )

  const room = rows[0]
  if (!room) {
    throw new HttpError(404, 'Kamar tidak ditemukan')
  }

  const photos = await query<RoomPhotoRow>(
    `SELECT id, storage_path, alt_text, display_order
     FROM room_images
     WHERE room_id = $1
     ORDER BY display_order ASC, created_at ASC`,
    [room.id],
  )

  return { ...toRoom(room), photos: photos.map(toPhoto) }
}

export const roomsService = {
  async list(params: ListRoomsQuery, user: AuthUser | null) {
    const values: unknown[] = []
    const conditions = [visibilitySql(user, values)]

    if (params.propertyId) {
      values.push(params.propertyId)
      conditions.push(`r.property_id = $${values.length}`)
    }
    if (params.slug) {
      values.push(params.slug)
      conditions.push(`p.slug = $${values.length}`)
    }
    if (params.availabilityStatus) {
      values.push(params.availabilityStatus)
      conditions.push(`r.availability_status = $${values.length}`)
    }
    if (params.bathroomType) {
      values.push(params.bathroomType)
      conditions.push(`r.bathroom_type = $${values.length}`)
    }
    if (params.minPrice !== undefined) {
      values.push(params.minPrice)
      conditions.push(`r.monthly_price >= $${values.length}`)
    }
    if (params.maxPrice !== undefined) {
      values.push(params.maxPrice)
      conditions.push(`r.monthly_price <= $${values.length}`)
    }

    const whereSql = `WHERE ${conditions.join(' AND ')}`

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total
       FROM rooms r
       JOIN properties p ON p.id = r.property_id
       ${whereSql}`,
      values,
    )
    const total = countRow?.total ?? 0

    const offset = (params.page - 1) * params.limit

    // `sort` sudah dibatasi enum di validator dan di sini hanya dipakai sebagai
    // kunci peta tetap, teksnya tidak pernah berasal dari permintaan klien.
    // `r.id` jadi penentu terakhir supaya urutan halaman stabil ketika banyak
    // kamar punya harga atau tanggal yang sama; tanpa itu, kamar yang sama bisa
    // muncul dua kali di halaman berbeda.
    const rows = await query<RoomRow>(
      `SELECT ${ROOM_COLUMNS}
       FROM rooms r
       JOIN properties p ON p.id = r.property_id
       ${whereSql}
       ORDER BY ${ORDER_BY[params.sort]}, r.id ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, params.limit, offset],
    )

    return {
      items: rows.map(toRoom),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  async detail(id: string, user: AuthUser | null) {
    return fetchRoomDetail(id, user)
  },

  async create(actor: AuthUser, input: CreateRoomInput) {
    const roomId = await withTransaction(async (client) => {
      const propertyRows = await client.query<{ id: string; owner_id: string }>(
        `SELECT id, owner_id FROM properties WHERE id = $1 AND deleted_at IS NULL`,
        [input.propertyId],
      )

      const property = propertyRows[0]
      if (!property) {
        throw new HttpError(404, 'Properti tidak ditemukan')
      }
      if (actor.role !== 'ADMIN' && property.owner_id !== actor.userId) {
        throw new HttpError(403, 'Properti ini bukan milik Anda')
      }

      let createdId: string

      try {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO rooms (
             property_id, room_number, room_name, description, room_type,
             area_width, area_length, monthly_price, maximum_occupants,
             bathroom_type, floor_number, availability_status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            property.id,
            input.roomNumber,
            input.roomName ?? null,
            input.description ?? null,
            input.roomType,
            input.areaWidth ?? null,
            input.areaLength ?? null,
            input.monthlyPrice,
            input.maximumOccupants,
            input.bathroomType,
            input.floorNumber ?? null,
            input.availabilityStatus,
          ],
        )

        createdId = inserted[0].id
      } catch (error) {
        // Nomor kamar unik per properti; menolaknya sebagai 500 akan
        // menyembunyikan sebab yang bisa langsung diperbaiki pemilik.
        if (isPgError(error, PG_ERROR.UNIQUE_VIOLATION)) {
          throw new HttpError(409, `Nomor kamar ${input.roomNumber} sudah dipakai di properti ini`)
        }
        throw error
      }

      if (input.facilityIds && input.facilityIds.length > 0) {
        await replaceFacilities(client, createdId, input.facilityIds)
      }

      await syncTotalRooms(client, property.id)
      return createdId
    })

    return fetchRoomDetail(roomId, actor)
  },

  async update(actor: AuthUser, id: string, input: UpdateRoomInput) {
    await withTransaction(async (client) => {
      const room = await findOwnedRoom(client, id, actor)

      // Hanya kolom yang benar-benar dikirim yang diubah. Pemetaannya ditulis
      // tetap, nama kolom tidak pernah ditentukan oleh input pengguna.
      const assignments: string[] = []
      const values: unknown[] = []
      const set = (column: string, value: unknown): void => {
        values.push(value)
        assignments.push(`${column} = $${values.length}`)
      }

      if (input.roomNumber !== undefined) set('room_number', input.roomNumber)
      if (input.roomName !== undefined) set('room_name', input.roomName)
      if (input.description !== undefined) set('description', input.description)
      if (input.roomType !== undefined) set('room_type', input.roomType)
      if (input.areaWidth !== undefined) set('area_width', input.areaWidth)
      if (input.areaLength !== undefined) set('area_length', input.areaLength)
      if (input.monthlyPrice !== undefined) set('monthly_price', input.monthlyPrice)
      if (input.maximumOccupants !== undefined) set('maximum_occupants', input.maximumOccupants)
      if (input.bathroomType !== undefined) set('bathroom_type', input.bathroomType)
      if (input.floorNumber !== undefined) set('floor_number', input.floorNumber)
      if (input.availabilityStatus !== undefined) {
        set('availability_status', input.availabilityStatus)
      }

      // updated_at tidak diisi di sini: trigger di database yang mengurusnya.
      if (assignments.length > 0) {
        values.push(room.id)

        try {
          await client.query(
            `UPDATE rooms SET ${assignments.join(', ')} WHERE id = $${values.length}`,
            values,
          )
        } catch (error) {
          if (isPgError(error, PG_ERROR.UNIQUE_VIOLATION)) {
            throw new HttpError(409, 'Nomor kamar itu sudah dipakai di properti ini')
          }
          throw error
        }
      }

      if (input.facilityIds !== undefined) {
        await replaceFacilities(client, room.id, input.facilityIds)
      }
    })

    return fetchRoomDetail(id, actor)
  },

  async remove(actor: AuthUser, id: string) {
    const storagePaths = await withTransaction(async (client) => {
      const room = await findOwnedRoom(client, id, actor)

      // Path fotonya dikumpulkan sebelum barisnya ikut terhapus oleh CASCADE -
      // setelah kamarnya hilang, tidak ada lagi yang menunjuk berkas di bucket.
      const photos = await client.query<{ storage_path: string }>(
        `SELECT storage_path FROM room_images WHERE room_id = $1`,
        [room.id],
      )

      try {
        await client.query(`DELETE FROM rooms WHERE id = $1`, [room.id])
      } catch (error) {
        // Booking dan kontrak menahan penghapusan; keduanya memuat kesepakatan
        // yang masih berlaku, jadi kamarnya tidak boleh hilang di bawahnya.
        if (isPgError(error, PG_ERROR.FOREIGN_KEY_VIOLATION)) {
          throw new HttpError(
            409,
            'Kamar tidak bisa dihapus karena masih terhubung dengan booking atau kontrak',
          )
        }
        throw error
      }

      await syncTotalRooms(client, room.property_id)
      return photos.map((photo) => photo.storage_path)
    })

    // Dihapus setelah transaksi berhasil: kalau penghapusan di database gagal,
    // berkasnya harus tetap ada. `deleteObject` tidak pernah melempar, jadi
    // kegagalan di sini tidak membatalkan penghapusan yang sudah sah.
    await Promise.all(storagePaths.map((path) => deleteObject(path)))

    return { id }
  },

  async addPhoto(actor: AuthUser, id: string, berkas: BerkasUnggahan, meta: UploadPhotoMeta) {
    const room = await queryOne<{ id: string; owner_id: string }>(
      `SELECT r.id, p.owner_id
       FROM rooms r
       JOIN properties p ON p.id = r.property_id
       WHERE r.id = $1 AND p.deleted_at IS NULL`,
      [id],
    )

    if (!room) {
      throw new HttpError(404, 'Kamar tidak ditemukan')
    }
    if (actor.role !== 'ADMIN' && room.owner_id !== actor.userId) {
      throw new HttpError(403, 'Kamar ini bukan milik properti Anda')
    }

    // Jenis gambar ditentukan dari isi berkasnya, bukan dari Content-Type yang
    // dikirim klien: yang terakhir itu bisa ditulis apa saja.
    const mime = sniffImageType(berkas.bytes)
    if (!mime) {
      throw new HttpError(400, 'Berkas yang dikirim bukan gambar JPEG, PNG, atau WebP')
    }

    // Nama objek selalu dibuat server dan selalu di dalam folder kamar ini,
    // sehingga nama berkas dari klien tidak pernah menentukan lokasinya.
    const objectPath = `${room.id}/${randomUUID()}.${extensionFor(mime)}`
    await uploadObject(objectPath, berkas.bytes, mime)

    try {
      return await withTransaction(async (client) => {
        let displayOrder: number

        if (meta.isPrimary) {
          // Urutan 0 adalah foto utama. Foto yang sudah ada digeser satu langkah
          // supaya tidak ada dua foto yang mengaku utama.
          await client.query(
            `UPDATE room_images SET display_order = display_order + 1 WHERE room_id = $1`,
            [room.id],
          )
          displayOrder = 0
        } else {
          const nextRow = await client.query<{ next: number }>(
            `SELECT COALESCE(max(display_order) + 1, 0)::int AS next
             FROM room_images WHERE room_id = $1`,
            [room.id],
          )
          displayOrder = nextRow[0].next
        }

        const inserted = await client.query<RoomPhotoRow>(
          `INSERT INTO room_images (room_id, storage_path, alt_text, display_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id, storage_path, alt_text, display_order`,
          [room.id, objectPath, meta.altText ?? null, displayOrder],
        )

        return toPhoto(inserted[0])
      })
    } catch (error) {
      // Berkasnya sudah terunggah tetapi barisnya gagal: tanpa pembersihan ini
      // berkas itu tidak akan pernah bisa dijangkau lagi dari mana pun.
      await deleteObject(objectPath)
      throw error
    }
  },

  async removePhoto(actor: AuthUser, id: string, photoId: string) {
    const storagePath = await withTransaction(async (client) => {
      const room = await findOwnedRoom(client, id, actor)

      // `room_id` ikut jadi syarat: tanpa itu, id foto milik kamar lain bisa
      // dihapus lewat kamar yang bukan pemiliknya.
      const rows = await client.query<{ storage_path: string }>(
        `DELETE FROM room_images
         WHERE id = $1 AND room_id = $2
         RETURNING storage_path`,
        [photoId, room.id],
      )

      const photo = rows[0]
      if (!photo) {
        throw new HttpError(404, 'Foto tidak ditemukan pada kamar ini')
      }

      return photo.storage_path
    })

    await deleteObject(storagePath)

    return { id: photoId }
  },
}
