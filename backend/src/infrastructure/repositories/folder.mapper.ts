import { Folder } from '../../domain/entities/folder.entity.js';

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
}

export const toFolder = (record: FolderRecord): Folder =>
  new Folder(record.id, record.name, record.parentId, record.createdAt);
