import { Injectable } from '@nestjs/common';
import type { Folder } from '../../domain/entities/folder.entity.js';
import {
  EntryNameConflictError,
  EntryNotFoundError,
} from '../../domain/errors/domain.errors.js';
import {
  type Page,
  type PageRequest,
  toPage,
} from '../../domain/pagination.js';
import type { FolderRepository } from '../../domain/repositories/folder.interface.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from '../database/prisma-errors.js';
import { PrismaService } from '../database/prisma.service.js';
import { toFolder } from './folder.mapper.js';

@Injectable()
export class PostgresFolderRepository implements FolderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, parentId: string | null): Promise<Folder> {
    try {
      return toFolder(
        await this.prisma.folder.create({ data: { name, parentId } }),
      );
    } catch (error) {
      if (isUniqueViolation(error))
        throw new EntryNameConflictError('Folder', name);
      if (isForeignKeyViolation(error) && parentId !== null) {
        throw new EntryNotFoundError('Folder', parentId);
      }
      throw error;
    }
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.prisma.folder.findUnique({
      where: { id },
      select: { id: true },
    });
    return record !== null;
  }

  async listChildren(
    parentId: string | null,
    page: PageRequest,
  ): Promise<Page<Folder>> {
    const [records, total] = await Promise.all([
      this.prisma.folder.findMany({
        where: { parentId },
        orderBy: { name: 'asc' },
        skip: page.offset,
        take: page.limit,
      }),
      this.prisma.folder.count({ where: { parentId } }),
    ]);

    return toPage(records.map(toFolder), page.limit, total);
  }

  async findById(id: string): Promise<Folder | null> {
    const record = await this.prisma.folder.findUnique({ where: { id } });
    return record === null ? null : toFolder(record);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.folder.delete({ where: { id } });
    } catch (error) {
      if (isRecordNotFound(error)) throw new EntryNotFoundError('Folder', id);
      throw error;
    }
  }
}
