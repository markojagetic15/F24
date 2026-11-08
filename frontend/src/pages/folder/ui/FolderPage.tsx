import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { FileSearch } from '../../../entities/file'
import { folderQueries } from '../../../entities/folder'
import { SearchBox, SearchResults } from '../../../features/search-files'
import { messageOf } from '../../../shared/api'
import { FolderContents } from '../../../widgets/folder-contents'

interface FolderPageProps {
  folderId: string | null
  onOpenFolder: (id: string | null) => void
}

export function FolderPage({ folderId, onOpenFolder }: FolderPageProps) {
  const { data: folder, error } = useQuery(folderQueries.detail(folderId))
  const [search, setSearch] = useState<FileSearch | null>(null)

  if (error) {
    return (
      <main className="page">
        <p role="alert">{messageOf(error)}</p>
        <button type="button" onClick={() => onOpenFolder(null)}>
          Go to root
        </button>
      </main>
    )
  }

  const ready = folderId === null || folder !== undefined

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="topbar__home"
          onClick={() => onOpenFolder(null)}
        >
          File Browser
        </button>
        <SearchBox folderId={folderId} onSearch={setSearch} />
      </header>
      <main className="page">
        <div className="page__title">
          {folder && (
            <button type="button" onClick={() => onOpenFolder(folder.parentId)}>
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          <h1>{folderId === null ? 'Root' : (folder?.name ?? 'Loading…')}</h1>
        </div>
        {search && (
          <SearchResults
            search={search}
            onClear={() => setSearch(null)}
            onOpenFolder={(id) => {
              setSearch(null)
              onOpenFolder(id)
            }}
          />
        )}
        {!search && ready && (
          <FolderContents folderId={folderId} onOpenFolder={onOpenFolder} />
        )}
      </main>
    </>
  )
}
