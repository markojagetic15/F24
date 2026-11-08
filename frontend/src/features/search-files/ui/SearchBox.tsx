import { type FormEvent, useRef, useState } from 'react'
import type { FileSearch } from '../../../entities/file'
import { FileIcon } from '../../../shared/ui'
import { useSuggestions } from '../model/useSuggestions'

type Scope = 'all' | 'folder'

interface SearchBoxProps {
  folderId: string | null
  onSearch: (search: FileSearch) => void
}

export function SearchBox({ folderId, onSearch }: SearchBoxProps) {
  const [text, setText] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [suggesting, setSuggesting] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const parentId = scope === 'all' ? undefined : (folderId ?? 'root')
  const suggestions = useSuggestions(suggesting ? text : '', parentId)

  const search = (name: string) => {
    setText(name)
    setSuggesting(false)
    onSearch({ name, parentId })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    search(text)
  }

  return (
    <form role="search" className="search" onSubmit={submit}>
      <input
        ref={input}
        aria-label="Search files"
        placeholder="Search files"
        required
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setSuggesting(true)
        }}
        onBlur={() => setSuggesting(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setSuggesting(false)
        }}
      />
      <select
        aria-label="Search in"
        value={scope}
        onChange={(event) => {
          setScope(event.target.value as Scope)
          // Opening this select blurred the input and closed the suggestions
          setSuggesting(true)
          input.current?.focus()
        }}
      >
        <option value="all">All files</option>
        <option value="folder">This folder</option>
      </select>
      <button type="submit">Find exact name</button>
      {suggestions.noMatches && (
        <p role="status" className="suggestions suggestions--empty">
          No search results for "{text}" in{' '}
          {scope === 'all' ? 'all files' : 'this folder'}
        </p>
      )}
      {suggestions.files.length > 0 && (
        // Keeps focus in the input, so its blur does not close the list mid-click
        <ul
          aria-label="Suggestions"
          className="suggestions"
          onMouseDown={(event) => event.preventDefault()}
        >
          {suggestions.files.map((file) => (
            <li key={file.id}>
              <button type="button" onClick={() => search(file.name)}>
                <FileIcon />
                {file.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
