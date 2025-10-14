import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiConfigModule } from './config/api-config.module';
import { HealthModule } from './health/health.module';
import { NovelModule } from './novel/novel.module';
import { RealtimeModule } from './realtime/realtime.module';

const shouldIncludeNovelModule = Boolean(process.env.REDIS_URL && process.env.MONGODB_URI);

const moduleImports = [
  ConfigModule.forRoot({
    isGlobal: true,
    cache: true,
    ignoreEnvFile: true,
  }),
  ApiConfigModule,
  HealthModule,
  RealtimeModule,
  ...(shouldIncludeNovelModule ? [NovelModule] : []),
];

@Module({
  imports: moduleImports,
})
export class AppModule {}
