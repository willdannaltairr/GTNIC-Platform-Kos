export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value)
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber()
  }
  return Number(value)
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  return toNumber(value)
}

export function iso(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function dateOnly(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

export function plain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item && typeof item === 'object' && 'toNumber' in item) {
        return item.toNumber()
      }
      return item
    }),
  ) as T
}
