import { appConfig } from './app-config.js';

describe('appConfig', () => {
  const DATABASE_URL = 'postgresql://db';

  it('applies defaults when only the database URL is set', () => {
    expect(appConfig({ DATABASE_URL })).toEqual({
      databaseUrl: DATABASE_URL,
      port: 3001,
      dbPoolSize: 10,
      dbConnectTimeoutMs: 5000,
      dbQueryTimeoutMs: 30000,
      rateLimitPerMinute: 600,
      trustProxyHops: 0,
    });
  });

  it('reads the values that are set', () => {
    expect(
      appConfig({
        DATABASE_URL,
        PORT: '8080',
        DB_POOL_SIZE: '20',
        DB_CONNECT_TIMEOUT_MS: '1000',
        DB_QUERY_TIMEOUT_MS: '2000',
        RATE_LIMIT_PER_MINUTE: '50',
        TRUST_PROXY_HOPS: '1',
      }),
    ).toEqual({
      databaseUrl: DATABASE_URL,
      port: 8080,
      dbPoolSize: 20,
      dbConnectTimeoutMs: 1000,
      dbQueryTimeoutMs: 2000,
      rateLimitPerMinute: 50,
      trustProxyHops: 1,
    });
  });

  it('treats an empty value as not set', () => {
    expect(appConfig({ DATABASE_URL, PORT: '' }).port).toBe(3001);
  });

  it('fails without a database URL', () => {
    expect(() => appConfig({})).toThrow('DATABASE_URL');
  });
});
