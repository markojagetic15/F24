import { File } from '../../domain/entities/file.entity.js';

export interface FileRecord {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
}

export const toFile = (record: FileRecord): File =>
  new File(record.id, record.name, record.parentId, record.createdAt);
