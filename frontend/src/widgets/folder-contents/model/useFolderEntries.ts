import { useInfiniteQuery } from '@tanstack/react-query'
import { type FileEntry, fileQueries } from '../../../entities/file'
import { type Folder, folderQueries } from '../../../entities/folder'

export type FolderEntry =
  | { kind: 'folder'; id: string; folder: Folder }
  | { kind: 'file'; id: string; file: FileEntry }

// Folders come first, like in Windows Explorer. Files only start loading once
// every folder is in, so "Load more" never puts a folder after a file
export function useFolderEntries(folderId: string | null) {
  const folders = useInfiniteQuery(folderQueries.children(folderId))
  const allFoldersLoaded = folders.isSuccess && !folders.hasNextPage
  const files = useInfiniteQuery({
    ...fileQueries.list(folderId),
    enabled: allFoldersLoaded,
  })

  const items: FolderEntry[] = [
    ...(folders.data ?? []).map((folder) => ({
      kind: 'folder' as const,
      id: folder.id,
      folder,
    })),
    ...(allFoldersLoaded ? (files.data ?? []) : []).map((file) => ({
      kind: 'file' as const,
      id: file.id,
      file,
    })),
  ]

  return {
    items,
    error: folders.error ?? files.error,
    loading:
      folders.isPending ||
      files.isLoading ||
      folders.isFetchingNextPage ||
      files.isFetchingNextPage,
    hasMore: folders.hasNextPage || files.hasNextPage,
    loadMore: () =>
      void (folders.hasNextPage
        ? folders.fetchNextPage()
        : files.fetchNextPage()),
  }
}
