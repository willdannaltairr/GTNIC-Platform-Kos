type StorageVisibility = 'public' | 'private'
type PutBody = string | Buffer | Uint8Array
interface PutOptions {
  contentType?: string
  encoding?: 'utf-8' | 'base64'
  visibility?: StorageVisibility
}
interface FolderOptions {
  visibility?: StorageVisibility
}
interface PutResult {
  key: string
  url: string | null
  size: number
  visibility: StorageVisibility
  staleKept: boolean
}
interface StorageObject {
  key: string
  name: string
  size: number
  url: string | null
  visibility: StorageVisibility
}
interface StorageFolder {
  name: string
  visibility: StorageVisibility
  mixed: boolean
}
interface ListResult {
  folders: Array<string>
  folderDetails: Array<StorageFolder>
  files: Array<StorageObject>
  nextToken: string | null
  rootVisibility: StorageVisibility
}
interface GetResult {
  key: string
  contentType: string
  encoding: 'base64'
  body: string
  size: number
  visibility: StorageVisibility
}
interface DeleteResult {
  deleted: number
  missing: number
}
interface DeleteFailure {
  deleted: number
  missing: number
}
