import { Prisma, type DestinationCategory } from '@prisma/client'
import type {
  CostComponentDto,
  CostSimulatorInput,
  KosMatchInput,
  MatchCandidate,
  MatchPreferences,
  PropertySearchInput,
} from '@nestari/shared'
import {
  AVAILABILITY_FRESH_DAYS,
  buildMatchResponse,
  calculateTrueCost,
} from '@nestari/shared'
import { prisma } from '../../config/prisma'
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../utils/errors'
import { boundingBox, haversineKm, travelEstimate } from '../../utils/geo'
import { publicMediaUrl } from '../../utils/storage'
import { toNumber } from '../../utils/serialize'
import {
  isAvailabilityStale,
  toPropertyDetail,
  toPropertyListItem,
  type PropertyDetailRecord,
} from '../properties/property.serializers'
import {
  propertyDetailInclude,
  propertyListInclude,
} from '../properties/properties.service'

const matchInclude = Prisma.validator<Prisma.PropertyInclude>()({
  images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
  facilities: { include: { facility: true } },
  rooms: {
    where: { deletedAt: null },
    select: {
      id: true,
      monthlyPrice: true,
      roomType: true,
      bathroomType: true,
      availabilityStatus: true,
      lastAvailabilityConfirmedAt: true,
      facilities: { include: { facility: { select: { slug: true } } } },
    },
  },
})

type MatchPropertyRecord = Prisma.PropertyGetPayload<{ include: typeof matchInclude }>

const emptySummary = { averageRating: null, count: 0 }

function latestConfirmation(property: {
  lastAvailabilityConfirmationAt: Date | null
  rooms: Array<{ lastAvailabilityConfirmedAt: Date | null }>
}): Date | null {
  const dates = [
    ...(property.lastAvailabilityConfirmationAt ? [property.lastAvailabilityConfirmationAt] : []),
    ...property.rooms
      .map((room) => room.lastAvailabilityConfirmedAt)
      .filter((date): date is Date => Boolean(date)),
  ]
  if (dates.length === 0) return null
  return new Date(Math.max(...dates.map((date) => date.getTime())))
}

async function reviewSummaries(propertyIds: string[]) {
  if (propertyIds.length === 0) return new Map<string, { averageRating: number | null; count: number }>()
  const groups = await prisma.review.groupBy({
    by: ['propertyId'],
    where: { propertyId: { in: propertyIds }, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { _all: true },
  })
  return new Map(
    groups.map((group) => [
      group.propertyId,
      {
        averageRating:
          group._avg.rating === null ? null : Math.round(group._avg.rating * 10) / 10,
        count: group._count._all,
      },
    ]),
  )
}

async function favoriteIds(userId: string | undefined, propertyIds: string[]) {
  if (!userId || propertyIds.length === 0) return new Set<string>()
  const favorites = await prisma.favorite.findMany({
    where: { userId, propertyId: { in: propertyIds } },
    select: { propertyId: true },
  })
  return new Set(favorites.map((favorite) => favorite.propertyId))
}

async function findDestination(destinationId: string) {
  const destination = await prisma.destination.findUnique({ where: { id: destinationId } })
  if (!destination) throw new NotFoundError('Destination not found')
  return {
    id: destination.id,
    name: destination.name,
    category: destination.category,
    address: destination.address,
    city: destination.city,
    latitude: toNumber(destination.latitude),
    longitude: toNumber(destination.longitude),
  }
}

export async function searchProperties(query: PropertySearchInput, userId?: string) {
  let latitude = query.lat
  let longitude = query.lng
  let destinationLabel: string | null = null
  if (query.destinationId) {
    const destination = await findDestination(query.destinationId)
    latitude = destination.latitude
    longitude = destination.longitude
    destinationLabel = destination.name
  }

  const roomFilters: Prisma.RoomWhereInput = { deletedAt: null }
  let hasRoomFilter = false
  if (query.roomType) {
    roomFilters.roomType = query.roomType
    hasRoomFilter = true
  }
  if (query.bathroomType) {
    roomFilters.bathroomType = query.bathroomType
    hasRoomFilter = true
  }
  if (query.availableOnly === true) {
    roomFilters.availabilityStatus = 'AVAILABLE'
    hasRoomFilter = true
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    roomFilters.monthlyPrice = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    }
    hasRoomFilter = true
  }

  const where: Prisma.PropertyWhereInput = {
    deletedAt: null,
    publicationStatus: 'PUBLISHED',
    verificationStatus: 'VERIFIED',
    ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    ...(query.district ? { district: { equals: query.district, mode: 'insensitive' } } : {}),
    ...(query.province ? { province: { equals: query.province, mode: 'insensitive' } } : {}),
    ...(query.propertyType ? { propertyType: query.propertyType } : {}),
    ...(query.genderPolicy ? { genderPolicy: query.genderPolicy } : {}),
    ...(hasRoomFilter ? { rooms: { some: roomFilters } } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { address: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
            { district: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(query.facilities && query.facilities.length > 0
      ? {
          AND: query.facilities.map((slug) => ({
            facilities: { some: { facility: { slug } } },
          })),
        }
      : {}),
  }

  if (query.radiusKm !== undefined && latitude !== undefined && longitude !== undefined) {
    const box = boundingBox(latitude, longitude, query.radiusKm)
    where.latitude = { gte: box.minLat, lte: box.maxLat }
    where.longitude = { gte: box.minLng, lte: box.maxLng }
  }

  const properties = await prisma.property.findMany({
    where,
    include: propertyListInclude,
    orderBy: { createdAt: 'desc' },
  })
  const summaries = await reviewSummaries(properties.map((property) => property.id))
  const favorites = await favoriteIds(userId, properties.map((property) => property.id))

  let items = properties.map((property) => {
    const distanceKm =
      latitude !== undefined && longitude !== undefined
        ? Math.round(
            haversineKm(
              latitude,
              longitude,
              toNumber(property.latitude),
              toNumber(property.longitude),
            ) * 100,
          ) / 100
        : null
    return toPropertyListItem(property, summaries.get(property.id) ?? emptySummary, {
      distanceKm,
      ...(userId ? { isFavorite: favorites.has(property.id) } : {}),
    })
  })

  if (query.radiusKm !== undefined && latitude !== undefined && longitude !== undefined) {
    items = items.filter((item) => item.distanceKm !== null && item.distanceKm <= query.radiusKm!)
  }
  if (query.minRating !== undefined) {
    items = items.filter(
      (item) =>
        item.reviewSummary.averageRating !== null &&
        item.reviewSummary.averageRating >= query.minRating!,
    )
  }

  const sort = query.sort
  items.sort((a, b) => {
    if (sort === 'price_asc') return a.minMonthlyPrice - b.minMonthlyPrice
    if (sort === 'price_desc') return b.minMonthlyPrice - a.minMonthlyPrice
    if (sort === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    if (sort === 'rating') {
      return (b.reviewSummary.averageRating ?? -1) - (a.reviewSummary.averageRating ?? -1)
    }
    if (sort === 'distance') {
      if (a.distanceKm === null && b.distanceKm === null) return 0
      if (a.distanceKm === null) return 1
      if (b.distanceKm === null) return -1
      return a.distanceKm - b.distanceKm
    }
    const ratingDifference =
      (b.reviewSummary.averageRating ?? 0) - (a.reviewSummary.averageRating ?? 0)
    if (ratingDifference !== 0) return ratingDifference
    if (b.availableRoomCount !== a.availableRoomCount) {
      return b.availableRoomCount - a.availableRoomCount
    }
    return a.minMonthlyPrice - b.minMonthlyPrice
  })

  const total = items.length
  const start = (query.page - 1) * query.limit
  const pageItems = items.slice(start, start + query.limit)

  return {
    items: pageItems,
    total,
    context: {
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      destinationLabel,
      radiusKm: query.radiusKm ?? null,
      sort,
      page: query.page,
      limit: query.limit,
    },
  }
}

function candidateFrom(
  property: MatchPropertyRecord,
  destination: { latitude: number; longitude: number } | null,
): MatchCandidate | null {
  const rooms = property.rooms.filter((room) => toNumber(room.monthlyPrice) > 0)
  if (rooms.length === 0) return null

  const availableRooms = rooms.filter((room) => room.availabilityStatus === 'AVAILABLE')
  const pricedRooms = availableRooms.length > 0 ? availableRooms : rooms
  const selected = [...pricedRooms].sort(
    (a, b) => toNumber(a.monthlyPrice) - toNumber(b.monthlyPrice),
  )[0]
  const latest = latestConfirmation(property)
  const cover = [...property.images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.displayOrder - b.displayOrder
  })[0]
  const facilitySlugs = new Set<string>([
    ...property.facilities.map((link) => link.facility.slug),
    ...selected.facilities.map((link) => link.facility.slug),
  ])
  const distanceKm = destination
    ? Math.round(
        haversineKm(
          destination.latitude,
          destination.longitude,
          toNumber(property.latitude),
          toNumber(property.longitude),
        ) * 100,
      ) / 100
    : null

  return {
    propertyId: property.id,
    slug: property.slug,
    name: property.name,
    city: property.city,
    district: property.district,
    monthlyPrice: toNumber(selected.monthlyPrice),
    distanceKm,
    roomType: selected.roomType,
    bathroomType: selected.bathroomType,
    facilitySlugs: [...facilitySlugs],
    availableRoomCount: property.rooms.filter((room) => room.availabilityStatus === 'AVAILABLE')
      .length,
    hasVerifiedAvailability: !isAvailabilityStale(latest),
    coverImageUrl: cover ? publicMediaUrl(cover.storagePath) : null,
  }
}

export async function matchProperties(input: KosMatchInput, userId?: string) {
  let destination: { latitude: number; longitude: number; label?: string } | null = null
  if (input.destinationId) {
    const found = await findDestination(input.destinationId)
    destination = {
      latitude: found.latitude,
      longitude: found.longitude,
      label: found.name,
    }
  } else if (input.destinationLat !== undefined && input.destinationLng !== undefined) {
    destination = {
      latitude: input.destinationLat,
      longitude: input.destinationLng,
      label: input.destinationLabel,
    }
  }

  if (input.persist && !userId) {
    throw new UnauthorizedError('Sign in to save your match preferences')
  }

  const properties = await prisma.property.findMany({
    where: {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      ...(input.city ? { city: { equals: input.city, mode: 'insensitive' } } : {}),
      ...(input.genderPolicy ? { genderPolicy: input.genderPolicy } : {}),
      ...(input.availableOnly
        ? { rooms: { some: { deletedAt: null, availabilityStatus: 'AVAILABLE' } } }
        : {}),
    },
    include: matchInclude,
    take: 300,
  })

  const candidates = properties
    .map((property) => candidateFrom(property, destination))
    .filter((candidate): candidate is MatchCandidate => candidate !== null)

  const preferences: MatchPreferences = {
    destinationId: input.destinationId ?? null,
    destinationLat: destination?.latitude ?? null,
    destinationLng: destination?.longitude ?? null,
    destinationLabel: input.destinationLabel ?? destination?.label ?? null,
    maximumBudget: input.maximumBudget ?? null,
    maximumDistanceKm: input.maximumDistanceKm ?? null,
    roomType: input.roomType ?? null,
    bathroomType: input.bathroomType ?? null,
    facilitySlugs: input.facilitySlugs,
    genderPolicy: input.genderPolicy ?? null,
    city: input.city ?? null,
    availableOnly: input.availableOnly,
  }

  const response = buildMatchResponse(candidates, preferences, input.weights)
  response.results = response.results.slice(0, input.limit)

  const keep = new Set(response.results.map((result) => result.propertyId))
  const pickCategory = (value: typeof response.categories.bestOverall) =>
    value && keep.has(value.propertyId) ? value : null
  response.categories = {
    bestOverall: pickCategory(response.categories.bestOverall),
    bestBudget: pickCategory(response.categories.bestBudget),
    bestLocation: pickCategory(response.categories.bestLocation),
    bestFacilities: pickCategory(response.categories.bestFacilities),
  }

  if (input.persist && userId) {
    const facilities = await prisma.facility.findMany({
      where: { slug: { in: input.facilitySlugs } },
      select: { id: true },
    })
    await prisma.$transaction(async (tx) => {
      const preference = await tx.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          maximumBudget: input.maximumBudget ?? null,
          preferredCity: input.city ?? null,
          preferredGenderPolicy: input.genderPolicy ?? null,
          preferredRoomType: input.roomType ?? null,
          preferredBathroomType: input.bathroomType ?? null,
          maximumDistanceKm: input.maximumDistanceKm ?? null,
          preferredDestinationId: input.destinationId ?? null,
        },
        update: {
          maximumBudget: input.maximumBudget ?? null,
          preferredCity: input.city ?? null,
          preferredGenderPolicy: input.genderPolicy ?? null,
          preferredRoomType: input.roomType ?? null,
          preferredBathroomType: input.bathroomType ?? null,
          maximumDistanceKm: input.maximumDistanceKm ?? null,
          preferredDestinationId: input.destinationId ?? null,
        },
      })
      await tx.userPreferenceFacility.deleteMany({ where: { preferenceId: preference.id } })
      if (facilities.length > 0) {
        await tx.userPreferenceFacility.createMany({
          data: facilities.map((facility) => ({
            preferenceId: preference.id,
            facilityId: facility.id,
          })),
        })
      }
    })
  }

  return response
}

function splitDeposit(components: CostComponentDto[]) {
  const deposit = components.find(
    (component) => /deposit|jaminan/i.test(component.name) ||
      (component.billingType === 'ONE_TIME' && component.isRefundable),
  )
  return {
    deposit,
    components: components.filter((component) => component.id !== deposit?.id),
  }
}

function costComponentsOfRoom(
  propertyCosts: Array<{
    id: string
    roomId: string | null
    name: string
    amount: unknown
    billingType: string
    isMandatory: boolean
    isRefundable: boolean
    isEstimated: boolean
    isConfirmed: boolean
    description: string | null
  }>,
  roomId: string,
): CostComponentDto[] {
  return propertyCosts
    .filter((component) => component.roomId === null || component.roomId === roomId)
    .map((component) => ({
      id: component.id,
      name: component.name,
      amount: toNumber(component.amount),
      billingType: component.billingType as CostComponentDto['billingType'],
      isMandatory: component.isMandatory,
      isRefundable: component.isRefundable,
      isEstimated: component.isEstimated,
      isConfirmed: component.isConfirmed,
      description: component.description,
      roomId: component.roomId,
    }))
}

export async function simulateCost(input: CostSimulatorInput, userId?: string) {
  const publicProperty = {
    deletedAt: null,
    publicationStatus: 'PUBLISHED' as const,
    verificationStatus: 'VERIFIED' as const,
  }

  const room = input.roomId
    ? await prisma.room.findFirst({
        where: {
          id: input.roomId,
          deletedAt: null,
          ...(input.propertyId ? { propertyId: input.propertyId } : {}),
          property: publicProperty,
        },
        include: { property: { include: { costComponents: true } } },
      })
    : await prisma.room.findFirst({
        where: {
          propertyId: input.propertyId!,
          deletedAt: null,
          availabilityStatus: 'AVAILABLE',
          property: publicProperty,
        },
        include: { property: { include: { costComponents: true } } },
        orderBy: { monthlyPrice: 'asc' },
      })

  if (!room) {
    throw new NotFoundError('No listed room was found for this cost simulation')
  }

  const components = costComponentsOfRoom(room.property.costComponents, room.id)
  const { deposit, components: otherComponents } = splitDeposit(components)
  const simulation = calculateTrueCost({
    monthlyRent: toNumber(room.monthlyPrice),
    deposit: deposit?.amount,
    depositConfirmed: deposit?.isConfirmed,
    depositRefundable: deposit?.isRefundable,
    components: otherComponents.map((component) => ({
      id: component.id,
      name: component.name,
      amount: component.amount,
      billingType: component.billingType,
      isMandatory: component.isMandatory,
      isRefundable: component.isRefundable,
      isEstimated: component.isEstimated,
      isConfirmed: component.isConfirmed,
    })),
    durationMonths: input.durationMonths,
    monthlyBudget: input.monthlyBudget ?? null,
    upfrontBudget: input.upfrontBudget ?? null,
  })

  return {
    property: {
      id: room.property.id,
      name: room.property.name,
      slug: room.property.slug,
      city: room.property.city,
    },
    room: {
      id: room.id,
      roomNumber: room.roomNumber,
      roomName: room.roomName,
      monthlyPrice: toNumber(room.monthlyPrice),
      availabilityStatus: room.availabilityStatus,
    },
    simulation,
    generatedAt: new Date().toISOString(),
    generatedForUserId: userId ?? null,
  }
}

export async function compareProperties(ids: string[]) {
  const unique = [...new Set(ids)]
  const properties = await prisma.property.findMany({
    where: {
      id: { in: unique },
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
    },
    include: propertyDetailInclude,
  })
  if (properties.length === 0) throw new NotFoundError('No published properties found for comparison')

  const byId = new Map(properties.map((property) => [property.id, property]))
  const ordered = unique
    .map((id) => byId.get(id))
    .filter((property): property is PropertyDetailRecord => Boolean(property))

  const details = await Promise.all(
    ordered.map(async (property) => {
      const aggregate = await prisma.review.aggregate({
        where: { propertyId: property.id, status: 'PUBLISHED' },
        _avg: { rating: true },
        _count: { _all: true },
      })
      return toPropertyDetail(property, {
        averageRating:
          aggregate._avg.rating === null ? null : Math.round(aggregate._avg.rating * 10) / 10,
        count: aggregate._count._all,
      })
    }),
  )

  const facilityMap = new Map<
    string,
    { slug: string; name: string; category: string; propertyIds: Set<string> }
  >()
  for (const detail of details) {
    for (const facility of detail.facilities) {
      const existing = facilityMap.get(facility.slug) ?? {
        slug: facility.slug,
        name: facility.name,
        category: facility.category,
        propertyIds: new Set<string>(),
      }
      existing.propertyIds.add(detail.id)
      facilityMap.set(facility.slug, existing)
    }
  }

  const comparisons = await Promise.all(
    ordered.map(async (property) => {
      const cheapest = [...property.rooms]
        .filter((room) => toNumber(room.monthlyPrice) > 0)
        .sort((a, b) => toNumber(a.monthlyPrice) - toNumber(b.monthlyPrice))[0]
      if (!cheapest) return null
      const components: CostComponentDto[] = property.costComponents
        .filter((component) => component.roomId === null || component.roomId === cheapest.id)
        .map((component) => ({
          id: component.id,
          name: component.name,
          amount: toNumber(component.amount),
          billingType: component.billingType,
          isMandatory: component.isMandatory,
          isRefundable: component.isRefundable,
          isEstimated: component.isEstimated,
          isConfirmed: component.isConfirmed,
          description: component.description,
          roomId: component.roomId,
        }))
      const { deposit, components: otherComponents } = splitDeposit(components)
      return {
        propertyId: property.id,
        slug: property.slug,
        name: property.name,
        city: property.city,
        monthlyRent: toNumber(cheapest.monthlyPrice),
        roomNumber: cheapest.roomNumber,
        simulation: calculateTrueCost({
          monthlyRent: toNumber(cheapest.monthlyPrice),
          deposit: deposit?.amount,
          depositConfirmed: deposit?.isConfirmed,
          depositRefundable: deposit?.isRefundable,
          components: otherComponents.map((component) => ({
            id: component.id,
            name: component.name,
            amount: component.amount,
            billingType: component.billingType,
            isMandatory: component.isMandatory,
            isRefundable: component.isRefundable,
            isEstimated: component.isEstimated,
            isConfirmed: component.isConfirmed,
          })),
          durationMonths: 1,
        }),
      }
    }),
  )

  return {
    properties: details.map((detail, index) => {
      const comparison = comparisons[index]
      return {
        ...detail,
        costComparison: comparison
          ? {
              monthlyRent: comparison.monthlyRent,
              monthlyEstimated: comparison.simulation.monthlyEstimated,
              upfrontEstimated: comparison.simulation.upfrontEstimated,
              deposit: comparison.simulation.deposit,
              confidence: comparison.simulation.confidence,
              roomNumber: comparison.roomNumber,
            }
          : null,
      }
    }),
    facilityMatrix: [...facilityMap.values()].map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      category: entry.category,
      availableByProperty: Object.fromEntries(
        details.map((detail) => [detail.id, entry.propertyIds.has(detail.id)]),
      ),
    })),
    disclaimer:
      'Comparison uses owner-provided prices and cost components. Verify availability, deposit terms and variable costs before paying.',
  }
}

export async function listDestinations(query: { q?: string; category?: DestinationCategory }) {
  const destinations = await prisma.destination.findMany({
    where: {
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { city: { contains: query.q, mode: 'insensitive' } },
              { address: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  return destinations.map((destination) => ({
    id: destination.id,
    name: destination.name,
    category: destination.category,
    address: destination.address,
    city: destination.city,
    latitude: toNumber(destination.latitude),
    longitude: toNumber(destination.longitude),
  }))
}

export async function propertyTravelEstimate(
  slugOrId: string,
  query: { destinationId?: string; lat?: number; lng?: number; mode: string },
) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    slugOrId,
  )
  const property = await prisma.property.findFirst({
    where: {
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      OR: [{ slug: slugOrId }, ...(isUuid ? [{ id: slugOrId }] : [])],
    },
    select: { id: true, name: true, slug: true, latitude: true, longitude: true },
  })
  if (!property) throw new NotFoundError('Property not found or not published')

  let latitude = query.lat
  let longitude = query.lng
  let destinationLabel: string | null = null
  let destinationId: string | null = null
  if (query.destinationId) {
    const destination = await findDestination(query.destinationId)
    latitude = destination.latitude
    longitude = destination.longitude
    destinationLabel = destination.name
    destinationId = destination.id
  }
  if (latitude === undefined || longitude === undefined) {
    throw new BadRequestError(
      'Provide a destinationId or both lat and lng',
      'DESTINATION_REQUIRED',
    )
  }

  const distanceKm =
    Math.round(
      haversineKm(latitude, longitude, toNumber(property.latitude), toNumber(property.longitude)) *
        100,
    ) / 100
  return {
    property: {
      id: property.id,
      name: property.name,
      slug: property.slug,
    },
    destination: {
      id: destinationId,
      label: destinationLabel,
      latitude,
      longitude,
    },
    mode: query.mode,
    distanceKm,
    travel: travelEstimate(distanceKm, query.mode),
    method: 'STRAIGHT_LINE_ESTIMATE',
  }
}

export async function listFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      property: {
        deletedAt: null,
        publicationStatus: 'PUBLISHED',
        verificationStatus: 'VERIFIED',
      },
    },
    include: { property: { include: propertyListInclude } },
    orderBy: { createdAt: 'desc' },
  })
  const summaries = await reviewSummaries(favorites.map((favorite) => favorite.propertyId))
  return favorites.map((favorite) =>
    toPropertyListItem(favorite.property, summaries.get(favorite.propertyId) ?? emptySummary, {
      isFavorite: true,
    }),
  )
}

export async function addFavorite(userId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      deletedAt: null,
      publicationStatus: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
    },
    select: { id: true },
  })
  if (!property) throw new NotFoundError('Property not found or not published')

  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    create: { userId, propertyId },
    update: {},
  })
  return { propertyId, isFavorite: true }
}

export async function removeFavorite(userId: string, propertyId: string) {
  await prisma.favorite.deleteMany({ where: { userId, propertyId } })
  return { propertyId, isFavorite: false }
}

export function freshnessWindowDays() {
  return AVAILABILITY_FRESH_DAYS
}
