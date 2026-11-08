import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { FolderService } from './application/folder.service.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { AppConfigModule } from './config/app-config.module.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { PostgresFolderRepository } from './infrastructure/repositories/folder.repository.js';
import { FoldersController } from './presentation/controllers/folder.controller.js';
import { PostgresFileRepository } from './infrastructure/repositories/file.repository.js';
import { FileService } from './application/file.service.js';
import { FilesController } from './presentation/controllers/file.controller.js';
import { UnexpectedErrorFilter } from './presentation/filters/unexpected-error.filter.js';
import { DomainErrorFilter } from './presentation/filters/domain-error.filter.js';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        errorMessage: 'Too many requests. Please try again later.',
        // The default key is per endpoint, which would multiply the limit
        generateKey: (_context, tracker) => tracker,
        throttlers: [{ ttl: ONE_MINUTE_MS, limit: config.rateLimitPerMinute }],
      }),
    }),
  ],
  controllers: [FoldersController, FilesController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
