import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { Prisma } from '../src/infrastructure/database/generated/client.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Files API', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());
  const createFolder = async (name: string, parentId?: string) => {
    const response = await api()
      .post('/api/folders')
      .send({ name, parentId })
      .expect(201);
    return response.body as { id: string };
  };
  const createFile = async (name: string, parentId?: string) => {
    const response = await api()
      .post('/api/files')
      .send({ name, parentId })
      .expect(201);
    return response.body as { id: string };
  };
  const createSameNameWithDescendingIds = async (name: string) => {
    const ids = [3, 2, 1].map((n) => `00000000-0000-7000-8000-00000000000${n}`);
    for (const [index, id] of ids.entries()) {
      const folder = await createFolder(`folder-${index}`);
      await prisma.file.create({ data: { id, name, parentId: folder.id } });
    }
    return [...ids].reverse();
  };
  const statusesOf = (responses: { status: number }[]) =>
    responses.map((response) => response.status).sort((a, b) => a - b);
  const namesOf = (items: { name: string }[]) => items.map((f) => f.name);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE files, folders`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/files', () => {
    it('creates files at the root and inside a folder', async () => {
      const root = await api()
        .post('/api/files')
        .send({ name: 'root.txt' })
        .expect(201);
      expect(root.body).toMatchObject({ name: 'root.txt', parentId: null });
      expect(root.body.id).toEqual(expect.any(String));
      expect(root.body.createdAt).toEqual(expect.any(String));

      const folder = await createFolder('docs');
      const nested = await api()
        .post('/api/files')
        .send({ name: 'a.txt', parentId: folder.id })
        .expect(201);
      expect(nested.body.parentId).toBe(folder.id);
    });

    it('allows many files in one folder', async () => {
      const folder = await createFolder('docs');
      await createFile('a.txt', folder.id);
      await createFile('b.txt', folder.id);
      expect(await prisma.file.count()).toBe(2);
    });

    it('returns 409 for a duplicate at the root, where the parent is NULL', async () => {
      await createFile('a.txt');
      const response = await api()
        .post('/api/files')
        .send({ name: 'a.txt' })
        .expect(409);
      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'EntryNameConflictError',
      });
    });

    it('returns 409 for a duplicate in the same folder', async () => {
      const folder = await createFolder('docs');
      await createFile('a.txt', folder.id);
      await api()
        .post('/api/files')
        .send({ name: 'a.txt', parentId: folder.id })
        .expect(409);
    });

    it('allows one name in different folders and at the root', async () => {
      const first = await createFolder('first');
      const second = await createFolder('second');
      await createFile('same.txt', first.id);
      await createFile('same.txt', second.id);
      await createFile('same.txt');
    });

    it('allows a file and a folder with one name in the same location', async () => {
      const folder = await createFolder('shared');
      await createFile('shared');
      await createFolder('nested', folder.id);
      await createFile('nested', folder.id);
    });

    it('returns 404 naming the folder when the parent does not exist', async () => {
      const parentId = randomUUID();
      const response = await api()
        .post('/api/files')
        .send({ name: 'a.txt', parentId })
        .expect(404);
      expect(response.body).toMatchObject({
        error: 'EntryNotFoundError',
        message: `Folder '${parentId}' was not found.`,
      });
      expect(await prisma.file.count()).toBe(0);
    });

    it('creates exactly one file when identical requests race', async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, () =>
          api().post('/api/files').send({ name: 'race.txt' }),
        ),
      );
      expect(statusesOf(responses)).toEqual([
        201,
        ...Array<number>(19).fill(409),
      ]);
      expect(await prisma.file.count()).toBe(1);
    });

    it.each([
      ['missing name', {}],
      ['null name', { name: null }],
      ['numeric name', { name: 42 }],
      ['array name', { name: ['a'] }],
      ['object name', { name: { contains: 'a' } }],
      ['blank name', { name: '   ' }],
      ['path traversal', { name: '../../etc/passwd' }],
      ['reserved name', { name: '..' }],
      ['NUL byte', { name: 'a\u0000b' }],
      ['lone surrogate', { name: 'a\ud800b' }],
      ['name over the limit', { name: 'a'.repeat(256) }],
      [
        'empty parent id, which must not mean the root',
        { name: 'a', parentId: '' },
      ],
      ['malformed parent id', { name: 'a', parentId: "1' OR '1'='1" }],
      ['unknown field', { name: 'a', id: randomUUID() }],
    ])('returns 400 for %s and stores nothing', async (_label, body) => {
      await api().post('/api/files').send(body).expect(400);
      expect(await prisma.file.count()).toBe(0);
    });

    it('returns 400 for malformed JSON', async () => {
      await api()
        .post('/api/files')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);
    });

    it('stores SQL and markup in names as plain text', async () => {
      const name = `'; DROP TABLE files;-- <b>bold`;
      const created = await api().post('/api/files').send({ name }).expect(201);
      expect(created.body.name).toBe(name);
      expect(await prisma.file.count()).toBe(1);
    });
  });

  describe('GET /api/files', () => {
    it('lists only the files directly in the folder, in name order', async () => {
      const parent = await createFolder('parent');
      const child = await createFolder('child', parent.id);
      const sibling = await createFolder('sibling');
      await createFile('b.txt', parent.id);
      await createFile('a.txt', parent.id);
      await createFile('nested.txt', child.id);
      await createFile('elsewhere.txt', sibling.id);
      await createFile('root.txt');

      const response = await api()
        .get('/api/files')
        .query({ parentId: parent.id })
        .expect(200);
      expect(namesOf(response.body.items)).toEqual(['a.txt', 'b.txt']);
      expect(response.body.nextCursor).toBeNull();
    });

    it('lists the root when no parent is given', async () => {
      const folder = await createFolder('docs');
      await createFile('inside.txt', folder.id);
      await createFile('b.txt');
      await createFile('a.txt');

      const response = await api().get('/api/files').expect(200);
      expect(namesOf(response.body.items)).toEqual(['a.txt', 'b.txt']);
    });

    it('returns an empty page for an empty folder', async () => {
      const folder = await createFolder('empty');
      const response = await api()
        .get('/api/files')
        .query({ parentId: folder.id })
        .expect(200);
      expect(response.body).toEqual({ items: [], nextCursor: null });
    });

    it('respects the limit and points at the last returned file', async () => {
      await createFile('c.txt');
      await createFile('a.txt');
      await createFile('b.txt');

      const response = await api()
        .get('/api/files')
        .query({ limit: 2 })
        .expect(200);
      expect(namesOf(response.body.items)).toEqual(['a.txt', 'b.txt']);
      expect(response.body.nextCursor).toBe('b.txt');
    });

    it('has no next page when the last page is exactly full', async () => {
      await createFile('a.txt');
      await createFile('b.txt');

      const response = await api()
        .get('/api/files')
        .query({ limit: 2 })
        .expect(200);
      expect(response.body.nextCursor).toBeNull();
    });

    it('walks every page without gaps or repeats', async () => {
      const folder = await createFolder('docs');
      for (const name of ['d', 'a', 'e', 'c', 'b']) {
        await createFile(name, folder.id);
      }

      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const response: request.Response = await api()
          .get('/api/files')
          .query({
            parentId: folder.id,
            limit: 2,
            ...(cursor ? { cursor } : {}),
          })
          .expect(200);
        seen.push(...namesOf(response.body.items));
        cursor = response.body.nextCursor;
      } while (cursor);

      expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('returns 404 for a parent that does not exist', async () => {
      await api()
        .get('/api/files')
        .query({ parentId: randomUUID() })
        .expect(404);
    });

    it.each([
      ['limit of zero', 'limit=0'],
      ['limit over the maximum', 'limit=201'],
      ['non-numeric limit', 'limit=abc'],
      ['fractional limit', 'limit=1.5'],
      ['repeated limit', 'limit=1&limit=2'],
      ['malformed parent', 'parentId=nope'],
      ['empty parent', 'parentId='],
      ['NUL byte in cursor', 'cursor=a%00'],
      ['repeated cursor', 'cursor=a&cursor=b'],
      ['unknown parameter', 'admin=true'],
    ])('returns 400 for %s', async (_label, query) => {
      await api().get(`/api/files?${query}`).expect(400);
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('deletes only that file', async () => {
      const doomed = await createFile('doomed.txt');
      await createFile('kept.txt');

      await api().delete(`/api/files/${doomed.id}`).expect(204);

      expect(namesOf(await prisma.file.findMany())).toEqual(['kept.txt']);
    });

    it('frees the name for reuse', async () => {
      const file = await createFile('a.txt');
      await api().delete(`/api/files/${file.id}`).expect(204);
      await createFile('a.txt');
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await api().delete(`/api/files/${randomUUID()}`).expect(404);
      await api().delete('/api/files/not-a-uuid').expect(400);
    });

    it('lets exactly one of two racing deletes succeed', async () => {
      const file = await createFile('race.txt');
      const responses = await Promise.all([
        api().delete(`/api/files/${file.id}`),
        api().delete(`/api/files/${file.id}`),
      ]);
      expect(statusesOf(responses)).toEqual([204, 404]);
    });
  });

  describe('GET /api/files/search', () => {
    const search = (query: Record<string, string | number>) =>
      api().get('/api/files/search').query(query);

    it('searches all files, in every folder and the root, when no parent is given', async () => {
      const first = await createFolder('first');
      const nested = await createFolder('nested', first.id);
      await createFile('same.txt', first.id);
      await createFile('same.txt', nested.id);
      await createFile('same.txt');

      const response = await search({ name: 'same.txt' }).expect(200);
      expect(namesOf(response.body.items)).toEqual([
        'same.txt',
        'same.txt',
        'same.txt',
      ]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('matches the whole name exactly and respects case', async () => {
      for (const name of ['same.txt.bak', 'SAME.TXT', 'xsame.txt', 'same.tx']) {
        await createFile(name);
      }
      const match = await createFile('same.txt');

      const response = await search({ name: 'same.txt' }).expect(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(match.id);
    });

    it('searches only the given folder, not its subfolders or siblings', async () => {
      const parent = await createFolder('parent');
      const child = await createFolder('child', parent.id);
      const sibling = await createFolder('sibling');
      const match = await createFile('same.txt', parent.id);
      await createFile('same.txt', child.id);
      await createFile('same.txt', sibling.id);
      await createFile('same.txt');

      const response = await search({
        name: 'same.txt',
        parentId: parent.id,
      }).expect(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(match.id);
    });

    it('searches only the root for parentId=root', async () => {
      const folder = await createFolder('docs');
      await createFile('same.txt', folder.id);
      const match = await createFile('same.txt');
      await createFile('in-folder-only.txt', folder.id);

      const found = await search({
        name: 'same.txt',
        parentId: 'root',
      }).expect(200);
      expect(found.body.items).toHaveLength(1);
      expect(found.body.items[0].id).toBe(match.id);

      const missing = await search({
        name: 'in-folder-only.txt',
        parentId: 'root',
      }).expect(200);
      expect(missing.body.items).toEqual([]);
    });

    it('returns an empty page, not 404, when nothing matches', async () => {
      const folder = await createFolder('empty');
      const response = await search({
        name: 'missing.txt',
        parentId: folder.id,
      }).expect(200);
      expect(response.body).toEqual({ items: [], nextCursor: null });
    });

    it.each([
      ['percent', '100%', ['100x', '100%']],
      ['underscore', 'a_b', ['axb', 'a_b']],
    ])('treats %s in a name literally', async (_label, name, names) => {
      for (const created of names) await createFile(created);

      const response = await search({ name }).expect(200);
      expect(namesOf(response.body.items)).toEqual([name]);
    });

    it('treats SQL in a name as plain text', async () => {
      await createFile('safe.txt');
      const response = await search({ name: `' OR '1'='1` }).expect(200);
      expect(response.body.items).toEqual([]);
      expect(await prisma.file.count()).toBe(1);
    });

    it('walks every page by id without gaps or repeats', async () => {
      const ids: string[] = [];
      for (const name of ['a', 'b', 'c', 'd', 'e']) {
        const folder = await createFolder(name);
        ids.push((await createFile('same.txt', folder.id)).id);
      }

      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const response: request.Response = await search({
          name: 'same.txt',
          limit: 2,
          ...(cursor ? { cursor } : {}),
        }).expect(200);
        const pageIds = response.body.items.map((f: { id: string }) => f.id);
        seen.push(...pageIds);
        cursor = response.body.nextCursor;
        if (cursor) expect(cursor).toBe(pageIds[pageIds.length - 1]);
      } while (cursor);

      expect(seen).toEqual([...ids].sort());
    });

    it('has no next page when the last page is exactly full', async () => {
      const folder = await createFolder('docs');
      await createFile('same.txt', folder.id);
      await createFile('same.txt');

      const response = await search({ name: 'same.txt', limit: 2 }).expect(200);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.nextCursor).toBeNull();
    });

    it('orders results by id, not by insertion', async () => {
      const ids = await createSameNameWithDescendingIds('same.txt');

      const response = await search({ name: 'same.txt' }).expect(200);
      expect(response.body.items.map((f: { id: string }) => f.id)).toEqual(ids);
    });

    it('respects the limit and points at the last returned file', async () => {
      const ids = await createSameNameWithDescendingIds('same.txt');

      const response = await search({ name: 'same.txt', limit: 1 }).expect(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.nextCursor).toBe(ids[0]);
    });

    it('no longer finds a deleted file', async () => {
      const file = await createFile('gone.txt');
      await api().delete(`/api/files/${file.id}`).expect(204);

      const response = await search({ name: 'gone.txt' }).expect(200);
      expect(response.body.items).toEqual([]);
    });

    it('returns 404 for a parent that does not exist', async () => {
      await search({ name: 'a.txt', parentId: randomUUID() }).expect(404);
    });

    it.each([
      ['missing name', ''],
      ['empty name', 'name='],
      ['blank name', 'name=%20%20'],
      ['repeated name', 'name=a&name=b'],
      ['object name', 'name[contains]=a'],
      ['name with a slash', 'name=a%2Fb'],
      ['reserved name', 'name=..'],
      ['NUL byte in name', 'name=a%00'],
      ['name over the limit', `name=${'a'.repeat(256)}`],
      ['malformed parent', 'name=a&parentId=nope'],
      ['empty parent, which must not mean all files', 'name=a&parentId='],
      ['root in the wrong case', 'name=a&parentId=ROOT'],
      ['repeated parent', 'name=a&parentId=root&parentId=root'],
      ['a name used as the cursor', 'name=a&cursor=b.txt'],
      ['limit of zero', 'name=a&limit=0'],
      ['limit over the maximum', 'name=a&limit=201'],
      ['unknown parameter', 'name=a&admin=true'],
    ])('returns 400 for %s', async (_label, query) => {
      await api().get(`/api/files/search?${query}`).expect(400);
    });
  });

  describe('GET /api/files/top', () => {
    const top = async (prefix: string) => {
      const response = await api()
        .get('/api/files/top')
        .query({ prefix })
        .expect(200);
      return response.body as { id: string; name: string }[];
    };

    it('returns the first 10 matches by name across all folders', async () => {
      const first = await createFolder('first');
      const second = await createFolder('second');
      const shuffled = [12, 3, 7, 1, 11, 5, 9, 2, 10, 4, 8, 6];
      for (const i of shuffled) {
        const name = `rep${String(i).padStart(2, '0')}`;
        await createFile(
          name,
          i % 3 === 0 ? undefined : i % 2 ? first.id : second.id,
        );
      }
      await createFile('other');

      expect(namesOf(await top('rep'))).toEqual(
        Array.from(
          { length: 10 },
          (_, i) => `rep${String(i + 1).padStart(2, '0')}`,
        ),
      );
    });

    it('returns fewer than 10 when fewer match, and an empty array for none', async () => {
      await createFile('abc');
      await createFile('abd');

      expect(namesOf(await top('ab'))).toEqual(['abc', 'abd']);
      expect(await top('zzz')).toEqual([]);
    });

    it('matches only the start of the name, including the whole name', async () => {
      await createFile('report.pdf');
      await createFile('my-report.pdf');

      expect(namesOf(await top('report.pdf'))).toEqual(['report.pdf']);
      expect(namesOf(await top('report'))).toEqual(['report.pdf']);
      expect(await top('eport')).toEqual([]);
    });

    it('respects case', async () => {
      await createFile('Report.pdf');
      await createFile('report.pdf');

      expect(namesOf(await top('rep'))).toEqual(['report.pdf']);
      expect(namesOf(await top('Rep'))).toEqual(['Report.pdf']);
    });

    it('breaks ties between equal names by id, not by insertion', async () => {
      const ids = await createSameNameWithDescendingIds('same');

      const found = await top('sam');
      expect(found.map((file) => file.id)).toEqual(ids);
    });

    it.each([
      ['%', ['%first', 'second']],
      ['_', ['_first', 'second']],
      ['100%', ['100%', '100x']],
      ['a_', ['a_b', 'axb']],
    ])('treats the wildcard in %j literally', async (prefix, names) => {
      for (const name of names) await createFile(name);

      expect(namesOf(await top(prefix))).toEqual([names[0]]);
    });

    it.each([
      ['a trailing space', 'my ', 'my file'],
      ['dots that are not a valid name', '..', '..hidden'],
      ['non-ASCII letters', 'č', 'čaj'],
      ['emoji', '😀', '😀.txt'],
      ['a quote', "o'", "o'neil"],
    ])('accepts a prefix with %s', async (_label, prefix, name) => {
      await createFile(name);
      await createFile('other');

      expect(namesOf(await top(prefix))).toEqual([name]);
    });

    it('treats SQL in a prefix as plain text', async () => {
      await createFile('safe.txt');

      expect(await top(`' OR 1=1 --`)).toEqual([]);
      expect(await prisma.file.count()).toBe(1);
    });

    it('accepts a prefix of the maximum length', async () => {
      const name = 'a'.repeat(255);
      await createFile(name);

      expect(namesOf(await top(name))).toEqual([name]);
    });

    it('no longer returns a deleted file', async () => {
      const file = await createFile('gone.txt');
      await api().delete(`/api/files/${file.id}`).expect(204);

      expect(await top('gone')).toEqual([]);
    });

    describe('within a location', () => {
      const topIn = async (prefix: string, parentId: string) => {
        const response = await api()
          .get('/api/files/top')
          .query({ prefix, parentId })
          .expect(200);
        return namesOf(response.body as { name: string }[]);
      };

      it('searches only the given folder, not its subfolders or siblings', async () => {
        const parent = await createFolder('parent');
        const child = await createFolder('child', parent.id);
        const sibling = await createFolder('sibling');
        await createFile('rep-parent', parent.id);
        await createFile('rep-child', child.id);
        await createFile('rep-sibling', sibling.id);
        await createFile('rep-root');

        expect(await topIn('rep', parent.id)).toEqual(['rep-parent']);
      });

      it('searches only the root for parentId=root', async () => {
        const folder = await createFolder('docs');
        await createFile('rep-folder', folder.id);
        await createFile('rep-root');

        expect(await topIn('rep', 'root')).toEqual(['rep-root']);
      });

      it('finds a match that the all-files top 10 would cut off', async () => {
        const folder = await createFolder('docs');
        for (let i = 0; i < 12; i += 1) await createFile(`a${i}`);
        await createFile('az-in-folder', folder.id);

        expect(await topIn('a', folder.id)).toEqual(['az-in-folder']);
      });

      it('returns 404 for a parent that does not exist', async () => {
        await api()
          .get('/api/files/top')
          .query({ prefix: 'a', parentId: randomUUID() })
          .expect(404);
      });
    });

    it.each([
      ['missing prefix', ''],
      ['empty prefix', 'prefix='],
      ['repeated prefix', 'prefix=a&prefix=b'],
      ['object prefix', 'prefix[contains]=a'],
      ['slash', 'prefix=a%2Fb'],
      ['backslash', 'prefix=a%5Cb'],
      ['NUL byte', 'prefix=a%00'],
      ['newline', 'prefix=a%0Ab'],
      ['prefix over the limit', `prefix=${'a'.repeat(256)}`],
      ['a limit, which is fixed at 10', 'prefix=a&limit=50'],
      ['malformed parent', 'prefix=a&parentId=nope'],
      ['empty parent, which must not mean all files', 'prefix=a&parentId='],
      ['root in the wrong case', 'prefix=a&parentId=ROOT'],
      ['repeated parent', 'prefix=a&parentId=root&parentId=root'],
    ])('returns 400 for %s', async (_label, query) => {
      await api().get(`/api/files/top?${query}`).expect(400);
    });
  });

  describe('file name ordering and indexes', () => {
    const planFor = async (query: Prisma.Sql) => {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
        return tx.$queryRaw<{ 'QUERY PLAN': string }[]>(query);
      });
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    };

    it('orders names bytewise, so upper case comes first', async () => {
      await createFile('apple');
      await createFile('Zebra');

      const response = await api().get('/api/files').expect(200);
      expect(namesOf(response.body.items)).toEqual(['Zebra', 'apple']);
    });

    it('serves a prefix search from the name index', async () => {
      const plan = await planFor(
        Prisma.sql`EXPLAIN SELECT id FROM files WHERE name LIKE 'abc%' ORDER BY name, id LIMIT 10`,
      );
      expect(plan).toContain('files_name_id_idx');
      expect(plan).toMatch(/Index Cond: .*name.*>=/);
    });

    it('serves an exact search across all files from the name index', async () => {
      const plan = await planFor(
        Prisma.sql`EXPLAIN SELECT id FROM files WHERE name = 'abc' ORDER BY id LIMIT 51`,
      );
      expect(plan).toContain('files_name_id_idx');
      expect(plan).toMatch(/Index Cond: .*name/);
    });
  });

  describe('deleting a folder', () => {
    it('deletes the files in its whole subtree and leaves everything else', async () => {
      const doomed = await createFolder('doomed');
      const child = await createFolder('child', doomed.id);
      const kept = await createFolder('kept');
      await createFile('direct.txt', doomed.id);
      await createFile('nested.txt', child.id);
      await createFile('kept.txt', kept.id);
      await createFile('root.txt');

      await api().delete(`/api/folders/${doomed.id}`).expect(204);

      const remaining = await prisma.file.findMany({
        orderBy: { name: 'asc' },
      });
      expect(namesOf(remaining)).toEqual(['kept.txt', 'root.txt']);
    });

    it('leaves no orphans when creates race with deleting their folder', async () => {
      const folder = await createFolder('docs');
      const responses = await Promise.all([
        ...Array.from({ length: 20 }, (_, i) =>
          api()
            .post('/api/files')
            .send({ name: `a${i}`, parentId: folder.id }),
        ),
        api().delete(`/api/folders/${folder.id}`),
        ...Array.from({ length: 20 }, (_, i) =>
          api()
            .post('/api/files')
            .send({ name: `b${i}`, parentId: folder.id }),
        ),
      ]);

      for (const response of responses) {
        expect([201, 204, 404]).toContain(response.status);
      }
      expect(await prisma.file.count()).toBe(0);
    });
  });

  describe('database constraints, bypassing the API', () => {
    const insertRoot = (name: string) =>
      prisma.$executeRaw`INSERT INTO files (id, name) VALUES (${randomUUID()}::uuid, ${name})`;

    it('rejects duplicate root files', async () => {
      await insertRoot('same');
      await expect(insertRoot('same')).rejects.toThrow();
    });

    it('rejects duplicate files in one folder', async () => {
      const folder = await createFolder('docs');
      const insert = () =>
        prisma.$executeRaw`INSERT INTO files (id, name, parent_id) VALUES (${randomUUID()}::uuid, 'same', ${folder.id}::uuid)`;
      await insert();
      await expect(insert()).rejects.toThrow();
    });

    it('rejects a file in a folder that does not exist', async () => {
      await expect(
        prisma.$executeRaw`INSERT INTO files (id, name, parent_id) VALUES (${randomUUID()}::uuid, 'a', ${randomUUID()}::uuid)`,
      ).rejects.toThrow();
    });

    it.each(['', '.', '..', 'a/b', 'a\\b', 'a\nb'])(
      'rejects the invalid name %j',
      async (name) => {
        await expect(insertRoot(name)).rejects.toThrow();
      },
    );
  });
});
