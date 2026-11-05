import type { Request } from 'express'
import { Prisma, type FacilityCategory } from '@prisma/client'
import type {
  CreatePropertyInput,
  OwnerPropertyListQuery,
  ReviewSummaryDto,
  UpdatePropertyInput,
} from '@nestari/shared'
import { prisma } from '../../config/prisma'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors'
import { slugify } from '../../utils/slug'
import { writeAuditLog } from '../../utils/audit'
import { relativeStoragePath } from '../../middlewares/upload'
import { removeStorageFile } from '../../utils/storage'
import { paginationMeta } from '../../utils/http'
import {
  facilityDto,
  propertyImageDto,
  toPropertyDetail,
  toPropertyListItem,
} from './property.serializers'

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED'] as const

export const propertyListInclude = Prisma.validator<Prisma.PropertyInclude>()({
  images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
  facilities: { include: { facility: true } },
  rooms: {
    where: { deletedAt: null },
    select: {
      id: true,
      availabilityStatus: true,
      monthlyPrice: true,
      lastAvailabilityConfirmedAt: true,
    },
  },
})

export const propertyDetailInclude = Prisma.validator<Prisma.PropertyInclude>()({
  images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
  facilities: { include: { facility: true } },
  rooms: {
    where: { deletedAt: null },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      facilities: { include: { facility: true } },
    },
  },
  costComponents: { orderBy: [{ billingType: 'asc' }, { createdAt: 'asc' }] },
  rules: { orderBy: { createdAt: 'asc' } },
  owner: { include: { ownerProfile: true } },
  nearbyPlaces: { orderBy: { distanceMeters: 'asc' } },
  reviews: {
    where: { status: 'PUBLISHED' },
    include: { tenant: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
})

const emptyReviewSummary: ReviewSummaryDto = { averageRating: null, count: 0 }

function averageRating(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10
}

async function reviewSummaries(propertyIds: string[]): Promise<Map<string, ReviewSummaryDto>> {
  if (propertyIds.length === 0) return new Map()
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
        averageRating: averageRating(group._avg.rating),
        count: group._count._all,
      },
    ]),
  )
}

async function detailReviewSummary(propertyId: string): Promise<ReviewSummaryDto> {
  const aggregate = await prisma.review.aggregate({
    where: { propertyId, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { _all: true },
  })
  return {
    averageRating: averageRating(aggregate._avg.rating),
    count: aggregate._count._all,
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

async function assertFacilitiesExist(facilityIds: string[]) {
  const ids = uniqueIds(facilityIds)
  if (ids.length === 0) return
  const count = await prisma.facility.count({ where: { id: { in: ids } } })
  if (count !== ids.length) {
    throw new BadRequestError('One or more facilities do not exist', 'INVALID_FACILITY')
  }
}

async function uniquePropertySlug(name: string, city: string): Promise<string> {
  const base = slugify(`${name}-${city}`) || 'property'
  for (let index = 1; index <= 30; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`
    const existing = await prisma.property.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

async function requireOwnedProperty(ownerId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true, ownerId: true, name: true, verificationStatus: true, publicationStatus: true },
  })
  if (!property) throw new NotFoundError('Property not found')
  if (property.ownerId !== ownerId) {
    throw new ForbiddenError('You can only manage your own properties')
  }
  return property
}

function ownedPropertyDetail(ownerId: string, propertyId: string) {
  return prisma.property.findFirst({
    where: { id: propertyId, ownerId, deletedAt: null },
    include: propertyDetailInclude,
  })
}

async function assertCostComponentRooms(propertyId: string, roomIds: Array<string | null | undefined>) {
  const ids = uniqueIds(roomIds.filter((id): id is string => Boolean(id)))
  if (ids.length === 0) return
  const count = await prisma.room.count({
    where: { id: { in: ids }, propertyId, deletedAt: null },
  })
  if (count !== ids.length) {
    throw new BadRequestError('A cost component refers to a room outside this property', 'INVALID_ROOM')
  }
}

export async function createProperty(ownerId: string, input: CreatePropertyInput, req: Request) {
  await assertFacilitiesExist(input.facilityIds)
  if (input.costComponents.some((component) => component.roomId)) {
    throw new BadRequestError(
      'Room-specific costs can only be added after the room exists',
      'INVALID_COST_ROOM',
    )
  }

  const slug = await uniquePropertySlug(input.name, input.city)
  const property = await prisma.property.create({
    data: {
      ownerId,
      name: input.name,
      slug,
      description: input.description,
      address: input.address,
      province: input.province,
      city: input.city,
      district: input.district,
      subdistrict: input.subdistrict ?? null,
      postalCode: input.postalCode ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
      propertyType: input.propertyType,
      genderPolicy: input.genderPolicy,
      facilities: {
        create: uniqueIds(input.facilityIds).map((facilityId) => ({ facilityId })),
      },
      rules: {
        create: input.rules.map((rule) => ({
          title: rule.title,
          description: rule.description ?? null,
          isMandatory: rule.isMandatory,
        })),
      },
      costComponents: {
        create: input.costComponents.map((component) => ({
          name: component.name,
          amount: component.amount,
          billingType: component.billingType,
          isMandatory: component.isMandatory,
          isRefundable: component.isRefundable,
          isEstimated: component.isEstimated,
          isConfirmed: component.isConfirmed,
          description: component.description ?? null,
        })),
      },
    },
    include: propertyListInclude,
  })

  await writeAuditLog(req, {
    action: 'PROPERTY_CREATED',
    entityType: 'PROPERTY',
    entityId: property.id,
    newValues: { name: property.name, city: property.city, slug: property.slug },
  })

  return toPropertyListItem(property, emptyReviewSummary)
}

export async function listOwnedProperties(
  ownerId: string,
  query: OwnerPropertyListQuery,
) {
  const where: Prisma.PropertyWhereInput = {
    ownerId,
    deletedAt: null,
    ...(query.publicationStatus ? { publicationStatus: query.publicationStatus } : {}),
    ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { city: { contains: query.q, mode: 'insensitive' } },
            { address: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [properties, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      include: propertyListInclude,
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.property.count({ where }),
  ])

  const summaries = await reviewSummaries(properties.map((property) => property.id))
  return {
    items: properties.map((property) =>
      toPropertyListItem(property, summaries.get(property.id) ?? emptyReviewSummary),
    ),
    meta: paginationMeta(query.page, query.limit, total),
  }
}

export async function getOwnedProperty(ownerId: string, propertyId: string) {
  const property = await ownedPropertyDetail(ownerId, propertyId)
  if (!property) throw new NotFoundError('Property not found')
  return toPropertyDetail(property, await detailReviewSummary(property.id))
}

export async function getPublicProperty(slugOrId: string, userId?: string) {
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
    include: propertyDetailInclude,
  })
  if (!property) throw new NotFoundError('Property not found or not published')

  const [summary, favorite] = await Promise.all([
    detailReviewSummary(property.id),
    userId
      ? prisma.favorite.findUnique({
          where: { userId_propertyId: { userId, propertyId: property.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  await prisma.propertyView
    .create({ data: { propertyId: property.id, userId: userId ?? null } })
    .catch(() => undefined)

  return toPropertyDetail(property, summary, { isFavorite: Boolean(favorite) })
}

export async function updateProperty(
  ownerId: string,
  propertyId: string,
  input: UpdatePropertyInput,
  req: Request,
) {
  await requireOwnedProperty(ownerId, propertyId)
  if (input.facilityIds) await assertFacilitiesExist(input.facilityIds)
  if (input.costComponents) {
    await assertCostComponentRooms(
      propertyId,
      input.costComponents.map((component) => component.roomId),
    )
  }

  const scalarData: Prisma.PropertyUpdateInput = {}
  const scalarFields = [
    'name',
    'description',
    'address',
    'province',
    'city',
    'district',
    'subdistrict',
    'postalCode',
    'latitude',
    'longitude',
    'propertyType',
    'genderPolicy',
  ] as const
  for (const field of scalarFields) {
    if (input[field] !== undefined) {
      // The fields share the same scalar representation in Prisma's update input.
      ;(scalarData as Record<string, unknown>)[field] = input[field]
    }
  }

  const property = await prisma.$transaction(async (tx) => {
    if (input.facilityIds !== undefined) {
      await tx.propertyFacility.deleteMany({ where: { propertyId } })
      const ids = uniqueIds(input.facilityIds)
      if (ids.length > 0) {
        await tx.propertyFacility.createMany({
          data: ids.map((facilityId) => ({ propertyId, facilityId })),
        })
      }
    }

    if (input.rules !== undefined) {
      await tx.propertyRule.deleteMany({ where: { propertyId } })
      if (input.rules.length > 0) {
        await tx.propertyRule.createMany({
          data: input.rules.map((rule) => ({
            propertyId,
            title: rule.title,
            description: rule.description ?? null,
            isMandatory: rule.isMandatory,
          })),
        })
      }
    }

    if (input.costComponents !== undefined) {
      await tx.costComponent.deleteMany({ where: { propertyId } })
      if (input.costComponents.length > 0) {
        await tx.costComponent.createMany({
          data: input.costComponents.map((component) => ({
            propertyId,
            roomId: component.roomId ?? null,
            name: component.name,
            amount: component.amount,
            billingType: component.billingType,
            isMandatory: component.isMandatory,
            isRefundable: component.isRefundable,
            isEstimated: component.isEstimated,
            isConfirmed: component.isConfirmed,
            description: component.description ?? null,
          })),
        })
      }
    }

    return tx.property.update({
      where: { id: propertyId },
      data: scalarData,
      include: propertyListInclude,
    })
  })

  await writeAuditLog(req, {
    action: 'PROPERTY_UPDATED',
    entityType: 'PROPERTY',
    entityId: propertyId,
    newValues: { name: property.name, city: property.city },
  })

  return toPropertyListItem(property, await detailReviewSummary(propertyId))
}

export async function deleteProperty(ownerId: string, propertyId: string, req: Request) {
  await requireOwnedProperty(ownerId, propertyId)

  const [activeBookings, activeContracts] = await Promise.all([
    prisma.booking.count({
      where: { propertyId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    }),
    prisma.contract.count({ where: { propertyId, status: 'ACTIVE' } }),
  ])
  if (activeBookings > 0 || activeContracts > 0) {
    throw new ConflictError(
      'This property has active bookings or contracts and cannot be deleted',
      'PROPERTY_IN_USE',
    )
  }

  const deletedAt = new Date()
  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: { deletedAt, publicationStatus: 'UNPUBLISHED' },
    }),
    prisma.room.updateMany({
      where: { propertyId, deletedAt: null },
      data: { deletedAt, availabilityStatus: 'INACTIVE' },
    }),
  ])

  await writeAuditLog(req, {
    action: 'PROPERTY_DELETED',
    entityType: 'PROPERTY',
    entityId: propertyId,
  })

  return { id: propertyId, deleted: true }
}

export async function setPublication(
  ownerId: string,
  propertyId: string,
  action: 'publish' | 'unpublish',
  req: Request,
) {
  const property = await requireOwnedProperty(ownerId, propertyId)

  if (action === 'publish') {
    if (property.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenError(
        'Only admin-verified properties can be published',
        'PROPERTY_NOT_VERIFIED',
      )
    }
    const roomCount = await prisma.room.count({
      where: { propertyId, deletedAt: null, monthlyPrice: { gt: 0 } },
    })
    if (roomCount === 0) {
      throw new BadRequestError(
        'Add at least one room with a monthly price before publishing',
        'NO_ROOMS',
      )
    }
    const published = await prisma.property.update({
      where: { id: propertyId },
      data: {
        publicationStatus: 'PUBLISHED',
        publishedAt: property.publicationStatus === 'PUBLISHED' ? undefined : new Date(),
      },
      include: propertyListInclude,
    })
    await writeAuditLog(req, {
      action: 'PROPERTY_PUBLISHED',
      entityType: 'PROPERTY',
      entityId: propertyId,
    })
    return toPropertyListItem(published, await detailReviewSummary(propertyId))
  }

  const unpublished = await prisma.property.update({
    where: { id: propertyId },
    data: { publicationStatus: 'UNPUBLISHED' },
    include: propertyListInclude,
  })
  await writeAuditLog(req, {
    action: 'PROPERTY_UNPUBLISHED',
    entityType: 'PROPERTY',
    entityId: propertyId,
  })
  return toPropertyListItem(unpublished, await detailReviewSummary(propertyId))
}

export async function submitPropertyVerification(
  ownerId: string,
  propertyId: string,
  req: Request,
) {
  const property = await requireOwnedProperty(ownerId, propertyId)
  if (property.verificationStatus === 'VERIFIED' || property.verificationStatus === 'UNDER_REVIEW') {
    throw new ConflictError('This property is already verified or under review', 'ALREADY_SUBMITTED')
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { verificationStatus: 'PENDING' },
  })
  await writeAuditLog(req, {
    action: 'PROPERTY_VERIFICATION_SUBMITTED',
    entityType: 'PROPERTY',
    entityId: propertyId,
    oldValues: { verificationStatus: property.verificationStatus },
    newValues: { verificationStatus: 'PENDING' },
  })
  return { id: propertyId, verificationStatus: 'PENDING' }
}

export async function addPropertyImages(
  ownerId: string,
  propertyId: string,
  files: Express.Multer.File[],
  req: Request,
) {
  await requireOwnedProperty(ownerId, propertyId)
  if (files.length === 0) throw new BadRequestError('Choose at least one image', 'FILE_REQUIRED')

  const existing = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: { displayOrder: 'desc' },
  })
  const maximumImages = 12
  if (existing.length + files.length > maximumImages) {
    for (const file of files) removeStorageFile(relativeStoragePath(file))
    throw new BadRequestError(
      `A property can have at most ${maximumImages} images`,
      'IMAGE_LIMIT_REACHED',
    )
  }

  const hasPrimary = existing.some((image) => image.isPrimary)
  const nextOrder = (existing[0]?.displayOrder ?? -1) + 1

  try {
    await prisma.$transaction(async (tx) => {
      await tx.propertyImage.createMany({
        data: files.map((file, index) => ({
          propertyId,
          storagePath: relativeStoragePath(file),
          altText: null,
          displayOrder: nextOrder + index,
          isPrimary: !hasPrimary && index === 0,
        })),
      })
      await tx.property.update({ where: { id: propertyId }, data: { updatedAt: new Date() } })
    })
  } catch (error) {
    for (const file of files) removeStorageFile(relativeStoragePath(file))
    throw error
  }

  const images = await prisma.propertyImage.findMany({
    where: { propertyId },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
  })

  await writeAuditLog(req, {
    action: 'PROPERTY_IMAGES_ADDED',
    entityType: 'PROPERTY',
    entityId: propertyId,
    newValues: { count: files.length },
  })

  return images.map(propertyImageDto)
}

export async function listFacilities(category?: FacilityCategory) {
  const facilities = await prisma.facility.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
  return facilities.map(facilityDto)
}

export async function deletePropertyImage(
  ownerId: string,
  propertyId: string,
  imageId: string,
  req: Request,
) {
  await requireOwnedProperty(ownerId, propertyId)
  const image = await prisma.propertyImage.findFirst({ where: { id: imageId, propertyId } })
  if (!image) throw new NotFoundError('Image not found')

  await prisma.propertyImage.delete({ where: { id: image.id } })

  if (image.isPrimary) {
    const next = await prisma.propertyImage.findFirst({
      where: { propertyId },
      orderBy: { displayOrder: 'asc' },
    })
    if (next) {
      await prisma.propertyImage.update({ where: { id: next.id }, data: { isPrimary: true } })
    }
  }

  removeStorageFile(image.storagePath)
  await writeAuditLog(req, {
    action: 'PROPERTY_IMAGE_DELETED',
    entityType: 'PROPERTY_IMAGE',
    entityId: imageId,
  })

  return { id: imageId, deleted: true }
}
