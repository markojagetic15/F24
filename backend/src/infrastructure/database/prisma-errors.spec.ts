import { Prisma } from './generated/client.js';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from './prisma-errors.js';

describe('prisma errors', () => {
  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('failed', {
      code,
      clientVersion: 'test',
    });

  describe.each([
    ['isUniqueViolation', isUniqueViolation, 'P2002'],
    ['isForeignKeyViolation', isForeignKeyViolation, 'P2003'],
    ['isRecordNotFound', isRecordNotFound, 'P2025'],
  ])('%s', (_name, matches, code) => {
    it(`matches ${code}`, () => {
      expect(matches(prismaError(code))).toBe(true);
    });

    it('does not match another Prisma code', () => {
      expect(matches(prismaError('P2000'))).toBe(false);
    });

    it('does not match other errors carrying the same code', () => {
      expect(matches(Object.assign(new Error('failed'), { code }))).toBe(false);
    });

    it.each([[null], [undefined], ['failed']])('does not match %j', (value) => {
      expect(matches(value)).toBe(false);
    });
  });
});
