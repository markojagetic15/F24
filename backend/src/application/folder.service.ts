import { Inject, Injectable } from '@nestjs/common';
import type { Folder } from '../domain/entities/folder.entity.js';
import { EntryNotFoundError } from '../domain/errors/domain.errors.js';
import type { Page, PageRequest } from '../domain/pagination.js';
import { type FolderRepository } from '../domain/repositories/folder.interface.js';

@Injectable()
export class FolderService {
  constructor(
    @Inject('FOLDER_REPOSITORY') private readonly folders: FolderRepository,
  ) {}

  async create(name: string, parentId: string | null): Promise<Folder> {
    return this.folders.create(name, parentId);
  }

  async listChildren(
    parentId: string | null,
    page: PageRequest,
  ): Promise<Page<Folder>> {
    if (parentId !== null) {
      await this.doesFolderExist(parentId);
    }
    return this.folders.listChildren(parentId, page);
  }

  async get(id: string): Promise<Folder> {
    const folder = await this.folders.findById(id);
    if (folder === null) {
      throw new EntryNotFoundError('Folder', id);
    }
    return folder;
  }

  async delete(id: string): Promise<void> {
    await this.folders.delete(id);
  }

  async doesFolderExist(id: string): Promise<void> {
    if (!(await this.folders.exists(id))) {
      throw new EntryNotFoundError('Folder', id);
    }
  }
}
