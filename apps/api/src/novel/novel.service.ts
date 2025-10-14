import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { type ApiConfig } from '@letswriteabook/config';
import { type NovelJobPayload } from '@letswriteabook/shared-types';
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import type { NovelGenerationJobData } from './types';
import {
  NOVEL_JOB_EVENT_REPOSITORY_TOKEN,
  NOVEL_JOB_METADATA_REPOSITORY_TOKEN,
  NOVEL_JOB_METRICS_REPOSITORY_TOKEN,
  NOVEL_JOB_REPOSITORY_TOKEN,
  NOVEL_QUEUE_TOKEN,
} from './novel.tokens';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import type {
  ListNovelJobEventsOptions,
  NovelJobAggregate,
  NovelJobEventRecord,
  NovelJobEventRepository,
  NovelJobMetadata,
  NovelJobMetadataRepository,
  NovelJobMetrics,
  NovelJobMetricsRepository,
  NovelJobRepository,
  NovelJobStatus,
} from '@letswriteabook/domain';

interface EnqueueNovelJobInput {
  readonly payload: NovelJobPayload;
  readonly clientRequestId?: string;
}

interface EnqueueNovelJobResult {
  readonly jobId: string;
  readonly queue: string;
}

@Injectable()
export class NovelService implements OnModuleDestroy {
  private readonly logger = new Logger(NovelService.name);
  private readonly queue: Queue<NovelGenerationJobData, Record<string, unknown>>;

  constructor(
    @Inject(API_CONFIG_TOKEN) private readonly config: ApiConfig,
    @Inject(NOVEL_QUEUE_TOKEN) queue: Queue<NovelGenerationJobData, Record<string, unknown>>,
    @Inject(NOVEL_JOB_REPOSITORY_TOKEN) private readonly repository: NovelJobRepository,
    @Inject(NOVEL_JOB_EVENT_REPOSITORY_TOKEN) private readonly eventRepository: NovelJobEventRepository,
    @Inject(NOVEL_JOB_METRICS_REPOSITORY_TOKEN) private readonly metricsRepository: NovelJobMetricsRepository,
    @Inject(NOVEL_JOB_METADATA_REPOSITORY_TOKEN) private readonly metadataRepository: NovelJobMetadataRepository,
  ) {
    if (!this.config.redisUrl) {
      throw new Error('REDIS_URL is required for queueing novel jobs.');
    }
    this.queue = queue;
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async enqueueNovelJob(input: EnqueueNovelJobInput): Promise<EnqueueNovelJobResult> {
    const jobId = input.clientRequestId?.trim() || randomUUID();
    const payload = input.payload;

    const jobOptions: JobsOptions = {
      jobId,
      removeOnComplete: {
        age: 3600,
        count: 50,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    };

    this.logger.log(`Queueing job ${jobId} on ${this.config.novelQueueName}`);

    try {
      const job = await this.queue.add(
        'novel.generate',
        {
          jobId,
          payload,
          requestedAt: new Date().toISOString(),
        },
        jobOptions,
      );

      return {
        jobId: job.id as string,
        queue: this.config.novelQueueName,
      } satisfies EnqueueNovelJobResult;
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error(String(error));

      if (/already exists/i.test(wrapped.message)) {
        throw new ConflictException('A job with that clientRequestId already exists.');
      }

      this.logger.error(`Failed to enqueue job: ${wrapped.message}`);
      throw new ServiceUnavailableException('Failed to enqueue the novel generation job.');
    }
  }

  async getJob(jobId: string): Promise<NovelJobAggregate> {
    return this.requireJob(jobId);
  }

  async listRecentJobs(options: { limit?: number; statuses?: ReadonlyArray<NovelJobStatus> } = {}): Promise<
    ReadonlyArray<NovelJobAggregate>
  > {
    const payload: { limit?: number; statuses?: ReadonlyArray<NovelJobStatus> } = {};

    if (typeof options.limit === 'number') {
      payload.limit = options.limit;
    }

    if (options.statuses && options.statuses.length > 0) {
      payload.statuses = options.statuses;
    }

    return this.repository.listActiveJobs(payload);
  }

  async listJobEvents(jobId: string, options: ListNovelJobEventsOptions = {}): Promise<ReadonlyArray<NovelJobEventRecord>> {
    await this.requireJob(jobId);
    return this.eventRepository.list(jobId, options);
  }

  async getJobMetrics(jobId: string): Promise<NovelJobMetrics | null> {
    await this.requireJob(jobId);
    return this.metricsRepository.getMetrics(jobId);
  }

  async getJobMetadata(jobId: string): Promise<NovelJobMetadata | null> {
    await this.requireJob(jobId);
    return this.metadataRepository.getMetadata(jobId);
  }

  private async requireJob(jobId: string): Promise<NovelJobAggregate> {
    const job = await this.repository.findByJobId(jobId);
    if (!job) {
      throw new NotFoundException(`Job with id "${jobId}" was not found.`);
    }

    return job;
  }
}
