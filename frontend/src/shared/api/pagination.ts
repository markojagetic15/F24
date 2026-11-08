import type { InfiniteData } from '@tanstack/react-query'
import type { Page } from './types'

export const FIRST_PAGE = undefined as string | undefined

export const nextPageOf = <T>(page: Page<T>) => page.nextCursor ?? undefined

export const itemsOf = <T>(data: InfiniteData<Page<T>>) =>
  data.pages.flatMap((page) => page.items)
