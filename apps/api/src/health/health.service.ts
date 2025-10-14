import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ApiConfig } from '@letswriteabook/config';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import type { DependencyStatus, HealthPayload, ReadinessPayload } from './health.types';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@Inject(API_CONFIG_TOKEN) private readonly config: ApiConfig) {}

  health(): HealthPayload {
    return {
      status: 'pass',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  async readiness(): Promise<ReadinessPayload> {
    const [mongo, redis] = await Promise.all([this.checkMongo(), this.checkRedis()]);

    return {
      ...this.health(),
      dependencies: {
        mongo,
        redis,
      },
    } satisfies ReadinessPayload;
  }

  private async checkMongo(): Promise<DependencyStatus> {
    if (!this.config.mongoUri) {
      return 'unknown';
    }

    let client: MongoClient | undefined;
    try {
      client = new MongoClient(this.config.mongoUri, { serverSelectionTimeoutMS: 1500 });
      await client.db().command({ ping: 1 });
      return 'healthy';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Mongo readiness check failed: ${message}`);
      return 'unhealthy';
    } finally {
      await client?.close();
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    if (!this.config.redisUrl) {
      return 'unknown';
    }

  const redis = new Redis(this.config.redisUrl);

    try {
      await redis.ping();
      return 'healthy';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis readiness check failed: ${message}`);
      return 'unhealthy';
    } finally {
      redis.disconnect();
    }
  }
}
