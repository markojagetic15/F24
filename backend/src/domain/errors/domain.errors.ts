export type EntryKind = 'Folder' | 'File';

export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntryNotFoundError extends DomainError {
  constructor(kind: EntryKind, id: string) {
    super(`${kind} '${id}' was not found.`);
  }
}

export class EntryNameConflictError extends DomainError {
  constructor(kind: EntryKind, name: string) {
    super(
      `A ${kind.toLowerCase()} named '${name}' already exists in this location.`,
    );
  }
}
