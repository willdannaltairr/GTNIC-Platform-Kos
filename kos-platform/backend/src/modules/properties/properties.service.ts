import { Prisma } from '@prisma/client'
import { HttpError } from '../../lib/httpError'
import { prisma } from '../../lib/prisma'
import { buildCostSummary, type CostComponentInput } from './cost-summary'
import type { ListPropertiesQuery } from './properties.validator'

/** Kos dianggap perlu konfirmasi ulang bila ketersediaan belum diperbarui 14 hari. */
const AVAILABILITY_STALE_DAYS = 14

/**
 * Batas atas pengurutan harga: cukup untuk skala saat ini dan mencegah
 * tarikan tanpa batas bila jumlah properti tumbuh besar.
 */
const MAX_PRICE_SORT_ROWS = 1000

const daysSince = (date: Date | null): number | null => {
  if (!date) return null
  const diffMs = Date.now() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const roomSelect = {
  id: true,
  monthly_price: true,
  bathroom_type: true,
  availability_status: true,
} satisfies Prisma.roomsSelect

const listSelect = {
  id: true,
  name: true,
  slug: true,
  city: true,
  district: true,
  property_type: true,
  gender_policy: true,
  verification_status: true,
  cost_confidence: true,
  last_availability_confirmation_at: true,
  rooms: { select: roomSelect },
  images: {
    orderBy: { display_order: 'asc' },
    take: 1,
    select: { image_url: true, alt_text: true },
  },
  facilities: {
    select: { facility: { select: { name: true, slug: true } } },
  },
} satisfies Prisma.propertiesSelect

type ListRow = Prisma.propertiesGetPayload<{ select: typeof listSelect }>

const toListItem = (row: ListRow) => {
  const prices = row.rooms.map((room) => Number(room.monthly_price))
  const availableRooms = row.rooms.filter((room) => room.availability_status === 'AVAILABLE').length
  const bathroomTypes = Array.from(new Set(row.rooms.map((room) => room.bathroom_type)))
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
    imageUrl: row.images[0]?.image_url ?? null,
    imageAlt: row.images[0]?.alt_text ?? row.name,
    minMonthlyPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxMonthlyPrice: prices.length > 0 ? Math.max(...prices) : null,
    availableRooms,
    totalRooms: row.rooms.length,
    bathroomTypes,
    facilities: row.facilities.map((entry) => entry.facility.name),
    facilitySlugs: row.facilities.map((entry) => entry.facility.slug),
    availabilityConfirmedDaysAgo: days,
    isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
  }
}

const detailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  province: true,
  city: true,
  district: true,
  subdistrict: true,
  postal_code: true,
  latitude: true,
  longitude: true,
  property_type: true,
  gender_policy: true,
  verification_status: true,
  publication_status: true,
  cost_confidence: true,
  last_availability_confirmation_at: true,
  total_rooms: true,
  owner: {
    select: {
      id: true,
      full_name: true,
      owner_profile: { select: { business_name: true, verified_at: true } },
    },
  },
  images: {
    orderBy: { display_order: 'asc' },
    select: { id: true, image_url: true, alt_text: true, is_primary: true },
  },
  facilities: {
    select: { facility: { select: { name: true, slug: true, category: true } } },
  },
  rules: { select: { id: true, rule_title: true, rule_description: true, is_mandatory: true } },
  cost_components: {
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      amount: true,
      billing_type: true,
      is_mandatory: true,
      is_refundable: true,
      cost_confidence: true,
      description: true,
    },
  },
  rooms: {
    orderBy: { room_number: 'asc' },
    select: {
      id: true,
      room_number: true,
      room_name: true,
      room_type: true,
      monthly_price: true,
      maximum_occupants: true,
      bathroom_type: true,
      area_width: true,
      area_length: true,
      floor_number: true,
      availability_status: true,
      facilities: { select: { facility: { select: { name: true, slug: true } } } },
    },
  },
} satisfies Prisma.propertiesSelect

type DetailRow = Prisma.propertiesGetPayload<{ select: typeof detailSelect }>

const toDetail = (row: DetailRow) => {
  const prices = row.rooms.map((room) => Number(room.monthly_price))
  const minMonthlyPrice = prices.length > 0 ? Math.min(...prices) : null
  const days = daysSince(row.last_availability_confirmation_at)

  const costInputs: CostComponentInput[] = row.cost_components.map((component) => ({
    id: component.id,
    name: component.name,
    amount: Number(component.amount),
    billingType: component.billing_type,
    isMandatory: component.is_mandatory,
    isRefundable: component.is_refundable,
    confidence: component.cost_confidence,
    description: component.description,
  }))

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    address: row.address,
    province: row.province,
    city: row.city,
    district: row.district,
    subdistrict: row.subdistrict,
    postalCode: row.postal_code,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    propertyType: row.property_type,
    genderPolicy: row.gender_policy,
    verificationStatus: row.verification_status,
    publicationStatus: row.publication_status,
    costConfidence: row.cost_confidence,
    totalRooms: row.rooms.length,
    owner: {
      id: row.owner.id,
      name: row.owner.full_name,
      businessName: row.owner.owner_profile?.business_name ?? null,
      verified: Boolean(row.owner.owner_profile?.verified_at),
    },
    images: row.images.map((image) => ({
      id: image.id,
      url: image.image_url,
      alt: image.alt_text ?? row.name,
      isPrimary: image.is_primary,
    })),
    facilities: row.facilities.map((entry) => ({
      name: entry.facility.name,
      slug: entry.facility.slug,
      category: entry.facility.category,
    })),
    rules: row.rules.map((rule) => ({
      id: rule.id,
      title: rule.rule_title,
      description: rule.rule_description,
      isMandatory: rule.is_mandatory,
    })),
    rooms: row.rooms.map((room) => ({
      id: room.id,
      roomNumber: room.room_number,
      roomName: room.room_name,
      roomType: room.room_type,
      monthlyPrice: Number(room.monthly_price),
      maximumOccupants: room.maximum_occupants,
      bathroomType: room.bathroom_type,
      areaWidth: room.area_width !== null ? Number(room.area_width) : null,
      areaLength: room.area_length !== null ? Number(room.area_length) : null,
      floorNumber: room.floor_number,
      availabilityStatus: room.availability_status,
      facilities: room.facilities.map((entry) => entry.facility.name),
    })),
    costSummary: buildCostSummary(costInputs, minMonthlyPrice),
    availabilityConfirmedDaysAgo: days,
    isAvailabilityStale: days === null || days > AVAILABILITY_STALE_DAYS,
  }
}

export const propertiesService = {
  async listPublic(params: ListPropertiesQuery) {
    const where: Prisma.propertiesWhereInput = {
      deleted_at: null,
      publication_status: 'PUBLISHED',
      verification_status: 'VERIFIED',
    }

    if (params.q) {
      where.OR = [
        { name: { contains: params.q, mode: 'insensitive' } },
        { city: { contains: params.q, mode: 'insensitive' } },
        { district: { contains: params.q, mode: 'insensitive' } },
        { address: { contains: params.q, mode: 'insensitive' } },
      ]
    }

    if (params.city) where.city = { contains: params.city, mode: 'insensitive' }
    if (params.district) where.district = { contains: params.district, mode: 'insensitive' }
    if (params.type) where.property_type = params.type

    const and: Prisma.propertiesWhereInput[] = []

    const roomSome: Prisma.roomsWhereInput = {}
    if (params.bathroomType) roomSome.bathroom_type = params.bathroomType
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      roomSome.monthly_price = {
        ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
        ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
      }
    }
    if (Object.keys(roomSome).length > 0) {
      and.push({ rooms: { some: roomSome } })
    }

    if (params.facilities) {
      const slugs = params.facilities
        .split(',')
        .map((slug) => slug.trim())
        .filter(Boolean)

      for (const slug of slugs) {
        // Fasilitas boleh ada di level properti maupun di level kamar.
        and.push({
          OR: [
            { facilities: { some: { facility: { slug } } } },
            { rooms: { some: { facilities: { some: { facility: { slug } } } } } },
          ],
        })
      }
    }

    if (and.length > 0) where.AND = and

    const [total, items] =
      params.sort === 'newest'
        ? await this.pageByNewest(where, params)
        : await this.pageByPrice(where, params)

    return {
      items,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / params.limit)),
      },
    }
  },

  /** Urutan terbaru: database yang memaginasi langsung. */
  async pageByNewest(where: Prisma.propertiesWhereInput, params: ListPropertiesQuery) {
    const [total, rows] = await prisma.$transaction([
      prisma.properties.count({ where }),
      prisma.properties.findMany({
        where,
        orderBy: [{ created_at: 'desc' }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: listSelect,
      }),
    ])

    return [total, rows.map(toListItem)] as const
  },

  /**
   * Urutan harga: Prisma hanya mendukung orderBy agregat relasi untuk `_count`,
   * bukan `_min`. Jadi id + harga kamar diambil sebagai proyeksi ringan (dua
   * kolom), diurutkan di aplikasi, lalu halaman yang diminta diambil ulang
   * lengkap. Batas MAX_PRICE_SORT_ROWS menjaga biayanya tetap terukur.
   */
  async pageByPrice(where: Prisma.propertiesWhereInput, params: ListPropertiesQuery) {
    const [total, lightRows] = await prisma.$transaction([
      prisma.properties.count({ where }),
      prisma.properties.findMany({
        where,
        take: MAX_PRICE_SORT_ROWS,
        select: { id: true, rooms: { select: { monthly_price: true } } },
      }),
    ])

    const ordered = lightRows
      .map((row) => ({
        id: row.id,
        minPrice:
          row.rooms.length === 0
            ? null
            : Math.min(...row.rooms.map((room) => Number(room.monthly_price))),
      }))
      .sort((a, b) => {
        // Properti tanpa kamar selalu di urutan paling akhir.
        if (a.minPrice === null) return 1
        if (b.minPrice === null) return -1
        return params.sort === 'price_asc' ? a.minPrice - b.minPrice : b.minPrice - a.minPrice
      })

    const offset = (params.page - 1) * params.limit
    const pageIds = ordered.slice(offset, offset + params.limit).map((row) => row.id)

    if (pageIds.length === 0) {
      return [total, []] as const
    }

    const pageRows = await prisma.properties.findMany({
      where: { id: { in: pageIds } },
      select: listSelect,
    })

    const byId = new Map(pageRows.map((row) => [row.id, row]))

    const items = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is ListRow => row !== undefined)
      .map(toListItem)

    return [total, items] as const
  },

  async detailPublic(slug: string) {
    const row = await prisma.properties.findFirst({
      where: {
        slug,
        deleted_at: null,
        publication_status: 'PUBLISHED',
        verification_status: 'VERIFIED',
      },
      select: detailSelect,
    })

    if (!row) {
      throw new HttpError(404, 'Properti tidak ditemukan')
    }

    return toDetail(row)
  },
}
