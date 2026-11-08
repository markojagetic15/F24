import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteFile, type FileEntry, fileKeys } from '../../../entities/file'
import { DeleteButton } from '../../../shared/ui'

interface DeleteFileButtonProps {
  file: FileEntry
}

export function DeleteFileButton({ file }: DeleteFileButtonProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteFile(file.id),
    // Settled, so a file someone else already deleted leaves the list too
    onSettled: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
  })

  return (
    <DeleteButton
      label={`Delete file ${file.name}`}
      question={`Delete file "${file.name}"?`}
      pending={mutation.isPending}
      error={mutation.error}
      onConfirm={() => mutation.mutate()}
    />
  )
}
