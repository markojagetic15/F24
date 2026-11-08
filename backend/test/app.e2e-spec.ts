import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('HTTP application', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());
  const namesOf = (items: { name: string }[]) => items.map((f) => f.name);
  const numberedNames = (count: number) =>
    Array.from({ length: count }, (_, i) => `f${String(i).padStart(3, '0')}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE files, folders`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('routing', () => {
    it.each(['/files', '/folders', '/'])('does not serve %s', async (path) => {
      await api().get(path).expect(404);
    });

    it('returns 404 for an unknown route under the prefix', async () => {
      const response = await api().get('/api/nothing-here').expect(404);
      expect(response.body).toMatchObject({ statusCode: 404 });
    });

    it.each(['/api/files/top', '/api/files/search'])(
      'rejects DELETE %s as a malformed id',
      async (path) => {
        await api().delete(path).expect(400);
      },
    );
  });

  describe('security headers', () => {
    it('sets the helmet headers and hides the framework', async () => {
      const response = await api().get('/api/files').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toEqual(
        expect.any(String),
      );
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('sets them on error responses too', async () => {
      const response = await api().get('/api/files?limit=0').expect(400);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('request validation', () => {
    it('explains which field failed', async () => {
      const response = await api()
        .post('/api/files')
        .send({ name: '..' })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(response.body.message).toEqual([
        expect.stringContaining('name must be 1-255 characters'),
      ]);
    });

    it('names an unknown field', async () => {
      const response = await api()
        .post('/api/folders')
        .send({ name: 'a', admin: true })
        .expect(400);

      expect(response.body.message).toEqual([
        'property admin should not exist',
      ]);
    });

    it('returns 413 for a body over the size limit', async () => {
      await api()
        .post('/api/files')
        .send({ name: 'a'.repeat(200000) })
        .expect(413);
    });
  });

  describe('responses', () => {
    it('returns a file with exactly its public fields', async () => {
      const response = await api()
        .post('/api/files')
        .send({ name: 'a.txt' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'a.txt',
        parentId: null,
        createdAt: expect.any(String),
      });
      expect(new Date(response.body.createdAt).toISOString()).toBe(
        response.body.createdAt,
      );
    });

    it('returns a folder with exactly its public fields', async () => {
      const response = await api()
        .post('/api/folders')
        .send({ name: 'docs' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'docs',
        parentId: null,
        createdAt: expect.any(String),
      });
    });

    it('returns no body from a delete', async () => {
      const file = await api().post('/api/files').send({ name: 'a.txt' });

      const response = await api()
        .delete(`/api/files/${file.body.id}`)
        .expect(204);

      expect(response.text).toBe('');
    });
  });

  describe('names and parents', () => {
    it('accepts a file name of exactly 255 characters', async () => {
      const name = 'a'.repeat(255);
      const response = await api()
        .post('/api/files')
        .send({ name })
        .expect(201);

      expect(response.body.name).toBe(name);
    });

    it.each(['files', 'folders'])(
      'treats an explicit null parent as the root for %s',
      async (resource) => {
        const response = await api()
          .post(`/api/${resource}`)
          .send({ name: 'a', parentId: null })
          .expect(201);

        expect(response.body.parentId).toBeNull();
      },
    );

    it('stores non-ASCII names unchanged', async () => {
      const name = 'čaj 😀.txt';
      await api().post('/api/files').send({ name }).expect(201);

      const response = await api().get('/api/files').expect(200);
      expect(namesOf(response.body.items)).toEqual([name]);
    });

    it('keeps files and folders in separate listings', async () => {
      await api().post('/api/files').send({ name: 'shared' }).expect(201);
      await api().post('/api/folders').send({ name: 'other' }).expect(201);

      const files = await api().get('/api/files').expect(200);
      const folders = await api().get('/api/folders').expect(200);

      expect(namesOf(files.body.items)).toEqual(['shared']);
      expect(namesOf(folders.body.items)).toEqual(['other']);
    });
  });

  describe('page sizes', () => {
    describe.each([
      [
        'files',
        (names: string[]) =>
          prisma.file.createMany({ data: names.map((name) => ({ name })) }),
      ],
      [
        'folders',
        (names: string[]) =>
          prisma.folder.createMany({ data: names.map((name) => ({ name })) }),
      ],
    ])('GET /api/%s', (resource, seed) => {
      it('returns 50 items by default', async () => {
        const names = numberedNames(51);
        await seed(names);

        const response = await api().get(`/api/${resource}`).expect(200);

        expect(namesOf(response.body.items)).toEqual(names.slice(0, 50));
        expect(response.body.nextCursor).toBe(names[49]);
      });

      it('accepts the smallest limit', async () => {
        await seed(['a', 'b']);

        const response = await api()
          .get(`/api/${resource}`)
          .query({ limit: 1 })
          .expect(200);

        expect(namesOf(response.body.items)).toEqual(['a']);
      });

      it('accepts the largest limit', async () => {
        const names = numberedNames(201);
        await seed(names);

        const response = await api()
          .get(`/api/${resource}`)
          .query({ limit: 200 })
          .expect(200);

        expect(response.body.items).toHaveLength(200);
        expect(response.body.nextCursor).toBe(names[199]);
      });
    });
  });
});
