import { z } from 'zod'
import { dateStringSchema, paginationSchema, uuidSchema } from './common'

export const createBookingSchema = z
  .object({
    roomId: uuidSchema,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    tenantNotes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    message: 'Check-out date must be after check-in date',
    path: ['endDate'],
  })
export type CreateBookingInput = z.infer<typeof createBookingSchema>

export const bookingDecisionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
  ownerNotes: z.string().trim().max(1000).optional(),
})

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
})

export const bookingListQuerySchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'APPROVED', 'REJECTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED'])
    .optional(),
})

export const createContractSchema = z.object({
  bookingId: uuidSchema,
  terms: z.string().trim().min(30).max(10000).optional(),
  depositAmount: z.coerce.number().min(0).max(1_000_000_000).optional(),
})
export type CreateContractInput = z.infer<typeof createContractSchema>

export const contractListQuerySchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED']).optional(),
})

export const terminateContractSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
})

export const invoiceItemInputSchema = z.object({
  description: z.string().trim().min(2).max(200),
  quantity: z.coerce.number().min(0.01).max(1000).default(1),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000),
  costType: z.enum(['RENT', 'DEPOSIT', 'UTILITY', 'SERVICE', 'PENALTY', 'OTHER']).default('RENT'),
})

export const createInvoiceSchema = z
  .object({
    contractId: uuidSchema.optional(),
    bookingId: uuidSchema.optional(),
    billingPeriodStart: dateStringSchema,
    billingPeriodEnd: dateStringSchema,
    issueDate: dateStringSchema,
    dueDate: dateStringSchema,
    items: z.array(invoiceItemInputSchema).min(1).max(30),
    discountAmount: z.coerce.number().min(0).max(1_000_000_000).default(0),
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.contractId || value.bookingId, {
    message: 'contractId or bookingId is required',
    path: ['contractId'],
  })
  .refine((value) => new Date(value.dueDate) >= new Date(value.issueDate), {
    message: 'Due date cannot be before issue date',
    path: ['dueDate'],
  })
  .refine((value) => new Date(value.billingPeriodEnd) >= new Date(value.billingPeriodStart), {
    message: 'Billing period end cannot be before start',
    path: ['billingPeriodEnd'],
  })
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export const createPaymentSchema = z.object({
  invoiceId: uuidSchema,
  method: z.string().trim().max(80).optional(),
})
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export const paymentListQuerySchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
})

export const simulatePaymentSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILED', 'EXPIRED']).default('SUCCESS'),
})

export const invoiceListQuerySchema = paginationSchema.extend({
  status: z.enum(['DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
})
