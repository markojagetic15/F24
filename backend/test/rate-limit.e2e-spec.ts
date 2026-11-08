import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { APP_CONFIG, appConfig } from '../src/config/app-config.js';
import { configureApp } from '../src/configure-app.js';

const LIMIT = 3;

describe('rate limiting', () => {
  let app: INestApplication<App> | undefined;

  const start = async (trustProxyHops: number) => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue({ ...appConfig(), rateLimitPerMinute: LIMIT, trustProxyHops })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
  };
  const get = (path = '/api/folders', forwardedFor?: string) => {
    const call = request(app!.getHttpServer()).get(path);
    return forwardedFor ? call.set('X-Forwarded-For', forwardedFor) : call;
  };
  const useUpLimit = async (forwardedFor?: string) => {
    for (let i = 0; i < LIMIT; i += 1) {
      await get('/api/folders', forwardedFor).expect(200);
    }
  };

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns 429 with a retry time once the limit is used up', async () => {
    await start(0);
    await useUpLimit();

    const response = await get().expect(429);

    expect(response.body).toEqual({
      statusCode: 429,
      message: 'Too many requests. Please try again later.',
    });
    expect(response.headers['retry-after']).toEqual(expect.any(String));
  });

  it('counts rejected requests too', async () => {
    await start(0);
    for (let i = 0; i < LIMIT; i += 1) {
      await get('/api/files?limit=0').expect(400);
    }

    await get().expect(429);
  });

  it('ignores X-Forwarded-For when not behind a proxy', async () => {
    await start(0);
    for (let i = 0; i < LIMIT; i += 1) {
      await get('/api/folders', `198.51.100.${i}`).expect(200);
    }

    await get('/api/folders', '198.51.100.99').expect(429);
  });

  describe('behind one proxy', () => {
    beforeEach(async () => {
      await start(1);
    });

    it('limits each client separately', async () => {
      await useUpLimit('198.51.100.1');

      await get('/api/folders', '198.51.100.1').expect(429);
      await get('/api/folders', '198.51.100.2').expect(200);
    });

    it('cannot be escaped by forging earlier X-Forwarded-For entries', async () => {
      for (let i = 0; i < LIMIT; i += 1) {
        await get('/api/folders', `203.0.113.${i}, 198.51.100.1`).expect(200);
      }

      await get('/api/folders', '203.0.113.99, 198.51.100.1').expect(429);
    });
  });
});
