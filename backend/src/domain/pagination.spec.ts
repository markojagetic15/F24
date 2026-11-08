import { toPage } from './pagination.js';

describe('toPage', () => {
  const cursorOf = (item: string) => `cursor-${item}`;

  it('returns no next cursor when the rows fit in the limit', () => {
    expect(toPage(['a'], 2, cursorOf)).toEqual({
      items: ['a'],
      nextCursor: null,
    });
  });

  it('returns no next cursor when the rows exactly fill the limit', () => {
    expect(toPage(['a', 'b'], 2, cursorOf)).toEqual({
      items: ['a', 'b'],
      nextCursor: null,
    });
  });

  it('drops the extra row and points at the last returned item', () => {
    expect(toPage(['a', 'b', 'c'], 2, cursorOf)).toEqual({
      items: ['a', 'b'],
      nextCursor: 'cursor-b',
    });
  });

  it('returns an empty page for no rows', () => {
    expect(toPage([], 2, cursorOf)).toEqual({ items: [], nextCursor: null });
  });
});
