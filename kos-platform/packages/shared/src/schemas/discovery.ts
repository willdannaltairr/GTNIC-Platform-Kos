import { z } from 'zod'
import { uuidSchema } from './common'

export const matchWeightsSchema = z
  .object({
    budget: z.coerce.number().min(0).max(1),
    location: z.coerce.number().min(0).max(1),
    facilities: z.coerce.number().min(0).max(1),
    room: z.coerce.number().min(0).max(1),
  })
  .partial()
  .optional()

export const kosMatchSchema = z
  .object({
    destinationId: uuidSchema.optional(),
    destinationLat: z.coerce.number().min(-90).max(90).optional(),
    destinationLng: z.coerce.number().min(-180).max(180).optional(),
    destinationLabel: z.string().trim().max(150).optional(),
    maximumBudget: z.coerce.number().min(0).max(1_000_000_000).optional(),
    maximumDistanceKm: z.coerce.number().min(0.1).max(100).optional(),
    roomType: z.enum(['SINGLE', 'DOUBLE', 'TWIN', 'STUDIO', 'SHARED']).optional(),
    bathroomType: z.enum(['INSIDE', 'OUTSIDE']).optional(),
    facilitySlugs: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    genderPolicy: z.enum(['MALE_ONLY', 'FEMALE_ONLY', 'MIXED']).optional(),
    city: z.string().trim().max(100).optional(),
    availableOnly: z.boolean().default(true),
    weights: matchWeightsSchema,
    limit: z.coerce.number().int().min(1).max(30).default(12),
    persist: z.boolean().default(false),
  })
  .refine(
    (value) =>
      value.destinationId ||
      (value.destinationLat !== undefined && value.destinationLng !== undefined),
    { message: 'Choose a destination or provide coordinates', path: ['destinationId'] },
  )
export type KosMatchInput = z.infer<typeof kosMatchSchema>

export const costSimulatorSchema = z
  .object({
    propertyId: uuidSchema.optional(),
    roomId: uuidSchema.optional(),
    durationMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(1),
    monthlyBudget: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
    upfrontBudget: z.coerce.number().min(0).max(1_000_000_000).nullable().optional(),
  })
  .refine((value) => value.propertyId || value.roomId, {
    message: 'propertyId or roomId is required',
    path: ['propertyId'],
  })
export type CostSimulatorInput = z.infer<typeof costSimulatorSchema>

export const comparePropertiesSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(4),
})

export const favoriteParamSchema = z.object({ propertyId: uuidSchema })
