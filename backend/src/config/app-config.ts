export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  port: number;
  databaseUrl: string;
  dbPoolSize: number;
  dbConnectTimeoutMs: number;
  dbQueryTimeoutMs: number;
}

export function appConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  return {
    databaseUrl,
    port: Number(env.PORT || 3001),
    dbPoolSize: Number(env.DB_POOL_SIZE || 10),
    dbConnectTimeoutMs: Number(env.DB_CONNECT_TIMEOUT_MS || 5000),
    dbQueryTimeoutMs: Number(env.DB_QUERY_TIMEOUT_MS || 30000),
  };
}
