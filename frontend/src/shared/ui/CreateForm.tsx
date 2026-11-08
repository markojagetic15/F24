import { type FormEvent, useState } from 'react'
import { messageOf } from '../api'

interface CreateFormProps {
  label: string
  pending: boolean
  error: unknown
  onCreate: (name: string, onCreated: () => void) => void
}

export function CreateForm({
  label,
  pending,
  error,
  onCreate,
}: CreateFormProps) {
  const [name, setName] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onCreate(name, () => setName(''))
  }

  return (
    <form className="create-form" onSubmit={submit}>
      <input
        aria-label={`${label} name`}
        placeholder={`${label} name`}
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" disabled={pending}>
        Create {label.toLowerCase()}
      </button>
      {error ? <p role="alert">{messageOf(error)}</p> : null}
    </form>
  )
}
