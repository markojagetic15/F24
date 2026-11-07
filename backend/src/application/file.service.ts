import { Inject, Injectable } from '@nestjs/common';
import type { File } from '../domain/entities/file.entity.js';
import type { Page, PageRequest } from '../domain/pagination.js';
import type { FileRepository } from '../domain/repositories/file.interface.js';
import { FolderService } from './folder.service.js';

@Injectable()
export class FileService {
  constructor(
    @Inject('FILE_REPOSITORY') private readonly files: FileRepository,
    private readonly folders: FolderService,
  ) {}

  async create(name: string, parentId: string | null): Promise<File> {
    return this.files.create(name, parentId);
  }

  async list(parentId: string | null, page: PageRequest): Promise<Page<File>> {
    if (parentId !== null) await this.folders.doesFolderExist(parentId);
    return this.files.list(parentId, page);
  }

  async delete(id: string): Promise<void> {
    await this.files.delete(id);
  }
}
