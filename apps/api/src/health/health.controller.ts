import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthPayload, ReadinessPayload } from './health.types';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getHealth(): HealthPayload {
    return this.healthService.health();
  }

  @Get('ready')
  async readiness(): Promise<ReadinessPayload> {
    return this.healthService.readiness();
  }
}
