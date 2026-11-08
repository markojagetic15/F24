import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  DomainError,
  EntryNameConflictError,
  EntryNotFoundError,
} from '../../domain/errors/domain.errors.js';

function statusOf(error: DomainError): HttpStatus {
  if (error instanceof EntryNotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof EntryNameConflictError) return HttpStatus.CONFLICT;
  return HttpStatus.BAD_REQUEST;
}

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const status = statusOf(error);
    host.switchToHttp().getResponse<Response>().status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}
