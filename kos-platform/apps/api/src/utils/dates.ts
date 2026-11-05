export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export function daysBetween(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
}

export function monthsBetweenCeil(start: Date, end: Date): number {
  const days = daysBetween(start, end)
  return Math.max(1, Math.ceil(days / 30))
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now()
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function startOfUtcDay(date = new Date()): Date {
  const value = new Date(date)
  value.setUTCHours(0, 0, 0, 0)
  return value
}
