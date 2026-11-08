import { type INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';

export function configureApp(app: INestApplication): void {
  // The rate limit is per client IP, which sits behind this many proxies.
  // Above the real number, clients could forge it with X-Forwarded-For
  (app as NestExpressApplication).set(
    'trust proxy',
    app.get<AppConfig>(APP_CONFIG).trustProxyHops,
  );
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
