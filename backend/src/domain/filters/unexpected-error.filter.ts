import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Catch()
export class UnexpectedErrorFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(UnexpectedErrorFilter.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async catch(error: unknown, host: ArgumentsHost): Promise<void> {
    if (error instanceof HttpException || (await this.prisma.isReachable())) {
      super.catch(error, host);
      return;
    }

    this.logger.error(error);
    const status = HttpStatus.SERVICE_UNAVAILABLE;
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: 'DatabaseUnavailable',
      message: 'The database is temporarily unavailable. Please try again.',
    });
  }
}
