// TRADE-OFF MADE HERE - pagination uses a cursor instead of an offset.
// offset makes the database read and discard every skipped row (slower!)
// and rows shift when others are inserted or deleted, so pages can skip or repeat them.
// A cursor starts directly from its position in the index
export interface PageRequest {
  limit: number;
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export function toPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (item: T) => string,
): Page<T> {
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: rows.length > limit ? cursorOf(items[items.length - 1]) : null,
  };
}
