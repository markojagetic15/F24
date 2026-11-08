import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fileKeys } from '../../../entities/file'
import {
  deleteFolder,
  type Folder,
  folderKeys,
} from '../../../entities/folder'
import { DeleteButton } from '../../../shared/ui'

interface DeleteFolderButtonProps {
  folder: Folder
}

export function DeleteFolderButton({ folder }: DeleteFolderButtonProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    // Settled, so a folder someone else already deleted leaves the list too.
    // Files are refreshed because deleting a folder deletes the files inside it
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: folderKeys.all }),
        queryClient.invalidateQueries({ queryKey: fileKeys.all }),
      ]),
  })

  return (
    <DeleteButton
      label={`Delete folder ${folder.name}`}
      question={`Delete folder "${folder.name}" and everything inside it?`}
      pending={mutation.isPending}
      error={mutation.error}
      onConfirm={() => mutation.mutate()}
    />
  )
}
