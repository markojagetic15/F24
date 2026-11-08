import type { Entry } from '../../../shared/api'

export type FileEntry = Entry

export interface FileSearch {
  name: string
  parentId?: string
}
