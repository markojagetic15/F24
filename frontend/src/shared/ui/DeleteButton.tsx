import { messageOf } from '../api'

interface DeleteButtonProps {
  label: string
  question: string
  pending: boolean
  error: unknown
  onConfirm: () => void
}

export function DeleteButton({
  label,
  question,
  pending,
  error,
  onConfirm,
}: DeleteButtonProps) {
  return (
    <>
      <button
        type="button"
        className="delete-button"
        aria-label={label}
        disabled={pending}
        onClick={() => {
          if (window.confirm(question)) onConfirm()
        }}
      >
        Delete
      </button>
      {error ? <span role="alert"> {messageOf(error)}</span> : null}
    </>
  )
}
