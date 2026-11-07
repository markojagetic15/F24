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
import { CreateFileBody, ListFilesQuery } from '../dto/file.dto.js';
import type { File } from '../../domain/entities/file.entity.js';
import type { Page } from '../../domain/pagination.js';

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
      offset: query.offset,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.files.delete(id);
  }
}
