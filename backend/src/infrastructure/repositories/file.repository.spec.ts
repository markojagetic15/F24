import 'reflect-metadata';
import { File } from '../../domain/entities/file.entity.js';
import {
  EntryNameConflictError,
  EntryNotFoundError,
} from '../../domain/errors/domain.errors.js';
import type { FileSearchScope } from '../../domain/repositories/file.interface.js';
import { TOP_SEARCH_LIMIT } from '../../presentation/dto/file.dto.js';
import { Prisma } from '../database/generated/client.js';
import type { PrismaService } from '../database/prisma.service.js';
import { PostgresFileRepository } from './file.repository.js';

describe('PostgresFileRepository', () => {
  const ID = '01900000-0000-7000-8000-000000000001';
  const PARENT_ID = '01900000-0000-7000-8000-000000000002';
  const recordOf = (id: string, name: string) => ({
    id,
    name,
    parentId: null,
    createdAt: new Date(0),
  });
  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('failed', {
      code,
      clientVersion: 'test',
    });

  const file = {
    create: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  };
  const repository = new PostgresFileRepository({
    file,
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    file.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('stores the file and returns the entity', async () => {
      file.create.mockResolvedValue(recordOf(ID, 'a.txt'));

      await expect(repository.create('a.txt', PARENT_ID)).resolves.toEqual(
        new File(ID, 'a.txt', null, new Date(0)),
      );
      expect(file.create).toHaveBeenCalledWith({
        data: { name: 'a.txt', parentId: PARENT_ID },
      });
    });

    it('reports a unique violation as a name conflict', async () => {
      file.create.mockRejectedValue(prismaError('P2002'));

      await expect(repository.create('a.txt', null)).rejects.toThrow(
        new EntryNameConflictError('File', 'a.txt'),
      );
    });

    it('reports a foreign key violation as a missing folder', async () => {
      file.create.mockRejectedValue(prismaError('P2003'));

      await expect(repository.create('a.txt', PARENT_ID)).rejects.toThrow(
        new EntryNotFoundError('Folder', PARENT_ID),
      );
    });

    it('rethrows a foreign key violation when there is no parent', async () => {
      const error = prismaError('P2003');
      file.create.mockRejectedValue(error);

      await expect(repository.create('a.txt', null)).rejects.toBe(error);
    });

    it('rethrows anything else', async () => {
      const error = new Error('connection lost');
      file.create.mockRejectedValue(error);

      await expect(repository.create('a.txt', null)).rejects.toBe(error);
    });
  });

  describe('list', () => {
    it('asks for one extra row, in name order, from the start', async () => {
      await repository.list(PARENT_ID, { limit: 2 });

      expect(file.findMany).toHaveBeenCalledWith({
        where: { parentId: PARENT_ID },
        orderBy: { name: 'asc' },
        take: 3,
      });
    });

    it('continues after the cursor name', async () => {
      await repository.list(null, { limit: 2, cursor: 'b.txt' });

      expect(file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null, name: { gt: 'b.txt' } },
        }),
      );
    });

    it('uses the last returned name as the next cursor', async () => {
      file.findMany.mockResolvedValue(
        ['a', 'b', 'c'].map((name) => recordOf(`id-${name}`, name)),
      );

      const page = await repository.list(null, { limit: 2 });

      expect(page.items.map((item) => item.name)).toEqual(['a', 'b']);
      expect(page.items[0]).toBeInstanceOf(File);
      expect(page.nextCursor).toBe('b');
    });
  });

  describe('delete', () => {
    it('deletes by id', async () => {
      file.delete.mockResolvedValue(recordOf(ID, 'a.txt'));

      await repository.delete(ID);

      expect(file.delete).toHaveBeenCalledWith({ where: { id: ID } });
    });

    it('reports a missing row as not found', async () => {
      file.delete.mockRejectedValue(prismaError('P2025'));

      await expect(repository.delete(ID)).rejects.toThrow(
        new EntryNotFoundError('File', ID),
      );
    });

    it('rethrows anything else', async () => {
      const error = new Error('connection lost');
      file.delete.mockRejectedValue(error);

      await expect(repository.delete(ID)).rejects.toBe(error);
    });
  });

  describe('search', () => {
    it.each<[string, FileSearchScope, object]>([
      ['all files', 'all', { name: 'a.txt' }],
      ['the root', { parentId: null }, { name: 'a.txt', parentId: null }],
      [
        'one folder',
        { parentId: PARENT_ID },
        { name: 'a.txt', parentId: PARENT_ID },
      ],
    ])('searches %s, in id order', async (_label, scope, where) => {
      await repository.search(scope, 'a.txt', { limit: 2 });

      expect(file.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { id: 'asc' },
        take: 3,
      });
    });

    it('continues after the cursor id', async () => {
      await repository.search('all', 'a.txt', { limit: 2, cursor: ID });

      expect(file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'a.txt', id: { gt: ID } },
        }),
      );
    });

    it('uses the last returned id as the next cursor', async () => {
      file.findMany.mockResolvedValue(
        ['1', '2', '3'].map((id) => recordOf(id, 'a.txt')),
      );

      const page = await repository.search('all', 'a.txt', { limit: 2 });

      expect(page.items.map((item) => item.id)).toEqual(['1', '2']);
      expect(page.nextCursor).toBe('2');
    });
  });

  describe('findByName', () => {
    it.each<[string, FileSearchScope, object]>([
      ['all files', 'all', { name: { startsWith: 'rep' } }],
      [
        'the root',
        { parentId: null },
        { name: { startsWith: 'rep' }, parentId: null },
      ],
      [
        'one folder',
        { parentId: PARENT_ID },
        { name: { startsWith: 'rep' }, parentId: PARENT_ID },
      ],
    ])(
      'takes the top matches in %s by name, then id',
      async (_l, scope, where) => {
        await repository.findByName(scope, 'rep');

        expect(file.findMany).toHaveBeenCalledWith({
          where,
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          take: TOP_SEARCH_LIMIT,
        });
      },
    );

    it.each([
      ['percent', '100%', '100\\%'],
      ['underscore', 'a_b', 'a\\_b'],
      ['backslash', 'a\\b', 'a\\\\b'],
      ['every occurrence', '%_%', '\\%\\_\\%'],
    ])('escapes %s for LIKE', async (_label, name, escaped) => {
      await repository.findByName('all', name);

      expect(file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: { startsWith: escaped } } }),
      );
    });

    it('returns entities', async () => {
      file.findMany.mockResolvedValue([recordOf(ID, 'a.txt')]);

      await expect(repository.findByName('all', 'a')).resolves.toEqual([
        new File(ID, 'a.txt', null, new Date(0)),
      ]);
    });
  });
});
