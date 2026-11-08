import { execFileSync } from 'node:child_process';
import pg from 'pg';

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required. See backend/.env.example.');
  }

  const databaseUrl = new URL(url);
  const databaseName = databaseUrl.pathname.slice(1);
  if (!/^\w+_test$/.test(databaseName)) {
    throw new Error(
      `Refusing to run: '${databaseName}' does not end in _test, and the suite empties its tables.`,
    );
  }

  databaseUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: databaseUrl.toString() });
  await admin.connect();
  const existing = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [databaseName],
  );
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  }
  await admin.end();

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
