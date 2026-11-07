import { Prisma } from './generated/client.js';

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

// Internal Prisma errors
export const isUniqueViolation = (error: unknown): boolean =>
  hasCode(error, 'P2002');
export const isForeignKeyViolation = (error: unknown): boolean =>
  hasCode(error, 'P2003');
export const isRecordNotFound = (error: unknown): boolean =>
  hasCode(error, 'P2025');
