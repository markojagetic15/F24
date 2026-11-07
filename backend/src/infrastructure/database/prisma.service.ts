import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { APP_CONFIG, type AppConfig } from '../../config/app-config.js';
import { PrismaClient } from './generated/client.js';

const REACHABILITY_TIMEOUT_MS = 2000;
const CLIENT_TIMEOUT_MARGIN_MS = 1000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      adapter: new PrismaPg({
        connectionString: config.databaseUrl,
        max: config.dbPoolSize,
        connectionTimeoutMillis: config.dbConnectTimeoutMs,
        statement_timeout: config.dbQueryTimeoutMs,
        query_timeout: config.dbQueryTimeoutMs + CLIENT_TIMEOUT_MARGIN_MS,
      }),
    });
  }

  async isReachable(): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), REACHABILITY_TIMEOUT_MS);
    });
    const probe = this.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    try {
      return await Promise.race([probe, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
