export interface Entry {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}
