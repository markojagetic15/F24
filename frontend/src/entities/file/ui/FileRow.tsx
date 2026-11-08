import type { ReactNode } from 'react'
import { formatDate } from '../../../shared/lib'
import { FileIcon } from '../../../shared/ui'
import type { FileEntry } from '../model/types'

interface FileRowProps {
  file: FileEntry
  actions?: ReactNode
}

function typeOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? `${name.slice(dot + 1).toUpperCase()} File` : 'File'
}

export function FileRow({ file, actions }: FileRowProps) {
  return (
    <div className="row">
      <FileIcon />
      <span className="row__name" title={file.name}>
        {file.name}
      </span>
      <time className="row__date" dateTime={file.createdAt}>
        {formatDate(file.createdAt)}
      </time>
      <span className="row__type">{typeOf(file.name)}</span>
      <span className="row__actions">{actions}</span>
    </div>
  )
}
