import { Inject, Injectable } from '@nestjs/common';
import type { File } from '../domain/entities/file.entity.js';
import type { Page, PageRequest } from '../domain/pagination.js';
import type {
  FileRepository,
  FileSearchScope,
} from '../domain/repositories/file.interface.js';
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

  async search(
    scope: FileSearchScope,
    name: string,
    page: PageRequest,
  ): Promise<Page<File>> {
    if (scope !== 'all' && scope.parentId !== null) {
      await this.folders.doesFolderExist(scope.parentId);
    }
    return this.files.search(scope, name, page);
  }

  async topTen(name: string): Promise<File[]> {
    return this.files.findByName(name);
  }
}
