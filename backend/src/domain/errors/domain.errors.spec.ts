import {
  DomainError,
  EntryNameConflictError,
  EntryNotFoundError,
} from './domain.errors.js';

describe('domain errors', () => {
  it.each(['Folder', 'File'] as const)(
    'describes a missing %s by id',
    (kind) => {
      expect(new EntryNotFoundError(kind, 'abc').message).toBe(
        `${kind} 'abc' was not found.`,
      );
    },
  );

  it.each([
    ['Folder', 'folder'],
    ['File', 'file'],
  ] as const)('describes a %s name conflict', (kind, lowerCaseKind) => {
    expect(new EntryNameConflictError(kind, 'a.txt').message).toBe(
      `A ${lowerCaseKind} named 'a.txt' already exists in this location.`,
    );
  });

  it('names each error after its concrete class', () => {
    expect(new EntryNotFoundError('File', 'a').name).toBe('EntryNotFoundError');
    expect(new EntryNameConflictError('File', 'a').name).toBe(
      'EntryNameConflictError',
    );
  });

  it('can be caught as a DomainError', () => {
    expect(new EntryNotFoundError('File', 'a')).toBeInstanceOf(DomainError);
    expect(new EntryNameConflictError('File', 'a')).toBeInstanceOf(DomainError);
  });
});
