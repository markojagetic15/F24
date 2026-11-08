import type { File } from '../entities/file.entity.js';
import type { Page, PageRequest } from '../pagination.js';

export type FileSearchScope = 'all' | { parentId: string | null };

export interface FileRepository {
  create(name: string, parentId: string | null): Promise<File>;
  delete(id: string): Promise<void>;
  list(parentId: string | null, page: PageRequest): Promise<Page<File>>;
  search(
    scope: FileSearchScope,
    name: string,
    page: PageRequest,
  ): Promise<Page<File>>;
  findByName(name: string): Promise<File[]>;
}
