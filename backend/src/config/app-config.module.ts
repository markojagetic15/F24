import { Module } from '@nestjs/common';
import { APP_CONFIG, appConfig } from './app-config.js';

@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => appConfig() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
