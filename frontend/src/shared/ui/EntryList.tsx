import type { ReactNode } from 'react'
import { messageOf } from '../api'

interface EntryListProps<T> {
  title?: string
  items: T[]
  error: unknown
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  emptyText: string
  renderEntry: (entry: T) => ReactNode
}

export function EntryList<T extends { id: string }>({
  title,
  items,
  error,
  loading,
  hasMore,
  onLoadMore,
  emptyText,
  renderEntry,
}: EntryListProps<T>) {
  return (
    <section className="entries">
      {title && <h2>{title}</h2>}
      {error ? <p role="alert">{messageOf(error)}</p> : null}
      <div className="row row--head">
        <span className="row__name">Name</span>
        <span className="row__date">Date created</span>
        <span className="row__type">Type</span>
        <span className="row__actions" />
      </div>
      {!loading && !error && items.length === 0 && (
        <p className="entries__note">{emptyText}</p>
      )}
      <ul>
        {items.map((entry) => (
          <li key={entry.id}>{renderEntry(entry)}</li>
        ))}
      </ul>
      {loading && <p className="entries__note">Loading…</p>}
      {hasMore && !loading && (
        <button type="button" className="entries__more" onClick={onLoadMore}>
          Load more
        </button>
      )}
    </section>
  )
}
