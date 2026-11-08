import { useSyncExternalStore } from 'react'

const FOLDER_PARAM = 'folder'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

const readFolderId = () =>
  new URLSearchParams(window.location.search).get(FOLDER_PARAM)

function openFolder(id: string | null): void {
  if (id === readFolderId()) return
  const search = id === null ? '' : `?${FOLDER_PARAM}=${id}`
  window.history.pushState(null, '', `${window.location.pathname}${search}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// The current folder lives in the URL, so links and the browser buttons work
export function useCurrentFolder() {
  const folderId = useSyncExternalStore(subscribe, readFolderId)
  return { folderId, openFolder }
}
