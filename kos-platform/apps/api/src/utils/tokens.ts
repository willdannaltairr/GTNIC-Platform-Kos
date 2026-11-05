import { createHash, randomBytes, randomInt } from 'node:crypto'

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function randomSuffix(length = 5): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let index = 0; index < length; index += 1) {
    result += alphabet[randomInt(0, alphabet.length)]
  }
  return result
}

const stamp = (date = new Date()) =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`

export const identifiers = {
  booking: () => `NST-BK-${stamp()}-${randomSuffix(5)}`,
  contract: () => `NST-CTR-${stamp()}-${randomSuffix(5)}`,
  invoice: () => `NST-INV-${stamp()}-${randomSuffix(5)}`,
  payment: () => `NST-PAY-${stamp()}-${randomSuffix(5)}`,
  order: () => `NST-ORD-${Date.now()}-${randomSuffix(4)}`,
}
