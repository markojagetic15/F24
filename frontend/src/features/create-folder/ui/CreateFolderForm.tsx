import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFolder, folderKeys } from '../../../entities/folder'
import { CreateForm } from '../../../shared/ui'

interface CreateFolderFormProps {
  parentId: string | null
}

export function CreateFolderForm({ parentId }: CreateFolderFormProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (name: string) => createFolder(name, parentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: folderKeys.all }),
  })

  return (
    <CreateForm
      label="Folder"
      pending={mutation.isPending}
      error={mutation.error}
      onCreate={(name, onCreated) =>
        mutation.mutate(name, { onSuccess: onCreated })
      }
    />
  )
}
