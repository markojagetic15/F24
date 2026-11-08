import { Folder } from '../../domain/entities/folder.entity.js';
import {
  EntryNameConflictError,
  EntryNotFoundError,
} from '../../domain/errors/domain.errors.js';
import { Prisma } from '../database/generated/client.js';
import type { PrismaService } from '../database/prisma.service.js';
import { PostgresFolderRepository } from './folder.repository.js';

describe('PostgresFolderRepository', () => {
  const ID = '01900000-0000-7000-8000-000000000001';
  const PARENT_ID = '01900000-0000-7000-8000-000000000002';
  const recordNamed = (name: string) => ({
    id: ID,
    name,
    parentId: null,
    createdAt: new Date(0),
  });
  const prismaError = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('failed', {
      code,
      clientVersion: 'test',
    });

  const folder = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  };
  const repository = new PostgresFolderRepository({
    folder,
  } as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('stores the folder and returns the entity', async () => {
      folder.create.mockResolvedValue(recordNamed('docs'));

      await expect(repository.create('docs', PARENT_ID)).resolves.toEqual(
        new Folder(ID, 'docs', null, new Date(0)),
      );
      expect(folder.create).toHaveBeenCalledWith({
        data: { name: 'docs', parentId: PARENT_ID },
      });
    });

    it('reports a unique violation as a name conflict', async () => {
      folder.create.mockRejectedValue(prismaError('P2002'));

      await expect(repository.create('docs', null)).rejects.toThrow(
        new EntryNameConflictError('Folder', 'docs'),
      );
    });

    it('reports a foreign key violation as a missing parent', async () => {
      folder.create.mockRejectedValue(prismaError('P2003'));

      await expect(repository.create('docs', PARENT_ID)).rejects.toThrow(
        new EntryNotFoundError('Folder', PARENT_ID),
      );
    });

    it('rethrows a foreign key violation when there is no parent', async () => {
      const error = prismaError('P2003');
      folder.create.mockRejectedValue(error);

      await expect(repository.create('docs', null)).rejects.toBe(error);
    });

    it('rethrows anything else', async () => {
      const error = new Error('connection lost');
      folder.create.mockRejectedValue(error);

      await expect(repository.create('docs', null)).rejects.toBe(error);
    });
  });

  describe('exists', () => {
    it('selects only the id and is true when a row is found', async () => {
      folder.findUnique.mockResolvedValue({ id: ID });

      await expect(repository.exists(ID)).resolves.toBe(true);
      expect(folder.findUnique).toHaveBeenCalledWith({
        where: { id: ID },
        select: { id: true },
      });
    });

    it('is false when no row is found', async () => {
      folder.findUnique.mockResolvedValue(null);

      await expect(repository.exists(ID)).resolves.toBe(false);
    });
  });

  describe('listChildren', () => {
    it('asks for one extra row, in name order, from the start', async () => {
      folder.findMany.mockResolvedValue([]);

      await repository.listChildren(PARENT_ID, { limit: 2 });

      expect(folder.findMany).toHaveBeenCalledWith({
        where: { parentId: PARENT_ID },
        orderBy: { name: 'asc' },
        take: 3,
      });
    });

    it('continues after the cursor name', async () => {
      folder.findMany.mockResolvedValue([]);

      await repository.listChildren(null, { limit: 2, cursor: 'b' });

      expect(folder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null, name: { gt: 'b' } },
        }),
      );
    });

    it('uses the last returned name as the next cursor', async () => {
      folder.findMany.mockResolvedValue(['a', 'b', 'c'].map(recordNamed));

      const page = await repository.listChildren(null, { limit: 2 });

      expect(page.items.map((item) => item.name)).toEqual(['a', 'b']);
      expect(page.items[0]).toBeInstanceOf(Folder);
      expect(page.nextCursor).toBe('b');
    });
  });

  describe('findById', () => {
    it('returns the entity', async () => {
      folder.findUnique.mockResolvedValue(recordNamed('docs'));

      await expect(repository.findById(ID)).resolves.toEqual(
        new Folder(ID, 'docs', null, new Date(0)),
      );
    });

    it('returns null when no row is found', async () => {
      folder.findUnique.mockResolvedValue(null);

      await expect(repository.findById(ID)).resolves.toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes by id', async () => {
      folder.delete.mockResolvedValue(recordNamed('docs'));

      await repository.delete(ID);

      expect(folder.delete).toHaveBeenCalledWith({ where: { id: ID } });
    });

    it('reports a missing row as not found', async () => {
      folder.delete.mockRejectedValue(prismaError('P2025'));

      await expect(repository.delete(ID)).rejects.toThrow(
        new EntryNotFoundError('Folder', ID),
      );
    });

    it('rethrows anything else', async () => {
      const error = new Error('connection lost');
      folder.delete.mockRejectedValue(error);

      await expect(repository.delete(ID)).rejects.toBe(error);
    });
  });
});
