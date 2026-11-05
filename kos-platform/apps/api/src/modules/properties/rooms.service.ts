import type { Request } from 'express'
import { Prisma } from '@prisma/client'
import type { CreateRoomInput, UpdateAvailabilityInput, UpdateRoomInput } from '@nestari/shared'
import { prisma } from '../../config/prisma'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors'
import { writeAuditLog } from '../../utils/audit'
import { relativeStoragePath } from '../../middlewares/upload'
import { removeStorageFile } from '../../utils/storage'
import { roomDto, roomImageDto } from './property.serializers'

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED'] as const
const MAX_ROOM_IMAGES = 8

const roomInclude = Prisma.validator<Prisma.RoomInclude>()({
  images: { orderBy: { displayOrder: 'asc' } },
  facilities: { include: { facility: true } },
})

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

async function assertOwnedProperty(ownerId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true, ownerId: true, publicationStatus: true },
  })
  if (!property) throw new NotFoundError('Property not found')
  if (property.ownerId !== ownerId) {
    throw new ForbiddenError('You can only manage rooms in your own properties')
  }
  return property
}

async function assertOwnedRoom(ownerId: string, propertyId: string, roomId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, propertyId, deletedAt: null },
    include: { property: { select: { ownerId: true } } },
  })
  if (!room) throw new NotFoundError('Room not found')
  if (room.property.ownerId !== ownerId) {
    throw new ForbiddenError('You can only manage rooms in your own properties')
  }
  return room
}

async function refreshRoomCount(propertyId: string) {
  const totalRooms = await prisma.room.count({ where: { propertyId, deletedAt: null } })
  await prisma.property.update({ where: { id: propertyId }, data: { totalRooms } })
  return totalRooms
}

async function markAvailabilityConfirmed(propertyId: string) {
  const now = new Date()
  await prisma.property.update({
    where: { id: propertyId },
    data: { lastAvailabilityConfirmationAt: now },
  })
  return now
}

export async function createRoom(
  ownerId: string,
  propertyId: string,
  input: CreateRoomInput,
  req: Request,
) {
  await assertOwnedProperty(ownerId, propertyId)
  await assertFacilitiesExist(input.facilityIds)

  const duplicate = await prisma.room.findFirst({
    where: { propertyId, roomNumber: input.roomNumber },
    select: { id: true },
  })
  if (duplicate) {
    throw new ConflictError('A room with this number already exists in the property', 'ROOM_NUMBER_TAKEN')
  }

  const now = new Date()
  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.room.create({
      data: {
        propertyId,
        roomNumber: input.roomNumber,
        roomName: input.roomName ?? null,
        description: input.description ?? null,
        roomType: input.roomType,
        areaWidth: input.areaWidth ?? null,
        areaLength: input.areaLength ?? null,
        monthlyPrice: input.monthlyPrice,
        maximumOccupants: input.maximumOccupants,
        bathroomType: input.bathroomType,
        floorNumber: input.floorNumber ?? null,
        availabilityStatus: input.availabilityStatus,
        lastAvailabilityConfirmedAt: now,
        facilities: {
          create: uniqueIds(input.facilityIds).map((facilityId) => ({ facilityId })),
        },
      },
      include: roomInclude,
    })
    const totalRooms = await tx.room.count({ where: { propertyId, deletedAt: null } })
    await tx.property.update({
      where: { id: propertyId },
      data: { totalRooms, lastAvailabilityConfirmationAt: now },
    })
    return created
  })

  await writeAuditLog(req, {
    action: 'ROOM_CREATED',
    entityType: 'ROOM',
    entityId: room.id,
    newValues: { propertyId, roomNumber: room.roomNumber, monthlyPrice: room.monthlyPrice.toString() },
  })

  return roomDto(room)
}

export async function updateRoom(
  ownerId: string,
  propertyId: string,
  roomId: string,
  input: UpdateRoomInput,
  req: Request,
) {
  await assertOwnedRoom(ownerId, propertyId, roomId)
  if (input.facilityIds) await assertFacilitiesExist(input.facilityIds)

  if (input.roomNumber !== undefined) {
    const duplicate = await prisma.room.findFirst({
      where: { propertyId, roomNumber: input.roomNumber, id: { not: roomId } },
      select: { id: true },
    })
    if (duplicate) {
      throw new ConflictError('A room with this number already exists in the property', 'ROOM_NUMBER_TAKEN')
    }
  }

  const scalarData: Prisma.RoomUpdateInput = {}
  const scalarFields = [
    'roomNumber',
    'roomName',
    'description',
    'roomType',
    'areaWidth',
    'areaLength',
    'monthlyPrice',
    'maximumOccupants',
    'bathroomType',
    'floorNumber',
  ] as const
  for (const field of scalarFields) {
    if (input[field] !== undefined) {
      ;(scalarData as Record<string, unknown>)[field] = input[field]
    }
  }
  if (input.availabilityStatus !== undefined) {
    scalarData.availabilityStatus = input.availabilityStatus
    scalarData.lastAvailabilityConfirmedAt = new Date()
  }

  const room = await prisma.$transaction(async (tx) => {
    if (input.facilityIds !== undefined) {
      await tx.roomFacility.deleteMany({ where: { roomId } })
      const ids = uniqueIds(input.facilityIds)
      if (ids.length > 0) {
        await tx.roomFacility.createMany({ data: ids.map((facilityId) => ({ roomId, facilityId })) })
      }
    }
    return tx.room.update({
      where: { id: roomId },
      data: scalarData,
      include: roomInclude,
    })
  })

  if (input.availabilityStatus !== undefined) await markAvailabilityConfirmed(propertyId)

  await writeAuditLog(req, {
    action: 'ROOM_UPDATED',
    entityType: 'ROOM',
    entityId: roomId,
    newValues: { roomNumber: room.roomNumber, monthlyPrice: room.monthlyPrice.toString() },
  })

  return roomDto(room)
}

export async function updateRoomAvailability(
  ownerId: string,
  propertyId: string,
  roomId: string,
  input: UpdateAvailabilityInput,
  req: Request,
) {
  const room = await assertOwnedRoom(ownerId, propertyId, roomId)
  const now = new Date()
  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { availabilityStatus: input.availabilityStatus, lastAvailabilityConfirmedAt: now },
    include: roomInclude,
  })
  await markAvailabilityConfirmed(propertyId)

  await writeAuditLog(req, {
    action: 'ROOM_AVAILABILITY_UPDATED',
    entityType: 'ROOM',
    entityId: roomId,
    oldValues: {
      availabilityStatus: room.availabilityStatus,
      lastAvailabilityConfirmedAt: room.lastAvailabilityConfirmedAt?.toISOString() ?? null,
    },
    newValues: {
      availabilityStatus: updated.availabilityStatus,
      lastAvailabilityConfirmedAt: now.toISOString(),
      note: input.note ?? null,
    },
  })

  return roomDto(updated)
}

export async function deleteRoom(
  ownerId: string,
  propertyId: string,
  roomId: string,
  req: Request,
) {
  await assertOwnedRoom(ownerId, propertyId, roomId)
  const activeBookings = await prisma.booking.count({
    where: { roomId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
  })
  if (activeBookings > 0) {
    throw new ConflictError(
      'This room has active bookings and cannot be deleted',
      'ROOM_IN_USE',
    )
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { deletedAt: new Date(), availabilityStatus: 'INACTIVE' },
  })
  const totalRooms = await refreshRoomCount(propertyId)
  if (totalRooms === 0) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { publicationStatus: 'UNPUBLISHED' },
    })
  }

  await writeAuditLog(req, {
    action: 'ROOM_DELETED',
    entityType: 'ROOM',
    entityId: roomId,
  })

  return { id: roomId, deleted: true }
}

export async function addRoomImages(
  ownerId: string,
  propertyId: string,
  roomId: string,
  files: Express.Multer.File[],
  req: Request,
) {
  await assertOwnedRoom(ownerId, propertyId, roomId)
  if (files.length === 0) throw new BadRequestError('Choose at least one image', 'FILE_REQUIRED')

  const existing = await prisma.roomImage.findMany({
    where: { roomId },
    orderBy: { displayOrder: 'desc' },
  })
  if (existing.length + files.length > MAX_ROOM_IMAGES) {
    for (const file of files) removeStorageFile(relativeStoragePath(file))
    throw new BadRequestError(
      `A room can have at most ${MAX_ROOM_IMAGES} images`,
      'IMAGE_LIMIT_REACHED',
    )
  }

  const nextOrder = (existing[0]?.displayOrder ?? -1) + 1
  try {
    await prisma.roomImage.createMany({
      data: files.map((file, index) => ({
        roomId,
        storagePath: relativeStoragePath(file),
        altText: null,
        displayOrder: nextOrder + index,
      })),
    })
  } catch (error) {
    for (const file of files) removeStorageFile(relativeStoragePath(file))
    throw error
  }

  const images = await prisma.roomImage.findMany({
    where: { roomId },
    orderBy: { displayOrder: 'asc' },
  })

  await writeAuditLog(req, {
    action: 'ROOM_IMAGES_ADDED',
    entityType: 'ROOM',
    entityId: roomId,
    newValues: { count: files.length },
  })

  return images.map(roomImageDto)
}

export async function deleteRoomImage(
  ownerId: string,
  propertyId: string,
  roomId: string,
  imageId: string,
  req: Request,
) {
  await assertOwnedRoom(ownerId, propertyId, roomId)
  const image = await prisma.roomImage.findFirst({ where: { id: imageId, roomId } })
  if (!image) throw new NotFoundError('Image not found')

  await prisma.roomImage.delete({ where: { id: image.id } })
  removeStorageFile(image.storagePath)

  await writeAuditLog(req, {
    action: 'ROOM_IMAGE_DELETED',
    entityType: 'ROOM_IMAGE',
    entityId: imageId,
  })

  return { id: imageId, deleted: true }
}
