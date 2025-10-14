import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../config/api-config.module';
import { NovelEventsGateway } from './novel-events.gateway';
import { NovelEventsRedisSubscriber } from './novel-events.redis-subscriber';
import { NovelEventsController } from './novel-events.controller';

@Module({
  imports: [ApiConfigModule],
  controllers: [NovelEventsController],
  providers: [NovelEventsGateway, NovelEventsRedisSubscriber],
  exports: [NovelEventsGateway],
})
export class RealtimeModule {}
