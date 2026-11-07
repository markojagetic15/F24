export interface PageRequest {
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export function toPage<T>(rows: T[], limit: number, total: number): Page<T> {
  return {
    items: rows,
    total,
  };
}
