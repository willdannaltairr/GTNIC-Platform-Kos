import { query, queryOne } from '../../lib/db'
import { HttpError } from '../../lib/httpError'
import { buildCostSummary, type CostComponentInput } from './cost-summary'
import type { ListPropertiesQuery } from './properties.validator'

/** Kos dianggap perlu konfirmasi ulang bila ketersediaan belum diperbarui 14 hari. */
const AVAILABILITY_STALE_DAYS = 14

const daysSince = (date: Date | null): number | null => {
  if (!date) return null
  const diffMs = Date.now() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Susun klausa WHERE untuk pencarian publik.
 *
 * Seluruh filter benar-benar diterapkan di database. Nilai selalu lewat
 * parameter ($1, $2, …) — tidak ada satu pun yang disisipkan ke dalam teks SQL,
 * sehingga tidak ada celah injeksi meski jumlah filternya berubah-ubah.
 */
const buildWhere = (params: ListPropertiesQuery) => {
  const conditions: string[] = [
    'p.deleted_at IS NULL',
    "p.publication_status = 'PUBLISHED'",
    "p.verification_status = 'VERIFIED'",
  ]
  const values: unknown[] = []

  if (params.q) {
    values.push(`%${params.q}%`)
    const i = values.length
    conditions.push(
      `(p.name ILIKE $${i} OR p.city ILIKE $${i} OR p.district ILIKE $${i} OR p.address ILIKE $${i})`,
    )
  }

  if (params.city) {
    values.push(`%${params.city}%`)
    conditions.push(`p.city ILIKE $${values.length}`)
  }

  if (params.district) {
    values.push(`%${params.district}%`)
    conditions.push(`p.district ILIKE $${values.length}`)
  }

  if (params.type) {
    values.push(params.type)
    conditions.push(`p.property_type = $${values.length}`)
  }

  // Filter kamar harus dipenuhi satu kamar yang sama, bukan dua kamar berbeda.
  const roomConditions: string[] = []
  if (params.bathroomType) {
    values.push(params.bathroomType)
    roomConditions.push(`r.bathroom_type = $${values.length}`)
  }
  if (params.minPrice !== undefined) {
    values.push(params.minPrice)
    roomConditions.push(`r.monthly_price >= $${values.length}`)
  }
  if (params.maxPrice !== undefined) {
    values.push(params.maxPrice)
    roomConditions.push(`r.monthly_price <= $${values.length}`)
  }
  if (roomConditions.length > 0) {
    conditions.push(
      `EXISTS (SELECT 1 FROM rooms r WHERE r.property_id = p.id AND ${roomConditions.join(' AND ')})`,
    )
  }

  if (params.facilities) {
    const slugs = params.facilities
      .split(',')
      .map((slug) => slug.trim())
      .filter(Boolean)

    for (const slug of slugs) {
      values.push(slug)
      const i = values.length
      // Fasilitas boleh ada di level properti maupun di level kamar.
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM property_facilities pf
          JOIN facilities f ON f.id = pf.facility_id
          WHERE pf.property_id = p.id AND f.slug = $${i}
        )
        OR EXISTS (
          SELECT 1 FROM rooms r
          JOIN room_facilities rf ON rf.room_id = r.id
          JOIN facilities f ON f.id = rf.facility_id
          WHERE r.property_id = p.id AND f.slug = $${i}
        )
      )`)
    }
  }

  return { whereSql: `WHERE ${conditions.join(' AND ')}`, values }
}

interface ListRow {
  id: string
  name: string
  slug: string
  city: string
  district: string
  property_type: string
  gender_policy: string
  verification_status: string
  cost_confidence: string
  last_availability_confirmation_at: Date | null
  min_monthly_price: string | null
  max_monthly_price: string | null
  available_rooms: number
  total_rooms: number
  bathroom_types: string[]
  facility_names: string[]
  facility_slugs: string[]
  image_url: string | null
  image_alt: string | null
}

const toListItem = (row: ListRow) => {
  const days = daysSince(row.last_availability_confirmation_at)

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    district: row.district,
    propertyType: row.property_type,
    genderPolicy: row.gender_policy,
    verificationStatus: row.verification_status,
    costConfidence: row.cost_confidence,
    imageUrl: row.image_url,
    imageAlt: row.image_alt ?? row.name,
    minMonthlyPrice: row.min_monthly_price === null ? null : Number(row.min_monthly_price),
    maxMonthlyPrice: row.max_monthly_price === null ? null : Number(row.max_monthly_price),
    availableRooms: row.available_rooms,
    totalRooms: row.total_rooms,
    bathroomTypes: row.bathroom_types,
    facilities: row.facility_names,
    facilitySlugs: row.facility_slugs,
    availabilityConfirmedDaysAgo: days,
    isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
  }
}

/**
 * Ambil data lengkap untuk sekumpulan id properti, lalu kembalikan sesuai
 * urutan id yang diminta.
 *
 * Agregat kamar, fasilitas, dan foto dihitung di database lewat subquery,
 * sehingga satu halaman hasil hanya butuh satu query — bukan satu query per
 * properti.
 */
const fetchListRows = async (ids: string[]): Promise<ListRow[]> => {
  if (ids.length === 0) return []

  const rows = await query<ListRow>(
    `SELECT
       p.id, p.name, p.slug, p.city, p.district, p.property_type, p.gender_policy,
       p.verification_status, p.cost_confidence, p.last_availability_confirmation_at,
       rm.min_monthly_price, rm.max_monthly_price,
       COALESCE(rm.available_rooms, 0)::int AS available_rooms,
       COALESCE(rm.total_rooms, 0)::int     AS total_rooms,
       COALESCE(rm.bathroom_types, ARRAY[]::text[]) AS bathroom_types,
       COALESCE(fc.facility_names, ARRAY[]::text[]) AS facility_names,
       COALESCE(fc.facility_slugs, ARRAY[]::text[]) AS facility_slugs,
       img.image_url, img.alt_text AS image_alt
     FROM properties p
     LEFT JOIN (
       SELECT
         property_id,
         min(monthly_price) AS min_monthly_price,
         max(monthly_price) AS max_monthly_price,
         count(*) FILTER (WHERE availability_status = 'AVAILABLE') AS available_rooms,
         count(*) AS total_rooms,
         array_agg(DISTINCT bathroom_type) AS bathroom_types
       FROM rooms
       GROUP BY property_id
     ) rm ON rm.property_id = p.id
     LEFT JOIN (
       SELECT
         pf.property_id,
         array_agg(f.name ORDER BY f.name) AS facility_names,
         array_agg(f.slug ORDER BY f.name) AS facility_slugs
       FROM property_facilities pf
       JOIN facilities f ON f.id = pf.facility_id
       GROUP BY pf.property_id
     ) fc ON fc.property_id = p.id
     LEFT JOIN LATERAL (
       SELECT pi.image_url, pi.alt_text
       FROM property_images pi
       WHERE pi.property_id = p.id
       ORDER BY pi.display_order ASC
       LIMIT 1
     ) img ON true
     WHERE p.id = ANY($1::uuid[])`,
    [ids],
  )

  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)).filter((row): row is ListRow => row !== undefined)
}

export const propertiesService = {
  async listPublic(params: ListPropertiesQuery) {
    const { whereSql, values } = buildWhere(params)

    const countRow = await queryOne<{ total: number }>(
      `SELECT count(*)::int AS total FROM properties p ${whereSql}`,
      values,
    )
    const total = countRow?.total ?? 0

    const limit = params.limit
    const offset = (params.page - 1) * params.limit

    // Pengurutan harga dihitung dari kamar termurah tiap properti, langsung di
    // database. Properti tanpa kamar selalu di urutan paling akhir.
    const idSql =
      params.sort === 'newest'
        ? `SELECT p.id
           FROM properties p
           ${whereSql}
           ORDER BY p.created_at DESC
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`
        : `SELECT p.id
           FROM properties p
           LEFT JOIN LATERAL (
             SELECT min(monthly_price) AS min_price FROM rooms WHERE property_id = p.id
           ) m ON true
           ${whereSql}
           ORDER BY m.min_price ${params.sort === 'price_asc' ? 'ASC' : 'DESC'} NULLS LAST,
                    p.created_at DESC
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`

    const idRows = await query<{ id: string }>(idSql, [...values, limit, offset])
    const rows = await fetchListRows(idRows.map((row) => row.id))

    return {
      items: rows.map(toListItem),
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  async detailPublic(slug: string) {
    const property = await queryOne<{
      id: string
      name: string
      slug: string
      description: string | null
      address: string
      province: string
      city: string
      district: string
      subdistrict: string | null
      postal_code: string | null
      latitude: string | null
      longitude: string | null
      property_type: string
      gender_policy: string
      verification_status: string
      publication_status: string
      cost_confidence: string
      last_availability_confirmation_at: Date | null
      owner_id: string
      owner_name: string
      owner_business_name: string | null
      owner_verified_at: Date | null
    }>(
      `SELECT
         p.id, p.name, p.slug, p.description, p.address, p.province, p.city, p.district,
         p.subdistrict, p.postal_code, p.latitude, p.longitude, p.property_type,
         p.gender_policy, p.verification_status, p.publication_status, p.cost_confidence,
         p.last_availability_confirmation_at,
         o.id AS owner_id, o.full_name AS owner_name,
         op.business_name AS owner_business_name, op.verified_at AS owner_verified_at
       FROM properties p
       JOIN users o ON o.id = p.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = o.id
       WHERE p.slug = $1
         AND p.deleted_at IS NULL
         AND p.publication_status = 'PUBLISHED'
         AND p.verification_status = 'VERIFIED'`,
      [slug],
    )

    if (!property) {
      throw new HttpError(404, 'Properti tidak ditemukan')
    }

    // Bentuk properti sudah pasti ada, jadi relasinya boleh diambil paralel.
    const [images, facilities, rules, costRows, roomRows] = await Promise.all([
      query<{ id: string; image_url: string | null; alt_text: string | null; is_primary: boolean }>(
        `SELECT id, image_url, alt_text, is_primary
         FROM property_images
         WHERE property_id = $1
         ORDER BY display_order ASC`,
        [property.id],
      ),
      query<{ name: string; slug: string; category: string }>(
        `SELECT f.name, f.slug, f.category
         FROM property_facilities pf
         JOIN facilities f ON f.id = pf.facility_id
         WHERE pf.property_id = $1
         ORDER BY f.name ASC`,
        [property.id],
      ),
      query<{ id: string; rule_title: string; rule_description: string | null; is_mandatory: boolean }>(
        `SELECT id, rule_title, rule_description, is_mandatory
         FROM property_rules
         WHERE property_id = $1
         ORDER BY is_mandatory DESC, rule_title ASC`,
        [property.id],
      ),
      query<{
        id: string
        name: string
        amount: string
        billing_type: string
        is_mandatory: boolean
        is_refundable: boolean
        cost_confidence: string
        description: string | null
      }>(
        `SELECT id, name, amount, billing_type, is_mandatory, is_refundable, cost_confidence, description
         FROM cost_components
         WHERE property_id = $1
         ORDER BY name ASC`,
        [property.id],
      ),
      query<{
        id: string
        room_number: string
        room_name: string | null
        room_type: string
        monthly_price: string
        maximum_occupants: number
        bathroom_type: string
        area_width: string | null
        area_length: string | null
        floor_number: number | null
        availability_status: string
        facility_names: string[]
      }>(
        `SELECT
           r.id, r.room_number, r.room_name, r.room_type, r.monthly_price,
           r.maximum_occupants, r.bathroom_type, r.area_width, r.area_length,
           r.floor_number, r.availability_status,
           COALESCE(
             (SELECT array_agg(f.name ORDER BY f.name)
              FROM room_facilities rf
              JOIN facilities f ON f.id = rf.facility_id
              WHERE rf.room_id = r.id),
             ARRAY[]::text[]
           ) AS facility_names
         FROM rooms r
         WHERE r.property_id = $1
         ORDER BY r.room_number ASC`,
        [property.id],
      ),
    ])

    const prices = roomRows.map((room) => Number(room.monthly_price))
    const minMonthlyPrice = prices.length > 0 ? Math.min(...prices) : null
    const days = daysSince(property.last_availability_confirmation_at)

    const costInputs: CostComponentInput[] = costRows.map((component) => ({
      id: component.id,
      name: component.name,
      amount: Number(component.amount),
      billingType: component.billing_type as CostComponentInput['billingType'],
      isMandatory: component.is_mandatory,
      isRefundable: component.is_refundable,
      confidence: component.cost_confidence as CostComponentInput['confidence'],
      description: component.description,
    }))

    return {
      id: property.id,
      name: property.name,
      slug: property.slug,
      description: property.description,
      address: property.address,
      province: property.province,
      city: property.city,
      district: property.district,
      subdistrict: property.subdistrict,
      postalCode: property.postal_code,
      latitude: property.latitude === null ? null : Number(property.latitude),
      longitude: property.longitude === null ? null : Number(property.longitude),
      propertyType: property.property_type,
      genderPolicy: property.gender_policy,
      verificationStatus: property.verification_status,
      publicationStatus: property.publication_status,
      costConfidence: property.cost_confidence,
      totalRooms: roomRows.length,
      owner: {
        id: property.owner_id,
        name: property.owner_name,
        businessName: property.owner_business_name,
        verified: property.owner_verified_at !== null,
      },
      images: images.map((image) => ({
        id: image.id,
        url: image.image_url,
        alt: image.alt_text ?? property.name,
        isPrimary: image.is_primary,
      })),
      facilities: facilities.map((facility) => ({
        name: facility.name,
        slug: facility.slug,
        category: facility.category,
      })),
      rules: rules.map((rule) => ({
        id: rule.id,
        title: rule.rule_title,
        description: rule.rule_description,
        isMandatory: rule.is_mandatory,
      })),
      rooms: roomRows.map((room) => ({
        id: room.id,
        roomNumber: room.room_number,
        roomName: room.room_name,
        roomType: room.room_type,
        monthlyPrice: Number(room.monthly_price),
        maximumOccupants: room.maximum_occupants,
        bathroomType: room.bathroom_type,
        areaWidth: room.area_width === null ? null : Number(room.area_width),
        areaLength: room.area_length === null ? null : Number(room.area_length),
        floorNumber: room.floor_number,
        availabilityStatus: room.availability_status,
        facilities: room.facility_names,
      })),
      costSummary: buildCostSummary(costInputs, minMonthlyPrice),
      availabilityConfirmedDaysAgo: days,
      isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
    }
  },
}
