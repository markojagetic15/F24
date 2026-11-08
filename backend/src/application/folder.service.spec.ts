import { Folder } from '../domain/entities/folder.entity.js';
import { EntryNotFoundError } from '../domain/errors/domain.errors.js';
import type { Page } from '../domain/pagination.js';
import { FolderService } from './folder.service.js';

describe('FolderService', () => {
  const ID = '01900000-0000-7000-8000-000000000001';
  const PAGE_REQUEST = { limit: 10 };
  const FOLDER = new Folder(ID, 'docs', null, new Date(0));
  const PAGE: Page<Folder> = { items: [FOLDER], nextCursor: null };

  const repository = {
    create: vi.fn(),
    exists: vi.fn(),
    listChildren: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn(),
  };
  const service = new FolderService(repository);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates through the repository', async () => {
    repository.create.mockResolvedValue(FOLDER);

    await expect(service.create('docs', ID)).resolves.toBe(FOLDER);
    expect(repository.create).toHaveBeenCalledWith('docs', ID);
  });

  describe('listChildren', () => {
    it('lists the root without looking up a parent', async () => {
      repository.listChildren.mockResolvedValue(PAGE);

      await expect(service.listChildren(null, PAGE_REQUEST)).resolves.toBe(
        PAGE,
      );
      expect(repository.exists).not.toHaveBeenCalled();
      expect(repository.listChildren).toHaveBeenCalledWith(null, PAGE_REQUEST);
    });

    it('lists the children of a folder that exists', async () => {
      repository.exists.mockResolvedValue(true);
      repository.listChildren.mockResolvedValue(PAGE);

      await expect(service.listChildren(ID, PAGE_REQUEST)).resolves.toBe(PAGE);
      expect(repository.exists).toHaveBeenCalledWith(ID);
    });

    it('fails without listing when the parent does not exist', async () => {
      repository.exists.mockResolvedValue(false);

      await expect(service.listChildren(ID, PAGE_REQUEST)).rejects.toThrow(
        EntryNotFoundError,
      );
      expect(repository.listChildren).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns the folder', async () => {
      repository.findById.mockResolvedValue(FOLDER);

      await expect(service.get(ID)).resolves.toBe(FOLDER);
    });

    it('fails naming the folder when it does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.get(ID)).rejects.toThrow(
        new EntryNotFoundError('Folder', ID),
      );
    });
  });

  it('deletes through the repository', async () => {
    repository.delete.mockResolvedValue(undefined);

    await service.delete(ID);

    expect(repository.delete).toHaveBeenCalledWith(ID);
  });

  describe('doesFolderExist', () => {
    it('resolves when the folder exists', async () => {
      repository.exists.mockResolvedValue(true);

      await expect(service.doesFolderExist(ID)).resolves.toBeUndefined();
    });

    it('fails naming the folder when it does not exist', async () => {
      repository.exists.mockResolvedValue(false);

      await expect(service.doesFolderExist(ID)).rejects.toThrow(
        new EntryNotFoundError('Folder', ID),
      );
    });
  });
});
