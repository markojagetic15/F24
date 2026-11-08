import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Folders API', () => {
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
  const statusesOf = (responses: { status: number }[]) =>
    responses.map((response) => response.status).sort((a, b) => a - b);
  const namesOf = (items: { name: string }[]) => items.map((f) => f.name);
  const idsOf = (items: { id: string }[]) => items.map((f) => f.id);

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

  describe('POST /api/folders', () => {
    it('creates root folders and subfolders', async () => {
      const root = await api()
        .post('/api/folders')
        .send({ name: 'docs' })
        .expect(201);
      expect(root.body).toMatchObject({ name: 'docs', parentId: null });

      const child = await api()
        .post('/api/folders')
        .send({ name: 'invoices', parentId: root.body.id })
        .expect(201);
      expect(child.body.parentId).toBe(root.body.id);
    });

    it('returns 409 for a duplicate at the root, where the parent is NULL', async () => {
      await createFolder('docs');
      const response = await api()
        .post('/api/folders')
        .send({ name: 'docs' })
        .expect(409);
      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'EntryNameConflictError',
      });
    });

    it('returns 409 for a duplicate under the same parent', async () => {
      const parent = await createFolder('docs');
      await createFolder('a', parent.id);
      await api()
        .post('/api/folders')
        .send({ name: 'a', parentId: parent.id })
        .expect(409);
    });

    it('allows one name under different parents', async () => {
      const first = await createFolder('first');
      const second = await createFolder('second');
      await createFolder('same', first.id);
      await createFolder('same', second.id);
    });

    it('returns 404 when the parent does not exist', async () => {
      const response = await api()
        .post('/api/folders')
        .send({ name: 'a', parentId: randomUUID() })
        .expect(404);
      expect(response.body.error).toBe('EntryNotFoundError');
    });

    it('creates exactly one folder when identical requests race', async () => {
      const responses = await Promise.all(
        Array.from({ length: 20 }, () =>
          api().post('/api/folders').send({ name: 'race' }),
        ),
      );
      expect(statusesOf(responses)).toEqual([
        201,
        ...Array<number>(19).fill(409),
      ]);
      expect(await prisma.folder.count()).toBe(1);
    });

    it.each([
      ['missing name', {}],
      ['null name', { name: null }],
      ['numeric name', { name: 42 }],
      ['array name', { name: ['a'] }],
      ['object name', { name: { contains: 'a' } }],
      ['blank name', { name: '   ' }],
      ['path traversal', { name: '../../etc' }],
      ['reserved name', { name: '..' }],
      ['NUL byte', { name: 'a\u0000b' }],
      ['lone surrogate', { name: 'a\ud800b' }],
      ['name over the limit', { name: 'a'.repeat(249) }],
      [
        'empty parent id, which must not mean the root',
        { name: 'a', parentId: '' },
      ],
      ['malformed parent id', { name: 'a', parentId: "1' OR '1'='1" }],
      ['unknown field', { name: 'a', id: randomUUID() }],
    ])('returns 400 for %s and stores nothing', async (_label, body) => {
      await api().post('/api/folders').send(body).expect(400);
      expect(await prisma.folder.count()).toBe(0);
    });

    it('accepts a name of exactly 248 characters', async () => {
      const name = 'a'.repeat(248);
      const folder = await createFolder(name);

      const response = await api().get(`/api/folders/${folder.id}`).expect(200);
      expect(response.body.name).toBe(name);
    });

    it('returns 400 for malformed JSON', async () => {
      await api()
        .post('/api/folders')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);
    });

    it('stores SQL and markup in names as plain text', async () => {
      const name = `'; DROP TABLE folders;-- <b>bold`;
      const created = await api()
        .post('/api/folders')
        .send({ name })
        .expect(201);
      expect(created.body.name).toBe(name);
      expect(await prisma.folder.count()).toBe(1);
    });
  });

  describe('GET /api/folders', () => {
    it('lists only direct children, newest first', async () => {
      const parent = await createFolder('parent');
      const child = await createFolder('b', parent.id);
      // Ids are time-ordered to the millisecond
      await new Promise((resolve) => setTimeout(resolve, 2));
      await createFolder('a', parent.id);
      await createFolder('nested', child.id);

      const response = await api()
        .get('/api/folders')
        .query({ parentId: parent.id })
        .expect(200);
      expect(namesOf(response.body.items)).toEqual(['a', 'b']);
      expect(response.body.nextCursor).toBeNull();
    });

    it('lists the root when no parent is given', async () => {
      const parent = await createFolder('parent');
      await createFolder('child', parent.id);

      const response = await api().get('/api/folders').expect(200);
      expect(namesOf(response.body.items)).toEqual(['parent']);
    });

    it('walks every page without gaps or repeats', async () => {
      const names = ['a', 'b', 'c', 'd', 'e'];
      const folders = await Promise.all(
        names.map((name) => createFolder(name)),
      );

      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const response: request.Response = await api()
          .get('/api/folders')
          .query({ limit: 2, ...(cursor ? { cursor } : {}) })
          .expect(200);
        seen.push(...idsOf(response.body.items));
        cursor = response.body.nextCursor;
      } while (cursor);

      expect(seen).toEqual(idsOf(folders).sort().reverse());
    });

    it('returns 404 for a parent that does not exist', async () => {
      await api()
        .get('/api/folders')
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
      ['a name used as the cursor', 'cursor=docs'],
      ['unknown parameter', 'admin=true'],
    ])('returns 400 for %s', async (_label, query) => {
      await api().get(`/api/folders?${query}`).expect(400);
    });
  });

  describe('GET /api/folders/:id', () => {
    it('returns the folder with its parent', async () => {
      const parent = await createFolder('parent');
      const child = await createFolder('child', parent.id);

      const response = await api().get(`/api/folders/${child.id}`).expect(200);
      expect(response.body).toMatchObject({
        id: child.id,
        name: 'child',
        parentId: parent.id,
      });
    });

    it('returns a null parent for a folder at the root', async () => {
      const folder = await createFolder('top');

      const response = await api().get(`/api/folders/${folder.id}`).expect(200);
      expect(response.body).toMatchObject({ id: folder.id, parentId: null });
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await api().get(`/api/folders/${randomUUID()}`).expect(404);
      await api().get('/api/folders/not-a-uuid').expect(400);
    });
  });

  describe('DELETE /api/folders/:id', () => {
    it('deletes the whole subtree and leaves everything else', async () => {
      const doomed = await createFolder('doomed');
      const child = await createFolder('child', doomed.id);
      await createFolder('grandchild', child.id);
      await createFolder('kept');

      await api().delete(`/api/folders/${doomed.id}`).expect(204);

      const remaining = await prisma.folder.findMany();
      expect(namesOf(remaining)).toEqual(['kept']);
    });

    it('frees the name for reuse', async () => {
      const folder = await createFolder('docs');
      await api().delete(`/api/folders/${folder.id}`).expect(204);
      await createFolder('docs');
    });

    it('returns 404 for an unknown id and 400 for a malformed one', async () => {
      await api().delete(`/api/folders/${randomUUID()}`).expect(404);
      await api().delete('/api/folders/not-a-uuid').expect(400);
    });

    it('lets exactly one of two racing deletes succeed', async () => {
      const folder = await createFolder('race');
      const responses = await Promise.all([
        api().delete(`/api/folders/${folder.id}`),
        api().delete(`/api/folders/${folder.id}`),
      ]);
      expect(statusesOf(responses)).toEqual([204, 404]);
    });

    it('leaves no orphans when creates race with deleting their parent', async () => {
      const parent = await createFolder('parent');
      const responses = await Promise.all([
        ...Array.from({ length: 20 }, (_, i) =>
          api()
            .post('/api/folders')
            .send({ name: `a${i}`, parentId: parent.id }),
        ),
        api().delete(`/api/folders/${parent.id}`),
        ...Array.from({ length: 20 }, (_, i) =>
          api()
            .post('/api/folders')
            .send({ name: `b${i}`, parentId: parent.id }),
        ),
      ]);

      for (const response of responses) {
        expect([201, 204, 404]).toContain(response.status);
      }
      expect(await prisma.folder.count()).toBe(0);
    });
  });

  describe('folder indexes', () => {
    it('serves a folder listing from the parent index', async () => {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
        return tx.$queryRaw<
          { 'QUERY PLAN': string }[]
        >`EXPLAIN SELECT id FROM folders WHERE parent_id = ${randomUUID()}::uuid ORDER BY id DESC LIMIT 51`;
      });
      expect(rows.map((row) => row['QUERY PLAN']).join('\n')).toContain(
        'folders_parent_id_id_idx',
      );
    });
  });

  describe('database constraints, bypassing the API', () => {
    const insertRoot = (name: string) =>
      prisma.$executeRaw`INSERT INTO folders (id, name) VALUES (${randomUUID()}::uuid, ${name})`;

    it('rejects duplicate root folders', async () => {
      await insertRoot('same');
      await expect(insertRoot('same')).rejects.toThrow();
    });

    it.each(['', '.', '..', 'a/b', 'a\\b', 'a\nb'])(
      'rejects the invalid name %j',
      async (name) => {
        await expect(insertRoot(name)).rejects.toThrow();
      },
    );

    it('rejects a folder that is its own parent', async () => {
      const id = randomUUID();
      await expect(
        prisma.$executeRaw`INSERT INTO folders (id, name, parent_id) VALUES (${id}::uuid, 'loop', ${id}::uuid)`,
      ).rejects.toThrow();
    });
  });
});
