import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { FIRST_PAGE, itemsOf, nextPageOf } from '../../../shared/api'
import type { FileSearch } from '../model/types'
import { listFiles, searchFiles, topFiles } from './fileApi'

export const fileKeys = {
  all: ['files'] as const,
}

export const fileQueries = {
  list: (parentId: string | null) =>
    infiniteQueryOptions({
      queryKey: [...fileKeys.all, 'list', parentId],
      queryFn: ({ pageParam, signal }) =>
        listFiles(parentId, pageParam, signal),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextPageOf,
      select: itemsOf,
    }),
  search: (search: FileSearch) =>
    infiniteQueryOptions({
      queryKey: [...fileKeys.all, 'search', search],
      queryFn: ({ pageParam, signal }) =>
        searchFiles(search, pageParam, signal),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextPageOf,
      select: itemsOf,
    }),
  top: (prefix: string, parentId?: string) =>
    queryOptions({
      queryKey: [...fileKeys.all, 'top', prefix, parentId],
      queryFn: ({ signal }) => topFiles(prefix, parentId, signal),
    }),
}
