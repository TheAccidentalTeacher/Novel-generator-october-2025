import Redis from 'ioredis';
import {
  NOVEL_REALTIME_CHANNEL,
  encodeNovelRealtimeEvent,
  type NovelRealtimeEvent,
} from '@letswriteabook/messaging';
import type { WorkerLogger } from './logger';

export class NovelRealtimePublisher {
  private constructor(private readonly client: Redis, private readonly logger: WorkerLogger) {}

  static async create(redisUrl: string, logger: WorkerLogger): Promise<NovelRealtimePublisher> {
    const client = new Redis(redisUrl, {
      name: 'worker-realtime-publisher',
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    client.on('error', (error) => {
      logger.error('Realtime publisher Redis error', { error: error.message });
    });

    await client.connect();

    logger.info('Realtime publisher connected to Redis');

    return new NovelRealtimePublisher(client, logger);
  }

  async publish(event: NovelRealtimeEvent): Promise<void> {
    try {
      await this.client.publish(NOVEL_REALTIME_CHANNEL, encodeNovelRealtimeEvent(event));
    } catch (error) {
      this.logger.error('Failed to publish realtime event', {
        jobId: event.jobId,
        kind: event.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.error('Failed to close realtime publisher Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
