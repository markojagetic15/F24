import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import { FolderService } from '../../application/folder.service.js';
import type { Folder } from '../../domain/entities/folder.entity.js';
import type { Page } from '../../domain/pagination.ts';
import { CreateFolderBody, ListFoldersQuery } from '../dto/folder.dto.js';

@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FolderService) {}

  @Post()
  async create(@Body() body: CreateFolderBody): Promise<Folder> {
    return this.folders.create(body.name, body.parentId ?? null);
  }

  @Get()
  async list(@Query() query: ListFoldersQuery): Promise<Page<Folder>> {
      return this.folders.listChildren(query.parentId ?? null, {
          limit: query.limit,
          cursor: query.cursor,
      });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<Folder> {
    return this.folders.get(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.folders.delete(id);
  }
}
