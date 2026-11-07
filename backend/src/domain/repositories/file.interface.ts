import type { File } from '../entities/file.entity.js';
import type { Page, PageRequest } from '../pagination.js';

export interface FileRepository {
  create(name: string, parentId: string | null): Promise<File>;
  delete(id: string): Promise<void>;
  list(parentId: string | null, page: PageRequest): Promise<Page<File>>;
}
