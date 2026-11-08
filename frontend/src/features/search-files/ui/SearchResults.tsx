import { useInfiniteQuery } from '@tanstack/react-query'
import {
  FileRow,
  fileQueries,
  type FileSearch,
} from '../../../entities/file'
import { EntryList } from '../../../shared/ui'

interface SearchResultsProps {
  search: FileSearch
  onClear: () => void
  onOpenFolder: (id: string | null) => void
}

export function SearchResults({
  search,
  onClear,
  onOpenFolder,
}: SearchResultsProps) {
  const results = useInfiniteQuery(fileQueries.search(search))

  return (
    <>
      <button type="button" onClick={onClear}>
        Clear search
      </button>
      <EntryList
        title={`Exact matches for "${search.name}"`}
        items={results.data ?? []}
        error={results.error}
        loading={results.isPending || results.isFetchingNextPage}
        hasMore={results.hasNextPage}
        onLoadMore={() => void results.fetchNextPage()}
        emptyText={`No file is named exactly "${search.name}". Pick a suggestion or type the full name.`}
        renderEntry={(file) => (
          <FileRow
            file={file}
            actions={
              <button type="button" onClick={() => onOpenFolder(file.parentId)}>
                Open location
              </button>
            }
          />
        )}
      />
    </>
  )
}
