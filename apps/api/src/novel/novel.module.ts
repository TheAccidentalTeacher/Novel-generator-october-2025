import { Module } from '@nestjs/common';
import { NovelController } from './novel.controller';
import { NovelService } from './novel.service';
import { novelProviders } from './novel.tokens';

@Module({
  controllers: [NovelController],
  providers: [NovelService, ...novelProviders],
  exports: [NovelService],
})
export class NovelModule {}
