import {
  deleteResource,
  getJson,
  type Page,
  postJson,
  urlFor,
} from '../../../shared/api'
import type { Folder } from '../model/types'

export const getFolder = (id: string, signal?: AbortSignal) =>
  getJson<Folder>(urlFor(`/folders/${id}`), signal)

export const listFolders = (
  parentId: string | null,
  cursor?: string,
  signal?: AbortSignal,
) =>
  getJson<Page<Folder>>(
    urlFor('/folders', { parentId: parentId ?? undefined, cursor }),
    signal,
  )

export const createFolder = (name: string, parentId: string | null) =>
  postJson(urlFor('/folders'), { name, parentId })

export const deleteFolder = (id: string) =>
  deleteResource(urlFor(`/folders/${id}`))
