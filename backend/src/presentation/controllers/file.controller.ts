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
import { FileService } from '../../application/file.service.js';
import {
  CreateFileBody,
  ListFilesQuery,
  ROOT_PARENT_ID,
  SearchFilesQuery,
  TopFilesQuery,
} from '../dto/file.dto.js';
import type { File } from '../../domain/entities/file.entity.js';
import type { Page } from '../../domain/pagination.js';
import { FileSearchScope } from '../../domain/repositories/file.interface.js';

function toSearchScope(parentId?: string): FileSearchScope {
  if (parentId === undefined) {
    return 'all';
  }
  return { parentId: parentId === ROOT_PARENT_ID ? null : parentId };
}

@Controller('files')
export class FilesController {
  constructor(private readonly files: FileService) {}

  @Post()
  async create(@Body() body: CreateFileBody): Promise<File> {
    return this.files.create(body.name, body.parentId ?? null);
  }

  @Get()
  async list(@Query() query: ListFilesQuery): Promise<Page<File>> {
    return this.files.list(query.parentId ?? null, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.files.delete(id);
  }

  @Get('search')
  async search(@Query() query: SearchFilesQuery): Promise<Page<File>> {
    return this.files.search(toSearchScope(query.parentId), query.name, {
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get('top')
  async top(@Query() query: TopFilesQuery): Promise<File[]> {
    return this.files.top(toSearchScope(query.parentId), query.prefix);
  }
}
