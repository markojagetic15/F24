import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FolderPage } from '../pages/folder'
import './styles.css'
import { useCurrentFolder } from './useCurrentFolder'

const queryClient = new QueryClient({
  // Most failures here are answers such as 400 and 404, which a retry cannot change
  defaultOptions: { queries: { retry: false } },
})

export function App() {
  const { folderId, openFolder } = useCurrentFolder()

  return (
    <QueryClientProvider client={queryClient}>
      {/* The key gives every folder fresh forms and search state */}
      <FolderPage
        key={folderId ?? 'root'}
        folderId={folderId}
        onOpenFolder={openFolder}
      />
    </QueryClientProvider>
  )
}
