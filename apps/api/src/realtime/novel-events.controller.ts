import { Controller, Get } from '@nestjs/common';
import { NovelEventsGateway, type NovelEventsGatewayMetrics } from './novel-events.gateway';

@Controller('internal/realtime')
export class NovelEventsController {
  constructor(private readonly gateway: NovelEventsGateway) {}

  @Get('metrics')
  getMetrics(): NovelEventsGatewayMetrics {
    return this.gateway.getGatewayMetrics();
  }
}
