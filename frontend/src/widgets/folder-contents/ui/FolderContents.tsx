import { FileRow } from '../../../entities/file'
import { FolderRow } from '../../../entities/folder'
import { CreateFileForm } from '../../../features/create-file'
import { CreateFolderForm } from '../../../features/create-folder'
import { DeleteFileButton } from '../../../features/delete-file'
import { DeleteFolderButton } from '../../../features/delete-folder'
import { EntryList } from '../../../shared/ui'
import { useFolderEntries } from '../model/useFolderEntries'

interface FolderContentsProps {
  folderId: string | null
  onOpenFolder: (id: string) => void
}

export function FolderContents({
  folderId,
  onOpenFolder,
}: FolderContentsProps) {
  const entries = useFolderEntries(folderId)

  return (
    <>
      <div className="toolbar">
        <CreateFolderForm parentId={folderId} />
        <CreateFileForm parentId={folderId} />
      </div>
      <EntryList
        items={entries.items}
        error={entries.error}
        loading={entries.loading}
        hasMore={entries.hasMore}
        onLoadMore={entries.loadMore}
        emptyText="This folder is empty."
        renderEntry={(entry) =>
          entry.kind === 'folder' ? (
            <FolderRow
              folder={entry.folder}
              onOpen={onOpenFolder}
              actions={<DeleteFolderButton folder={entry.folder} />}
            />
          ) : (
            <FileRow
              file={entry.file}
              actions={<DeleteFileButton file={entry.file} />}
            />
          )
        }
      />
    </>
  )
}
