import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env'

export const storageRoot = path.resolve(process.cwd(), env.LOCAL_STORAGE_ROOT)
export const publicRoot = path.join(storageRoot, 'public')
export const privateRoot = path.join(storageRoot, 'private')

export function ensureStorageDirectories(): void {
  fs.mkdirSync(publicRoot, { recursive: true })
  fs.mkdirSync(privateRoot, { recursive: true })
}

export function publicUrlFor(storagePath: string): string {
  return `${env.PUBLIC_UPLOAD_BASE_URL.replace(/\/$/, '')}/${storagePath.replace(/^\/+/, '')}`
}

export function resolveStoragePath(storagePath: string): string | null {
  const normalised = storagePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalised.includes('..')) return null
  const absolute = path.resolve(storageRoot, normalised)
  if (!absolute.startsWith(storageRoot)) return null
  return absolute
}

export function removeStorageFile(storagePath: string | null | undefined): void {
  if (!storagePath) return
  const absolute = resolveStoragePath(storagePath)
  if (!absolute) return
  fs.promises.unlink(absolute).catch(() => undefined)
}

export function fileExists(storagePath: string): boolean {
  const absolute = resolveStoragePath(storagePath)
  return Boolean(absolute && fs.existsSync(absolute))
}
