import { loadWorkerConfig, parseRedisUrl, type WorkerConfig } from '@letswriteabook/config';
import type { NovelGenerationJobData } from '@letswriteabook/shared-types';
import { createLogger, type WorkerLogger } from './logger';
import { createNovelJobProcessor, type NovelGenerationJobResult } from './novel-job-processor';
import {
  connectToDatabase,
  disconnectFromDatabase,
  MongoNovelJobEventRepository,
  MongoNovelJobMetricsRepository,
  MongoNovelJobMetadataRepository,
  MongoNovelJobRepository,
} from '@letswriteabook/persistence';
import type {
  NovelJobEventRepository,
  NovelJobMetricsRepository,
  NovelJobMetadataRepository,
  NovelJobRepository,
} from '@letswriteabook/domain';
import { QueueEvents, Worker } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { NovelRealtimePublisher } from './realtime-publisher';

interface WorkerRuntime {
  readonly queueEvents: QueueEvents;
  readonly worker: Worker<NovelGenerationJobData, NovelGenerationJobResult>;
  readonly realtimePublisher?: NovelRealtimePublisher;
}

interface WorkerRepositories {
  readonly jobs: NovelJobRepository;
  readonly events: NovelJobEventRepository;
  readonly metrics: NovelJobMetricsRepository;
  readonly metadata: NovelJobMetadataRepository;
}

async function registerWorker(
  redisOptions: RedisOptions,
  config: WorkerConfig,
  repositories: WorkerRepositories,
  redisUrl: string,
  logger: WorkerLogger,
): Promise<WorkerRuntime> {
  logger.info('Starting worker runtime', {
    environment: config.nodeEnv,
    queue: config.novelQueueName,
  });

  let realtimePublisher: NovelRealtimePublisher | undefined;

  try {
    realtimePublisher = await NovelRealtimePublisher.create(redisUrl, logger);
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    logger.error('Realtime publisher unavailable; continuing without websocket broadcasting', {
      error: wrapped.message,
    });
  }

  const processor = await createNovelJobProcessor(
    config,
    logger,
    config.novelQueueName,
    repositories,
    realtimePublisher,
  );

  const worker = new Worker<NovelGenerationJobData, NovelGenerationJobResult>(
    config.novelQueueName,
    async (job) => processor.process(job),
    {
      connection: redisOptions,
      concurrency: 1,
      removeOnComplete: {
        age: 3600,
        count: 25,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    },
  );

  const queueEvents = new QueueEvents(config.novelQueueName, { connection: redisOptions });

  queueEvents.on('completed', (event: { jobId?: string | number | null }) => {
    logger.info('Job completed', { queue: config.novelQueueName, jobId: event.jobId ?? null });
  });

  queueEvents.on('failed', (event: { jobId?: string | number | null; failedReason?: string }) => {
    logger.warn('Job failed', {
      queue: config.novelQueueName,
      jobId: event.jobId ?? null,
      reason: event.failedReason ?? 'unknown',
    });
  });

  worker.on('failed', (job, error: Error) => {
    logger.error('Worker processor threw error', {
      queue: config.novelQueueName,
      jobId: job?.id,
      error: error.message,
    });
  });

  try {
    await Promise.all([worker.waitUntilReady(), queueEvents.waitUntilReady()]);

    logger.info('Worker runtime ready', {
      queue: config.novelQueueName,
    });

    return {
      worker,
      queueEvents,
      ...(realtimePublisher ? { realtimePublisher } : {}),
    } satisfies WorkerRuntime;
  } catch (error) {
    await realtimePublisher?.close().catch(() => {
      // ignore close errors during startup failure
    });
    throw error;
  }
}

async function shutdown(logger: WorkerLogger, runtime: WorkerRuntime | undefined, signal: NodeJS.Signals): Promise<void> {
  logger.warn('Received shutdown signal', { signal });

  await runtime?.worker.close(true);
  await runtime?.queueEvents.close();
  if (runtime?.realtimePublisher) {
    await runtime.realtimePublisher.close();
  }

  await disconnectFromDatabase().catch((error: unknown) => {
    logger.error('Failed to disconnect from MongoDB', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  logger.info('Worker runtime shut down gracefully');
}

export async function startWorker(): Promise<void> {
  let logger = createLogger();

  try {
    const config = loadWorkerConfig();

    logger = createLogger(config.loggerLevels);

    if (!config.redisUrl) {
      throw new Error('REDIS_URL is required to start the worker.');
    }

    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is required to start the worker.');
    }

    await connectToDatabase(config.mongoUri);

    const repositories: WorkerRepositories = {
      jobs: new MongoNovelJobRepository(),
      events: new MongoNovelJobEventRepository(),
      metrics: new MongoNovelJobMetricsRepository(),
      metadata: new MongoNovelJobMetadataRepository(),
    };

    const redisUrl = config.redisUrl;
    const redisOptions = parseRedisUrl(redisUrl) as RedisOptions;

  const runtime = await registerWorker(redisOptions, config, repositories, redisUrl, logger);

    const shutdownHandler = (signal: NodeJS.Signals) => {
      void shutdown(logger, runtime, signal).finally(() => {
        process.exitCode = 0;
      });
    };

    process.once('SIGINT', shutdownHandler);
    process.once('SIGTERM', shutdownHandler);

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to start worker', { error: wrapped.message });
    await disconnectFromDatabase().catch(() => {
      // ignore disconnect errors during startup failure
    });
    throw wrapped;
  }
}

