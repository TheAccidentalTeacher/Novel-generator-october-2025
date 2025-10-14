import { parseRedisUrl, type ApiConfig } from '@letswriteabook/config';
import { Queue } from 'bullmq';
import type { Queue as QueueType } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import type { NovelGenerationJobData } from './types';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import type {
  NovelJobEventRepository,
  NovelJobMetadataRepository,
  NovelJobMetricsRepository,
  NovelJobRepository,
} from '@letswriteabook/domain';
import {
  connectToDatabase,
  disconnectFromDatabase,
  MongoNovelJobEventRepository,
  MongoNovelJobMetadataRepository,
  MongoNovelJobMetricsRepository,
  MongoNovelJobRepository,
} from '@letswriteabook/persistence';

export const NOVEL_QUEUE_TOKEN = Symbol('NOVEL_QUEUE_TOKEN');
export const NOVEL_JOB_REPOSITORY_TOKEN = Symbol('NOVEL_JOB_REPOSITORY_TOKEN');
export const NOVEL_JOB_EVENT_REPOSITORY_TOKEN = Symbol('NOVEL_JOB_EVENT_REPOSITORY_TOKEN');
export const NOVEL_JOB_METRICS_REPOSITORY_TOKEN = Symbol('NOVEL_JOB_METRICS_REPOSITORY_TOKEN');
export const NOVEL_JOB_METADATA_REPOSITORY_TOKEN = Symbol('NOVEL_JOB_METADATA_REPOSITORY_TOKEN');

@Injectable()
class MongoConnectionLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(MongoConnectionLifecycle.name);

  async onApplicationShutdown(): Promise<void> {
    try {
      await disconnectFromDatabase();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to disconnect from MongoDB: ${message}`);
    }
  }
}

export const novelProviders: Provider[] = [
  {
    provide: NOVEL_QUEUE_TOKEN,
    inject: [API_CONFIG_TOKEN],
    useFactory: (config: ApiConfig): QueueType<NovelGenerationJobData, Record<string, unknown>> => {
      if (!config.redisUrl) {
        throw new Error('REDIS_URL must be defined to create the novel queue.');
      }

      const connection = parseRedisUrl(config.redisUrl) as RedisOptions;
      return new Queue<NovelGenerationJobData, Record<string, unknown>>(config.novelQueueName, {
        connection,
      });
    },
  },
  {
    provide: NOVEL_JOB_REPOSITORY_TOKEN,
    inject: [API_CONFIG_TOKEN],
    useFactory: async (config: ApiConfig): Promise<NovelJobRepository> => {
      const { mongoUri } = config;
      if (!mongoUri) {
        throw new Error('MONGODB_URI must be defined to initialize the novel job repository.');
      }

      await connectToDatabase(mongoUri);
      return new MongoNovelJobRepository();
    },
  },
  {
    provide: NOVEL_JOB_EVENT_REPOSITORY_TOKEN,
    inject: [API_CONFIG_TOKEN],
    useFactory: async (config: ApiConfig): Promise<NovelJobEventRepository> => {
      const { mongoUri } = config;
      if (!mongoUri) {
        throw new Error('MONGODB_URI must be defined to initialize the novel job event repository.');
      }

      await connectToDatabase(mongoUri);
      return new MongoNovelJobEventRepository();
    },
  },
  {
    provide: NOVEL_JOB_METRICS_REPOSITORY_TOKEN,
    inject: [API_CONFIG_TOKEN],
    useFactory: async (config: ApiConfig): Promise<NovelJobMetricsRepository> => {
      const { mongoUri } = config;
      if (!mongoUri) {
        throw new Error('MONGODB_URI must be defined to initialize the novel job metrics repository.');
      }

      await connectToDatabase(mongoUri);
      return new MongoNovelJobMetricsRepository();
    },
  },
  {
    provide: NOVEL_JOB_METADATA_REPOSITORY_TOKEN,
    inject: [API_CONFIG_TOKEN],
    useFactory: async (config: ApiConfig): Promise<NovelJobMetadataRepository> => {
      const { mongoUri } = config;
      if (!mongoUri) {
        throw new Error('MONGODB_URI must be defined to initialize the novel job metadata repository.');
      }

      await connectToDatabase(mongoUri);
      return new MongoNovelJobMetadataRepository();
    },
  },
  MongoConnectionLifecycle,
];
