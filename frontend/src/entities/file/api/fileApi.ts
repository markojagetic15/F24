import {
  deleteResource,
  getJson,
  type Page,
  postJson,
  urlFor,
} from '../../../shared/api'
import type { FileEntry, FileSearch } from '../model/types'

export const listFiles = (
  parentId: string | null,
  cursor?: string,
  signal?: AbortSignal,
) =>
  getJson<Page<FileEntry>>(
    urlFor('/files', { parentId: parentId ?? undefined, cursor }),
    signal,
  )

export const searchFiles = (
  { name, parentId }: FileSearch,
  cursor?: string,
  signal?: AbortSignal,
) =>
  getJson<Page<FileEntry>>(
    urlFor('/files/search', { name, parentId, cursor }),
    signal,
  )

export const topFiles = (
  prefix: string,
  parentId?: string,
  signal?: AbortSignal,
) => getJson<FileEntry[]>(urlFor('/files/top', { prefix, parentId }), signal)

export const createFile = (name: string, parentId: string | null) =>
  postJson(urlFor('/files'), { name, parentId })

export const deleteFile = (id: string) => deleteResource(urlFor(`/files/${id}`))
