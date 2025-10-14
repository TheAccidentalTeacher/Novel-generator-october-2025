import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis, { type Redis as RedisClient } from 'ioredis';
import type { ApiConfig } from '@letswriteabook/config';
import { parseRedisUrl } from '@letswriteabook/config';
import {
  NOVEL_REALTIME_CHANNEL,
  NOVEL_REALTIME_PROTOCOL_VERSION,
  decodeNovelRealtimeEvent,
  type NovelRealtimeEvent,
} from '@letswriteabook/messaging';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import { NovelEventsGateway } from './novel-events.gateway';

@Injectable()
export class NovelEventsRedisSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NovelEventsRedisSubscriber.name);
  private subscriber?: RedisClient;

  constructor(
    @Inject(API_CONFIG_TOKEN) private readonly config: ApiConfig,
    private readonly gateway: NovelEventsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.redisUrl) {
      this.logger.warn('REDIS_URL is not configured. Realtime updates are disabled.');
      return;
    }

    const redisOptions = parseRedisUrl(this.config.redisUrl);
    this.logger.log(`Connecting to Redis realtime channel at ${redisOptions.host}:${redisOptions.port}`);
    this.subscriber = new Redis(this.config.redisUrl, {
      name: 'api-realtime-subscriber',
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      retryStrategy: (attempt: number) => {
        const backoff = Math.min(1000 * 2 ** (attempt - 1), 15000);
        this.logger.warn(`Retrying Redis realtime subscriber connection (attempt ${attempt}, delay ${backoff}ms)`);
        return backoff;
      },
    });

    this.subscriber.on('error', (error: Error) => {
      this.logger.error('Redis subscriber error', error.stack ?? error.message);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Connected to Redis for realtime subscriber');
    });

    this.subscriber.on('reconnecting', () => {
      this.logger.warn('Reconnecting Redis realtime subscriber');
    });

    this.subscriber.on('end', () => {
      this.logger.warn('Redis realtime subscriber connection closed');
    });

    await this.subscriber.connect();

    await this.subscriber.subscribe(NOVEL_REALTIME_CHANNEL);
    this.subscriber.on('message', (_channel: string, message: string) => this.handleMessage(message));

    this.logger.log(`Subscribed to Redis channel ${NOVEL_REALTIME_CHANNEL}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.subscriber.quit();
    } catch (error) {
      this.logger.error('Error shutting down Redis subscriber', (error as Error).message);
    }
  }

  private handleMessage(message: string): void {
    let event: NovelRealtimeEvent;
    try {
      event = decodeNovelRealtimeEvent(message);
    } catch (error) {
      this.logger.error('Received invalid realtime message', (error as Error).message);
      return;
    }

      if (event.version !== NOVEL_REALTIME_PROTOCOL_VERSION) {
        this.logger.warn(
          `Realtime payload version mismatch (expected ${NOVEL_REALTIME_PROTOCOL_VERSION}, received ${event.version})`,
        );
      }

    this.gateway.broadcast(event);
  }
}
