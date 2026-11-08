import { useQuery } from '@tanstack/react-query'
import { fileQueries } from '../../../entities/file'
import type { FileEntry } from '../../../entities/file'
import { useDebouncedValue } from '../../../shared/lib'

const DEBOUNCE_MS = 200

interface Suggestions {
  files: FileEntry[]
  noMatches: boolean
}

export function useSuggestions(
  prefix: string,
  parentId?: string,
): Suggestions {
  const debounced = useDebouncedValue(prefix, DEBOUNCE_MS)
  // A half-typed invalid prefix fails with 400 and simply shows no suggestions
  const { data } = useQuery({
    ...fileQueries.top(debounced, parentId),
    enabled: debounced !== '',
  })
  // Undefined until the current text has loaded, so nothing flashes while typing
  const files = prefix === debounced ? data : undefined

  return { files: files ?? [], noMatches: files?.length === 0 }
}
