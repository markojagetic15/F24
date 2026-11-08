import type { ReactNode } from 'react'
import { formatDate } from '../../../shared/lib'
import { FolderIcon } from '../../../shared/ui'
import type { Folder } from '../model/types'

interface FolderRowProps {
  folder: Folder
  onOpen: (id: string) => void
  actions?: ReactNode
}

export function FolderRow({ folder, onOpen, actions }: FolderRowProps) {
  return (
    <div className="row">
      <FolderIcon />
      <button
        type="button"
        className="row__name"
        title={folder.name}
        onClick={() => onOpen(folder.id)}
      >
        {folder.name}
      </button>
      <time className="row__date" dateTime={folder.createdAt}>
        {formatDate(folder.createdAt)}
      </time>
      <span className="row__type">File folder</span>
      <span className="row__actions">{actions}</span>
    </div>
  )
}
