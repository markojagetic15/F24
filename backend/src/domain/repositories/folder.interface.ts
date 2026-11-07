import type { Folder } from '../entities/folder.entity.js';
import type { Page, PageRequest } from '../pagination.js';

export interface FolderRepository {
  create(name: string, parentId: string | null): Promise<Folder>;
  exists(id: string): Promise<boolean>;
  listChildren(
    parentId: string | null,
    page: PageRequest,
  ): Promise<Page<Folder>>;
  findById(id: string): Promise<Folder | null>;
  delete(id: string): Promise<void>;
}
