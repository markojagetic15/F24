import { randomUUID } from 'node:crypto';
import { createServer, type Server, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { APP_CONFIG, appConfig } from '../src/config/app-config.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const UNAVAILABLE_BODY = {
  statusCode: 503,
  error: 'DatabaseUnavailable',
  message: 'The database is temporarily unavailable. Please try again.',
};

describe('database failures', () => {
  let app: INestApplication<App> | undefined;

  const api = () => request(app!.getHttpServer());
  const listen = (server: Server) =>
    new Promise<number>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve((server.address() as AddressInfo).port);
      });
    });
  const close = (server: Server) =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  const urlFor = (port: number) => `postgresql://u:secret@127.0.0.1:${port}/db`;
  const unusedPort = async () => {
    const server = createServer();
    const port = await listen(server);
    await close(server);
    return port;
  };
  const start = async (
    overrides: { databaseUrl?: string; dbQueryTimeoutMs?: number } = {},
    fileRepository?: object,
  ) => {
    let builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue({
        ...appConfig(),
        dbConnectTimeoutMs: 200,
        ...overrides,
      });
    if (fileRepository) {
      builder = builder
        .overrideProvider('FILE_REPOSITORY')
        .useValue(fileRepository);
    }
    const moduleRef = await builder.compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  describe('when the database refuses connections', () => {
    beforeEach(async () => {
      await start({ databaseUrl: urlFor(await unusedPort()) });
    });

    it.each([
      ['GET', '/api/files', undefined],
      ['GET', '/api/files/search?name=a.txt', undefined],
      ['GET', '/api/files/top?prefix=a', undefined],
      ['GET', '/api/folders', undefined],
      ['GET', `/api/folders/${randomUUID()}`, undefined],
      ['POST', '/api/files', { name: 'a.txt' }],
      ['POST', '/api/folders', { name: 'docs' }],
      ['DELETE', `/api/files/${randomUUID()}`, undefined],
      ['DELETE', `/api/folders/${randomUUID()}`, undefined],
    ] as const)(
      'returns 503 without internal details for %s %s',
      async (method, path, body) => {
        const call =
          method === 'GET'
            ? api().get(path)
            : method === 'POST'
              ? api().post(path).send(body)
              : api().delete(path);

        const response = await call.expect(503);
        expect(response.body).toEqual(UNAVAILABLE_BODY);
      },
    );

    it('still answers requests that never reach the database', async () => {
      await api().get('/api/files?limit=0').expect(400);
      await api().get('/api/files/top').expect(400);
      await api().delete('/api/files/not-a-uuid').expect(400);
      await api().get('/api/nothing-here').expect(404);
      await api()
        .post('/api/files')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);
      await api()
        .post('/api/files')
        .send({ name: 'a'.repeat(200000) })
        .expect(413);
    });
  });

  describe('when the database accepts connections but never answers', () => {
    const sockets = new Set<Socket>();
    const silent = createServer((socket) => {
      sockets.add(socket);
      socket.on('error', () => undefined);
    });

    afterAll(async () => {
      for (const socket of sockets) socket.destroy();
      await close(silent);
    });

    it('returns 503 instead of hanging', async () => {
      await start({ databaseUrl: urlFor(await listen(silent)) });

      const started = Date.now();
      const response = await api().get('/api/files').expect(503);

      expect(response.body).toEqual(UNAVAILABLE_BODY);
      expect(Date.now() - started).toBeLessThan(3000);
    });
  });

  describe('when the database is healthy', () => {
    it('keeps 500 for other failures and hides their details', async () => {
      const failing = {
        list: () => Promise.reject(new Error('secret internal detail')),
      };
      await start({}, failing);

      const response = await api().get('/api/files').expect(500);

      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('stops a query at the time limit and stays usable', async () => {
      await start({ dbQueryTimeoutMs: 200 });
      const prisma = app!.get(PrismaService);

      const started = Date.now();
      await expect(prisma.$queryRaw`SELECT pg_sleep(5)`).rejects.toThrow();
      expect(Date.now() - started).toBeLessThan(3000);

      await expect(prisma.isReachable()).resolves.toBe(true);
    });

    it('rolls back a write stopped at the time limit', async () => {
      await start({ dbQueryTimeoutMs: 200 });
      const prisma = app!.get(PrismaService);
      const name = `timeout-${randomUUID()}`;

      await expect(
        prisma.$executeRaw`WITH slow AS (SELECT pg_sleep(2)) INSERT INTO files (id, name) SELECT ${randomUUID()}::uuid, ${name} FROM slow`,
      ).rejects.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 2500));
      expect(await prisma.file.count({ where: { name } })).toBe(0);
    });
  });
});
