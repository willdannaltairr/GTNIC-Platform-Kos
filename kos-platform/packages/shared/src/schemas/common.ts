import { z } from 'zod'
import { MAX_PAGE_SIZE } from '../constants'

export const uuidSchema = z.string().uuid('Must be a valid UUID')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
})

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Invalid calendar date')

export const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value))

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(255)

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+62|62|0)[0-9]{8,13}$/, 'Enter an Indonesian phone number')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number')

export const stringArrayQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(',')).filter(Boolean)
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}, z.array(z.string().trim().min(1)).optional())

export const booleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
}, z.boolean().optional())
