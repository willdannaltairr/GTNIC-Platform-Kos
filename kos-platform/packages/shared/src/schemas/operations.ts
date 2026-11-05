import { z } from 'zod'
import { dateStringSchema, paginationSchema, uuidSchema } from './common'

export const maintenanceCreateSchema = z.object({
  roomId: uuidSchema,
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(3000),
  category: z.enum(['PLUMBING', 'ELECTRICAL', 'FURNITURE', 'CLEANING', 'INTERNET', 'SECURITY', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})
export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>

export const maintenanceUpdateStatusSchema = z.object({
  status: z.enum(['OPEN', 'REVIEWING', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'REJECTED', 'CLOSED']),
  notes: z.string().trim().max(2000).optional(),
})
export type MaintenanceUpdateStatusInput = z.infer<typeof maintenanceUpdateStatusSchema>

export const maintenanceListQuerySchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'REVIEWING', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'REJECTED', 'CLOSED']).optional(),
})

export const conditionChecklistSchema = z.object({
  itemName: z.string().trim().min(1).max(100),
  conditionStatus: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'NOT_APPLICABLE']),
  notes: z.string().trim().max(500).optional(),
})

export const createConditionReportSchema = z.object({
  contractId: uuidSchema,
  reportType: z.enum(['CHECK_IN', 'PERIODIC_INSPECTION', 'CHECK_OUT']),
  reportDate: dateStringSchema,
  generalCondition: z.enum(['GOOD', 'FAIR', 'DAMAGED', 'NOT_APPLICABLE']),
  notes: z.string().trim().max(3000).optional(),
  checklist: z.array(conditionChecklistSchema).max(50).default([]),
})
export type CreateConditionReportInput = z.infer<typeof createConditionReportSchema>

export const acknowledgeConditionReportSchema = z.object({
  acknowledgementType: z.enum(['APPROVED', 'DISPUTED']),
  notes: z.string().trim().max(1000).optional(),
})

export const createVisitSchema = z.object({
  propertyId: uuidSchema,
  roomId: uuidSchema.optional(),
  scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  notes: z.string().trim().max(2000).optional(),
  checklist: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
})
export type CreateVisitInput = z.infer<typeof createVisitSchema>

export const updateVisitSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  checklist: z
    .array(
      z.object({
        id: uuidSchema.optional(),
        checklistItem: z.string().trim().min(1).max(160),
        isChecked: z.boolean().default(false),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .max(60)
    .optional(),
})

export const visitNoteSchema = z.object({
  category: z.string().trim().min(1).max(80),
  content: z.string().trim().min(1).max(2000),
})

export const createReportSchema = z.object({
  targetType: z.enum(['USER', 'PROPERTY', 'BOOKING', 'PAYMENT', 'OTHER']),
  targetId: uuidSchema.optional(),
  category: z.enum([
    'INCORRECT_INFORMATION',
    'PRICE_TRANSPARENCY',
    'UNAVAILABLE_PROPERTY',
    'FRAUD_SUSPICION',
    'INAPPROPRIATE_BEHAVIOR',
    'PAYMENT_ISSUE',
    'SERVICE_ISSUE',
    'OTHER',
  ]),
  description: z.string().trim().min(20).max(3000),
})

export const reportListQuerySchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED']).optional(),
})
