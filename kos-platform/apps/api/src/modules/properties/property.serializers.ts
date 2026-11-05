import type {
  CostComponentDto,
  FacilityDto,
  OwnerSummaryDto,
  PropertyDetailDto,
  PropertyImageDto,
  PropertyListItemDto,
  ReviewSummaryDto,
  RoomDto,
  RoomImageDto,
} from '@nestari/shared'
import { AVAILABILITY_FRESH_DAYS } from '@nestari/shared'
import type { Prisma } from '@prisma/client'
import { publicMediaUrl } from '../../utils/storage'
import { iso, toNumber } from '../../utils/serialize'

type FacilityRecord = {
  id: string
  name: string
  slug: string
  category: string
  icon: string | null
}

type ImageRecord = {
  id: string
  storagePath: string
  altText: string | null
  displayOrder: number
}

type PropertyImageRecord = ImageRecord & { isPrimary: boolean }

type RoomRecord = {
  id: string
  propertyId: string
  roomNumber: string
  roomName: string | null
  description: string | null
  roomType: string
  areaWidth: unknown
  areaLength: unknown
  monthlyPrice: unknown
  maximumOccupants: number
  bathroomType: string
  floorNumber: number | null
  availabilityStatus: string
  lastAvailabilityConfirmedAt: Date | null
  images: ImageRecord[]
  facilities: Array<{ facility: FacilityRecord }>
}

export type PropertyListRecord = Prisma.PropertyGetPayload<{
  include: {
    images: true
    facilities: { include: { facility: true } }
    rooms: {
      select: {
        id: true
        availabilityStatus: true
        monthlyPrice: true
        lastAvailabilityConfirmedAt: true
      }
    }
  }
}>

export type PropertyDetailRecord = Prisma.PropertyGetPayload<{
  include: {
    images: true
    facilities: { include: { facility: true } }
    rooms: { include: { images: true; facilities: { include: { facility: true } } } }
    costComponents: true
    rules: true
    owner: { include: { ownerProfile: true } }
    nearbyPlaces: true
    reviews: { include: { tenant: { select: { fullName: true } } } }
  }
}>

export function facilityDto(facility: FacilityRecord): FacilityDto {
  return {
    id: facility.id,
    name: facility.name,
    slug: facility.slug,
    category: facility.category,
    icon: facility.icon,
  }
}

export function isAvailabilityStale(date: Date | null): boolean {
  if (!date) return true
  return Date.now() - date.getTime() > AVAILABILITY_FRESH_DAYS * 86_400_000
}

export function roomDto(room: RoomRecord): RoomDto {
  const images: RoomImageDto[] = [...room.images]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((image) => ({
      id: image.id,
      url: publicMediaUrl(image.storagePath),
      altText: image.altText,
      displayOrder: image.displayOrder,
    }))

  return {
    id: room.id,
    propertyId: room.propertyId,
    roomNumber: room.roomNumber,
    roomName: room.roomName,
    description: room.description,
    roomType: room.roomType,
    areaWidth: room.areaWidth === null ? null : toNumber(room.areaWidth),
    areaLength: room.areaLength === null ? null : toNumber(room.areaLength),
    areaSqm:
      room.areaWidth !== null && room.areaLength !== null
        ? Math.round(toNumber(room.areaWidth) * toNumber(room.areaLength) * 100) / 100
        : null,
    monthlyPrice: toNumber(room.monthlyPrice),
    maximumOccupants: room.maximumOccupants,
    bathroomType: room.bathroomType as RoomDto['bathroomType'],
    floorNumber: room.floorNumber,
    availabilityStatus: room.availabilityStatus,
    availabilityIsStale: isAvailabilityStale(room.lastAvailabilityConfirmedAt),
    lastAvailabilityConfirmedAt: iso(room.lastAvailabilityConfirmedAt),
    facilities: room.facilities.map((link) => facilityDto(link.facility)),
    images,
  }
}

export function propertyImageDto(image: PropertyImageRecord): PropertyImageDto {
  return {
    id: image.id,
    url: publicMediaUrl(image.storagePath),
    altText: image.altText,
    isPrimary: image.isPrimary,
    displayOrder: image.displayOrder,
  }
}

export function roomImageDto(image: ImageRecord): RoomImageDto {
  return {
    id: image.id,
    url: publicMediaUrl(image.storagePath),
    altText: image.altText,
    displayOrder: image.displayOrder,
  }
}

function propertyImages(images: PropertyImageRecord[]): PropertyImageDto[] {
  return [...images]
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.displayOrder - b.displayOrder
    })
    .map(propertyImageDto)
}

function latestAvailabilityDate(
  propertyDate: Date | null,
  rooms: Array<{ lastAvailabilityConfirmedAt: Date | null }>,
): Date | null {
  const dates = [
    ...(propertyDate ? [propertyDate] : []),
    ...rooms.map((room) => room.lastAvailabilityConfirmedAt).filter((date): date is Date => Boolean(date)),
  ]
  if (dates.length === 0) return null
  return new Date(Math.max(...dates.map((date) => date.getTime())))
}

export function toPropertyListItem(
  property: PropertyListRecord,
  reviewSummary: ReviewSummaryDto,
  options: { distanceKm?: number | null; isFavorite?: boolean } = {},
): PropertyListItemDto {
  const images = propertyImages(property.images)
  const coverImageUrl = images[0]?.url ?? null
  const availableRooms = property.rooms.filter((room) => room.availabilityStatus === 'AVAILABLE')
  const prices = property.rooms.map((room) => toNumber(room.monthlyPrice)).filter((price) => price > 0)
  const latestConfirmation = latestAvailabilityDate(
    property.lastAvailabilityConfirmationAt,
    property.rooms,
  )

  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    city: property.city,
    district: property.district,
    address: property.address,
    propertyType: property.propertyType,
    genderPolicy: property.genderPolicy,
    verificationStatus: property.verificationStatus,
    publicationStatus: property.publicationStatus,
    latitude: toNumber(property.latitude),
    longitude: toNumber(property.longitude),
    coverImageUrl,
    minMonthlyPrice: prices.length > 0 ? Math.min(...prices) : 0,
    availableRoomCount: availableRooms.length,
    totalRoomCount: property.rooms.length,
    facilities: property.facilities.map((link) => facilityDto(link.facility)),
    availabilityIsStale: isAvailabilityStale(latestConfirmation),
    lastAvailabilityConfirmedAt: iso(latestConfirmation),
    distanceKm: options.distanceKm ?? null,
    reviewSummary,
    createdAt: property.createdAt.toISOString(),
    ...(options.isFavorite !== undefined ? { isFavorite: options.isFavorite } : {}),
  }
}

export function toPropertyDetail(
  property: PropertyDetailRecord,
  reviewSummary: ReviewSummaryDto,
  options: { distanceKm?: number | null; isFavorite?: boolean } = {},
): PropertyDetailDto {
  const rooms = [...property.rooms]
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
    .map((room) => roomDto(room))
  const availableRooms = property.rooms.filter((room) => room.availabilityStatus === 'AVAILABLE')
  const prices = property.rooms.map((room) => toNumber(room.monthlyPrice)).filter((price) => price > 0)
  const images = propertyImages(property.images)
  const latestConfirmation = latestAvailabilityDate(
    property.lastAvailabilityConfirmationAt,
    property.rooms,
  )

  const owner: OwnerSummaryDto = {
    id: property.owner.id,
    fullName: property.owner.fullName,
    avatarUrl: property.owner.avatarUrl,
    businessName: property.owner.ownerProfile?.businessName ?? null,
    verificationStatus: property.owner.ownerProfile?.identityVerificationStatus ?? 'NOT_SUBMITTED',
    memberSince: property.owner.createdAt.toISOString(),
  }

  const components: CostComponentDto[] = property.costComponents.map((component) => ({
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

  const costConfidence =
    components.length === 0
      ? 'NEEDS_CONFIRMATION'
      : components.some((component) => !component.isConfirmed)
        ? 'NEEDS_CONFIRMATION'
        : components.some((component) => component.isEstimated)
          ? 'PARTIAL'
          : 'COMPLETE'

  return {
    id: property.id,
    slug: property.slug,
    name: property.name,
    city: property.city,
    district: property.district,
    address: property.address,
    propertyType: property.propertyType,
    genderPolicy: property.genderPolicy,
    verificationStatus: property.verificationStatus,
    publicationStatus: property.publicationStatus,
    latitude: toNumber(property.latitude),
    longitude: toNumber(property.longitude),
    coverImageUrl: images[0]?.url ?? null,
    minMonthlyPrice: prices.length > 0 ? Math.min(...prices) : 0,
    availableRoomCount: availableRooms.length,
    totalRoomCount: property.rooms.length,
    facilities: property.facilities.map((link) => facilityDto(link.facility)),
    availabilityIsStale: isAvailabilityStale(latestConfirmation),
    lastAvailabilityConfirmedAt: iso(latestConfirmation),
    distanceKm: options.distanceKm ?? null,
    reviewSummary,
    createdAt: property.createdAt.toISOString(),
    ...(options.isFavorite !== undefined ? { isFavorite: options.isFavorite } : {}),
    description: property.description,
    province: property.province,
    subdistrict: property.subdistrict,
    postalCode: property.postalCode,
    images,
    rooms,
    costComponents: components,
    rules: property.rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      isMandatory: rule.isMandatory,
    })),
    owner,
    nearbyPlaces: property.nearbyPlaces.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      distanceMeters: place.distanceMeters,
      source: place.source,
    })),
    reviews: property.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      tenantName: review.tenant.fullName,
      createdAt: review.createdAt.toISOString(),
    })),
    costConfidence,
    hasCoordinates: true,
  }
}
