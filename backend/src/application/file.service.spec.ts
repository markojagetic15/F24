import { File } from '../domain/entities/file.entity.js';
import { EntryNotFoundError } from '../domain/errors/domain.errors.js';
import type { Page } from '../domain/pagination.js';
import type { FileSearchScope } from '../domain/repositories/file.interface.js';
import { FileService } from './file.service.js';
import type { FolderService } from './folder.service.js';

describe('FileService', () => {
  const FILE_ID = '01900000-0000-7000-8000-000000000001';
  const FOLDER_ID = '01900000-0000-7000-8000-000000000002';
  const PAGE_REQUEST = { limit: 10 };
  const FILE = new File(FILE_ID, 'a.txt', null, new Date(0));
  const PAGE: Page<File> = { items: [FILE], nextCursor: null };

  const repository = {
    create: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
    findByName: vi.fn(),
  };
  const folders = { doesFolderExist: vi.fn() };
  const service = new FileService(
    repository,
    folders as unknown as FolderService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates through the repository', async () => {
    repository.create.mockResolvedValue(FILE);

    await expect(service.create('a.txt', FOLDER_ID)).resolves.toBe(FILE);
    expect(repository.create).toHaveBeenCalledWith('a.txt', FOLDER_ID);
  });

  describe('list', () => {
    it('lists the root without looking up a folder', async () => {
      repository.list.mockResolvedValue(PAGE);

      await expect(service.list(null, PAGE_REQUEST)).resolves.toBe(PAGE);
      expect(folders.doesFolderExist).not.toHaveBeenCalled();
      expect(repository.list).toHaveBeenCalledWith(null, PAGE_REQUEST);
    });

    it('lists a folder that exists', async () => {
      repository.list.mockResolvedValue(PAGE);

      await expect(service.list(FOLDER_ID, PAGE_REQUEST)).resolves.toBe(PAGE);
      expect(folders.doesFolderExist).toHaveBeenCalledWith(FOLDER_ID);
    });

    it('fails without listing when the folder does not exist', async () => {
      folders.doesFolderExist.mockRejectedValue(
        new EntryNotFoundError('Folder', FOLDER_ID),
      );

      await expect(service.list(FOLDER_ID, PAGE_REQUEST)).rejects.toThrow(
        EntryNotFoundError,
      );
      expect(repository.list).not.toHaveBeenCalled();
    });
  });

  it('deletes through the repository', async () => {
    repository.delete.mockResolvedValue(undefined);

    await service.delete(FILE_ID);

    expect(repository.delete).toHaveBeenCalledWith(FILE_ID);
  });

  describe('search', () => {
    it.each<[string, FileSearchScope]>([
      ['all files', 'all'],
      ['the root', { parentId: null }],
    ])('searches %s without looking up a folder', async (_label, scope) => {
      repository.search.mockResolvedValue(PAGE);

      await expect(service.search(scope, 'a.txt', PAGE_REQUEST)).resolves.toBe(
        PAGE,
      );
      expect(folders.doesFolderExist).not.toHaveBeenCalled();
      expect(repository.search).toHaveBeenCalledWith(
        scope,
        'a.txt',
        PAGE_REQUEST,
      );
    });

    it('searches a folder that exists', async () => {
      repository.search.mockResolvedValue(PAGE);

      await service.search({ parentId: FOLDER_ID }, 'a.txt', PAGE_REQUEST);

      expect(folders.doesFolderExist).toHaveBeenCalledWith(FOLDER_ID);
    });

    it('fails without searching when the folder does not exist', async () => {
      folders.doesFolderExist.mockRejectedValue(
        new EntryNotFoundError('Folder', FOLDER_ID),
      );

      await expect(
        service.search({ parentId: FOLDER_ID }, 'a.txt', PAGE_REQUEST),
      ).rejects.toThrow(EntryNotFoundError);
      expect(repository.search).not.toHaveBeenCalled();
    });
  });

  it('finds the top matches through the repository', async () => {
    repository.findByName.mockResolvedValue([FILE]);

    await expect(service.top('a')).resolves.toEqual([FILE]);
    expect(repository.findByName).toHaveBeenCalledWith('a');
  });
});
