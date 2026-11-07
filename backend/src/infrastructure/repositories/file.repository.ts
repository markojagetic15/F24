import { Injectable } from '@nestjs/common';
import type { File } from '../../domain/entities/file.entity.js';
import {
  EntryNameConflictError,
  EntryNotFoundError,
} from '../../domain/errors/domain.errors.js';
import {
  type Page,
  type PageRequest,
  toPage,
} from '../../domain/pagination.js';
import type { FileRepository } from '../../domain/repositories/file.interface.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from '../database/prisma-errors.js';
import { PrismaService } from '../database/prisma.service.js';
import { toFile } from './file.mapper.js';

@Injectable()
export class PostgresFileRepository implements FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, parentId: string | null): Promise<File> {
    try {
      return toFile(
        await this.prisma.file.create({ data: { name, parentId } }),
      );
    } catch (error) {
      if (isUniqueViolation(error))
        throw new EntryNameConflictError('File', name);
      if (isForeignKeyViolation(error) && parentId !== null) {
        throw new EntryNotFoundError('Folder', parentId);
      }
      throw error;
    }
  }

  async list(parentId: string | null, page: PageRequest): Promise<Page<File>> {
    const where = { parentId };

    const [records, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.file.count({ where }),
    ]);

    return toPage(records.map(toFile), page.limit, total);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.file.delete({ where: { id } });
    } catch (error) {
      if (isRecordNotFound(error)) throw new EntryNotFoundError('File', id);
      throw error;
    }
  }
}
