import { Module } from '@nestjs/common';
import { FolderService } from './application/folder.service.js';
import { APP_CONFIG, appConfig } from './config/app-config.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { PostgresFolderRepository } from './infrastructure/repositories/folder.repository.js';
import { FoldersController } from './presentation/controllers/folder.controller.js';

@Module({
  controllers: [FoldersController],
  providers: [
    { provide: APP_CONFIG, useFactory: () => appConfig() },
    { provide: 'FOLDER_REPOSITORY', useClass: PostgresFolderRepository },
    PrismaService,
    FolderService,
  ],
})
export class AppModule {}
