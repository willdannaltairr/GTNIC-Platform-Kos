import type { Request, Response } from 'express'
import type { OwnerPropertyListQuery } from '@nestari/shared'
import type { FacilityCategory } from '@prisma/client'
import * as propertiesService from './properties.service'
import * as roomsService from './rooms.service'
import { sendSuccess } from '../../utils/http'
import { validatedParams, validatedQuery } from '../../middlewares/validate'

function uploadedFiles(req: Request): Express.Multer.File[] {
  return Array.isArray(req.files) ? req.files : []
}

export async function listFacilities(req: Request, res: Response) {
  const { category } = validatedQuery<{ category?: FacilityCategory }>(res)
  const facilities = await propertiesService.listFacilities(category)
  return sendSuccess(res, facilities, 'Facilities retrieved')
}

export async function createProperty(req: Request, res: Response) {
  const property = await propertiesService.createProperty(req.user!.id, req.body, req)
  return sendSuccess(res, property, 'Property created', 201)
}

export async function listMyProperties(req: Request, res: Response) {
  const query = validatedQuery<OwnerPropertyListQuery>(res)
  const result = await propertiesService.listOwnedProperties(req.user!.id, query)
  return sendSuccess(res, { items: result.items }, 'Properties retrieved', 200, result.meta)
}

export async function getMyProperty(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const property = await propertiesService.getOwnedProperty(req.user!.id, id)
  return sendSuccess(res, property, 'Property retrieved')
}

export async function getPublicProperty(req: Request, res: Response) {
  const { slug } = validatedParams<{ slug: string }>(res)
  const property = await propertiesService.getPublicProperty(slug, req.user?.id)
  return sendSuccess(res, property, 'Property retrieved')
}

export async function updateProperty(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const property = await propertiesService.updateProperty(req.user!.id, id, req.body, req)
  return sendSuccess(res, property, 'Property updated')
}

export async function deleteProperty(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const result = await propertiesService.deleteProperty(req.user!.id, id, req)
  return sendSuccess(res, result, 'Property deleted')
}

export async function publishProperty(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const property = await propertiesService.setPublication(req.user!.id, id, 'publish', req)
  return sendSuccess(res, property, 'Property published')
}

export async function unpublishProperty(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const property = await propertiesService.setPublication(req.user!.id, id, 'unpublish', req)
  return sendSuccess(res, property, 'Property unpublished')
}

export async function submitVerification(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const result = await propertiesService.submitPropertyVerification(req.user!.id, id, req)
  return sendSuccess(res, result, 'Property submitted for verification')
}

export async function addPropertyImages(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const images = await propertiesService.addPropertyImages(
    req.user!.id,
    id,
    uploadedFiles(req),
    req,
  )
  return sendSuccess(res, images, 'Property images uploaded', 201)
}

export async function deletePropertyImage(req: Request, res: Response) {
  const params = validatedParams<{ id: string; imageId: string }>(res)
  const result = await propertiesService.deletePropertyImage(
    req.user!.id,
    params.id,
    params.imageId,
    req,
  )
  return sendSuccess(res, result, 'Property image deleted')
}

export async function createRoom(req: Request, res: Response) {
  const { id } = validatedParams<{ id: string }>(res)
  const room = await roomsService.createRoom(req.user!.id, id, req.body, req)
  return sendSuccess(res, room, 'Room created', 201)
}

export async function updateRoom(req: Request, res: Response) {
  const params = validatedParams<{ propertyId: string; roomId: string }>(res)
  const room = await roomsService.updateRoom(
    req.user!.id,
    params.propertyId,
    params.roomId,
    req.body,
    req,
  )
  return sendSuccess(res, room, 'Room updated')
}

export async function updateRoomAvailability(req: Request, res: Response) {
  const params = validatedParams<{ propertyId: string; roomId: string }>(res)
  const room = await roomsService.updateRoomAvailability(
    req.user!.id,
    params.propertyId,
    params.roomId,
    req.body,
    req,
  )
  return sendSuccess(res, room, 'Room availability updated')
}

export async function deleteRoom(req: Request, res: Response) {
  const params = validatedParams<{ propertyId: string; roomId: string }>(res)
  const result = await roomsService.deleteRoom(req.user!.id, params.propertyId, params.roomId, req)
  return sendSuccess(res, result, 'Room deleted')
}

export async function addRoomImages(req: Request, res: Response) {
  const params = validatedParams<{ propertyId: string; roomId: string }>(res)
  const images = await roomsService.addRoomImages(
    req.user!.id,
    params.propertyId,
    params.roomId,
    uploadedFiles(req),
    req,
  )
  return sendSuccess(res, images, 'Room images uploaded', 201)
}

export async function deleteRoomImage(req: Request, res: Response) {
  const params = validatedParams<{ propertyId: string; roomId: string; imageId: string }>(res)
  const result = await roomsService.deleteRoomImage(
    req.user!.id,
    params.propertyId,
    params.roomId,
    params.imageId,
    req,
  )
  return sendSuccess(res, result, 'Room image deleted')
}
