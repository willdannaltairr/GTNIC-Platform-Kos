import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import multer from 'multer'
import { env } from '../config/env'
import { BadRequestError } from '../utils/errors'
import { ensureStorageDirectories, storageRoot } from '../utils/storage'

ensureStorageDirectories()

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, 'application/pdf'])

interface UploaderOptions {
  scope: 'public' | 'private'
  subdir: string
  maxFiles: number
  documents?: boolean
}

function createUploader({ scope, subdir, maxFiles, documents = false }: UploaderOptions) {
  const destination = path.join(storageRoot, scope, subdir)
  fs.mkdirSync(destination, { recursive: true })

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, destination),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')
      callback(null, `${Date.now()}-${randomUUID()}${extension}`)
    },
  })

  return multer({
    storage,
    limits: {
      fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
      files: maxFiles,
    },
    fileFilter: (_req, file, callback) => {
      const allowed = documents ? DOCUMENT_TYPES : IMAGE_TYPES
      if (!allowed.has(file.mimetype)) {
        callback(new BadRequestError(`Unsupported file type: ${file.mimetype}`, 'INVALID_FILE_TYPE'))
        return
      }
      callback(null, true)
    },
  })
}

export const uploadPropertyImages = createUploader({ scope: 'public', subdir: 'properties', maxFiles: 6 }).array('images', 6)
export const uploadRoomImages = createUploader({ scope: 'public', subdir: 'rooms', maxFiles: 6 }).array('images', 6)
export const uploadAvatar = createUploader({ scope: 'public', subdir: 'avatars', maxFiles: 1 }).single('avatar')
export const uploadMaintenanceImages = createUploader({ scope: 'private', subdir: 'maintenance', maxFiles: 5 }).array('images', 5)
export const uploadConditionImages = createUploader({ scope: 'private', subdir: 'room-condition', maxFiles: 8 }).array('images', 8)
export const uploadVisitImages = createUploader({ scope: 'private', subdir: 'visits', maxFiles: 5 }).array('images', 5)
export const uploadVerificationDocuments = createUploader({ scope: 'private', subdir: 'verification', maxFiles: 3, documents: true }).array('documents', 3)
export const uploadContractDocuments = createUploader({ scope: 'private', subdir: 'contracts', maxFiles: 3, documents: true }).array('documents', 3)
export const uploadExpenseReceipt = createUploader({ scope: 'private', subdir: 'expenses', maxFiles: 1, documents: true }).single('receipt')

function readHeader(filePath: string): Buffer {
  const file = fs.openSync(filePath, 'r')
  const buffer = Buffer.alloc(12)
  fs.readSync(file, buffer, 0, 12, 0)
  fs.closeSync(file)
  return buffer
}

function matchesSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (mimeType === 'application/pdf') return buffer.subarray(0, 4).toString('ascii') === '%PDF'
  return false
}

export const verifyUploadSignatures: RequestHandler = (req, _res, next) => {
  const files: Express.Multer.File[] = []
  if (req.file) files.push(req.file)
  if (Array.isArray(req.files)) files.push(...req.files)
  if (req.files && !Array.isArray(req.files)) {
    for (const group of Object.values(req.files)) files.push(...group)
  }

  for (const file of files) {
    try {
      if (!matchesSignature(readHeader(file.path), file.mimetype)) {
        fs.unlinkSync(file.path)
        next(new BadRequestError('Uploaded file content does not match its declared type', 'INVALID_FILE_CONTENT'))
        return
      }
    } catch {
      next(new BadRequestError('Uploaded file could not be read', 'INVALID_FILE'))
      return
    }
  }
  next()
}

export function relativeStoragePath(file: Express.Multer.File): string {
  return path.relative(storageRoot, file.path).replace(/\\/g, '/')
}

export function relativeStoragePaths(files: Express.Multer.File[] | undefined): string[] {
  return (files ?? []).map(relativeStoragePath)
}
