import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
} from '@tanstack/react-query'
import { FIRST_PAGE, itemsOf, nextPageOf } from '../../../shared/api'
import { getFolder, listFolders } from './folderApi'

export const folderKeys = {
  all: ['folders'] as const,
}

export const folderQueries = {
  detail: (id: string | null) =>
    queryOptions({
      queryKey: [...folderKeys.all, 'detail', id],
      queryFn:
        id === null ? skipToken : ({ signal }) => getFolder(id, signal),
    }),
  children: (parentId: string | null) =>
    infiniteQueryOptions({
      queryKey: [...folderKeys.all, 'children', parentId],
      queryFn: ({ pageParam, signal }) =>
        listFolders(parentId, pageParam, signal),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextPageOf,
      select: itemsOf,
    }),
}
