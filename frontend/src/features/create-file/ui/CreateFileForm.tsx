import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFile, fileKeys } from '../../../entities/file'
import { CreateForm } from '../../../shared/ui'

interface CreateFileFormProps {
  parentId: string | null
}

export function CreateFileForm({ parentId }: CreateFileFormProps) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (name: string) => createFile(name, parentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fileKeys.all }),
  })

  return (
    <CreateForm
      label="File"
      pending={mutation.isPending}
      error={mutation.error}
      onCreate={(name, onCreated) =>
        mutation.mutate(name, { onSuccess: onCreated })
      }
    />
  )
}
