import type { Request, Response } from 'express'
import type { DestinationCategory } from '@prisma/client'
import type {
  CostSimulatorInput,
  KosMatchInput,
  PropertySearchInput,
  PropertyRoutesQuery,
} from '@nestari/shared'
import * as discoveryService from './discovery.service'
import { paginationMeta, sendSuccess } from '../../utils/http'
import { validatedParams, validatedQuery } from '../../middlewares/validate'

export async function searchProperties(req: Request, res: Response) {
  const query = validatedQuery<PropertySearchInput>(res)
  const result = await discoveryService.searchProperties(query, req.user?.id)
  return sendSuccess(
    res,
    { items: result.items, context: result.context },
    'Properties retrieved',
    200,
    paginationMeta(query.page, query.limit, result.total),
  )
}

export async function matchProperties(req: Request, res: Response) {
  const result = await discoveryService.matchProperties(req.body as KosMatchInput, req.user?.id)
  return sendSuccess(res, result, 'KosMatch recommendations generated')
}

export async function simulateCost(req: Request, res: Response) {
  const result = await discoveryService.simulateCost(
    req.body as CostSimulatorInput,
    req.user?.id,
  )
  return sendSuccess(res, result, 'TrueCost simulation generated')
}

export async function compareProperties(req: Request, res: Response) {
  const { ids } = validatedQuery<{ ids: string[] }>(res)
  const result = await discoveryService.compareProperties(ids)
  return sendSuccess(res, result, 'Properties compared')
}

export async function listDestinations(req: Request, res: Response) {
  const query = validatedQuery<{ q?: string; category?: DestinationCategory }>(res)
  const result = await discoveryService.listDestinations(query)
  return sendSuccess(res, result, 'Destinations retrieved')
}

export async function propertyTravelEstimate(req: Request, res: Response) {
  const { slug } = validatedParams<{ slug: string }>(res)
  const query = validatedQuery<PropertyRoutesQuery>(res)
  const result = await discoveryService.propertyTravelEstimate(slug, query)
  return sendSuccess(res, result, 'Distance estimate generated')
}

export async function listFavorites(req: Request, res: Response) {
  const items = await discoveryService.listFavorites(req.user!.id)
  return sendSuccess(res, { items }, 'Favorites retrieved')
}

export async function addFavorite(req: Request, res: Response) {
  const { propertyId } = validatedParams<{ propertyId: string }>(res)
  const result = await discoveryService.addFavorite(req.user!.id, propertyId)
  return sendSuccess(res, result, 'Property saved to favorites', 201)
}

export async function removeFavorite(req: Request, res: Response) {
  const { propertyId } = validatedParams<{ propertyId: string }>(res)
  const result = await discoveryService.removeFavorite(req.user!.id, propertyId)
  return sendSuccess(res, result, 'Property removed from favorites')
}
