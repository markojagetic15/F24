import { Module } from '@nestjs/common';
import { FolderService } from './application/folder.service.js';
import { APP_CONFIG, appConfig } from './config/app-config.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { PostgresFolderRepository } from './infrastructure/repositories/folder.repository.js';
import { FoldersController } from './presentation/controllers/folder.controller.js';
import { PostgresFileRepository } from './infrastructure/repositories/file.repository.js';
import { FileService } from './application/file.service.js';
import { FilesController } from './presentation/controllers/file.controller.js';
import { UnexpectedErrorFilter } from './domain/filters/unexpected-error.filter.js';
import { DomainErrorFilter } from './domain/filters/domain-error.filter.js';
import { APP_FILTER } from '@nestjs/core';

@Module({
  controllers: [FoldersController, FilesController],
  providers: [
    { provide: APP_CONFIG, useFactory: () => appConfig() },
    { provide: 'FOLDER_REPOSITORY', useClass: PostgresFolderRepository },
    { provide: 'FILE_REPOSITORY', useClass: PostgresFileRepository },
    // Last filter is checked first - so `DomainErrorFilter` catches errors first and everything
    // else is checked in `UnexpectedErrorFilter`
    { provide: APP_FILTER, useClass: UnexpectedErrorFilter },
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    PrismaService,
    FolderService,
    FileService,
  ],
})
export class AppModule {}
