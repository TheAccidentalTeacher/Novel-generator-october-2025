/// <reference types="jest" />
import { ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ApiConfig } from '@letswriteabook/config';
import type { Queue } from 'bullmq';
import { NovelService } from './novel.service';
import {
  NOVEL_JOB_EVENT_REPOSITORY_TOKEN,
  NOVEL_JOB_METADATA_REPOSITORY_TOKEN,
  NOVEL_JOB_METRICS_REPOSITORY_TOKEN,
  NOVEL_JOB_REPOSITORY_TOKEN,
  NOVEL_QUEUE_TOKEN,
} from './novel.tokens';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import type { NovelGenerationJobData } from './types';
import type {
  NovelJobAggregate,
  NovelJobEventRecord,
  NovelJobEventRepository,
  NovelJobMetadata,
  NovelJobMetadataRepository,
  NovelJobMetrics,
  NovelJobMetricsRepository,
  NovelJobRepository,
} from '@letswriteabook/domain';

const basePayload = {
  title: 'Journey Beyond',
  premise: 'A reluctant hero is pulled into an interstellar conflict.',
  genre: 'Science Fiction',
  subgenre: 'Space Opera',
  targetWordCount: 85_000,
  targetChapters: 24,
  humanLikeWriting: true,
} as const;

const baseConfig: ApiConfig = {
  nodeEnv: 'development',
  port: 3001,
  mongoUri: undefined,
  redisUrl: 'redis://localhost:6379',
  openAiApiKey: undefined,
  socketClientOrigin: 'http://localhost:5173',
  sentryDsn: undefined,
  novelQueueName: 'novel-generation',
  socketMaxConnections: 0,
  socketMaxConnectionsPerOrigin: 0,
  socketMaxSubscriptionsPerClient: 20,
  socketIdleTimeoutMs: 5 * 60 * 1000,
  loggerLevels: ['log', 'error', 'warn'],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createAggregate(overrides: Partial<NovelJobAggregate> = {}): NovelJobAggregate {
  return {
    id: 'job-123',
    payload: basePayload,
    requestedAt: '2024-01-01T00:00:00.000Z',
    queue: 'novel-generation',
    status: 'running',
    outline: [],
    chapters: [],
    snapshot: {
      events: [],
      domainEvents: [],
    },
    failures: [],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  } satisfies NovelJobAggregate;
}

async function createService(overrides?: {
  addMock?: jest.Mock;
  repository?: Partial<NovelJobRepository>;
  eventRepository?: Partial<NovelJobEventRepository>;
  metricsRepository?: Partial<NovelJobMetricsRepository>;
  metadataRepository?: Partial<NovelJobMetadataRepository>;
}) {
  const addMock =
    overrides?.addMock ??
    jest.fn(async (_name: string, data: NovelGenerationJobData) => ({
      id: data.jobId,
    }));

  const closeMock = jest.fn(async () => undefined);

  const repositoryMock: jest.Mocked<NovelJobRepository> = {
    initializeJob: jest.fn(),
    saveGenerationResult: jest.fn(),
    recordFailure: jest.fn(),
    findByJobId: jest.fn(),
    listActiveJobs: jest.fn(),
    ...(overrides?.repository ?? {}),
  } as jest.Mocked<NovelJobRepository>;

  const eventRepositoryMock: jest.Mocked<NovelJobEventRepository> = {
    append: jest.fn(),
    list: jest.fn().mockResolvedValue([] as NovelJobEventRecord[]),
    ...(overrides?.eventRepository ?? {}),
  } as jest.Mocked<NovelJobEventRepository>;

  const metricsRepositoryMock: jest.Mocked<NovelJobMetricsRepository> = {
    incrementCosts: jest.fn(),
    incrementTokens: jest.fn(),
    updateLatency: jest.fn(),
    reset: jest.fn(),
    getMetrics: jest.fn().mockResolvedValue(null as NovelJobMetrics | null),
    ...(overrides?.metricsRepository ?? {}),
  } as jest.Mocked<NovelJobMetricsRepository>;

  const metadataRepositoryMock: jest.Mocked<NovelJobMetadataRepository> = {
    upsertStoryBible: jest.fn(),
    addContinuityAlert: jest.fn(),
    resolveContinuityAlert: jest.fn(),
    appendAiDecision: jest.fn(),
    getMetadata: jest.fn().mockResolvedValue(null as NovelJobMetadata | null),
    ...(overrides?.metadataRepository ?? {}),
  } as jest.Mocked<NovelJobMetadataRepository>;

  const moduleRef = await Test.createTestingModule({
    providers: [
      NovelService,
      {
        provide: API_CONFIG_TOKEN,
        useValue: baseConfig,
      },
      {
        provide: NOVEL_QUEUE_TOKEN,
        useValue: {
          add: addMock,
          close: closeMock,
        } as unknown as Queue<NovelGenerationJobData, Record<string, unknown>>,
      },
      {
        provide: NOVEL_JOB_REPOSITORY_TOKEN,
        useValue: repositoryMock,
      },
      {
        provide: NOVEL_JOB_EVENT_REPOSITORY_TOKEN,
        useValue: eventRepositoryMock,
      },
      {
        provide: NOVEL_JOB_METRICS_REPOSITORY_TOKEN,
        useValue: metricsRepositoryMock,
      },
      {
        provide: NOVEL_JOB_METADATA_REPOSITORY_TOKEN,
        useValue: metadataRepositoryMock,
      },
    ],
  }).compile();

  const service = moduleRef.get(NovelService);

  return {
    service,
    moduleRef,
    addMock,
    closeMock,
    repository: repositoryMock,
    eventRepository: eventRepositoryMock,
    metricsRepository: metricsRepositoryMock,
    metadataRepository: metadataRepositoryMock,
  };
}

describe('NovelService', () => {
  it('enqueues a novel generation job with a generated id', async () => {
    const { service, moduleRef, addMock, closeMock } = await createService();

    const result = await service.enqueueNovelJob({
      payload: basePayload,
    });

    expect(addMock).toHaveBeenCalledTimes(1);
    const [[jobName, jobData, jobOptions]] = addMock.mock.calls;
    expect(jobName).toBe('novel.generate');
    expect(jobData.payload).toEqual(basePayload);
    expect(jobData.jobId).toMatch(uuidPattern);
    expect(() => new Date(jobData.requestedAt)).not.toThrow();
    expect(new Date(jobData.requestedAt).toISOString()).toBe(jobData.requestedAt);
    expect(jobOptions?.removeOnComplete).toMatchObject({ age: 3600, count: 50 });
    expect(jobOptions?.removeOnFail).toMatchObject({ age: 24 * 3600 });
    expect(result).toEqual({ jobId: jobData.jobId, queue: 'novel-generation' });

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('uses the provided clientRequestId when present', async () => {
    const { service, moduleRef, addMock, closeMock } = await createService();

    const result = await service.enqueueNovelJob({
      payload: basePayload,
      clientRequestId: '  custom-id  ',
    });

    expect(addMock).toHaveBeenCalledTimes(1);
    const [[, jobData]] = addMock.mock.calls;
    expect(jobData.jobId).toBe('custom-id');
    expect(result).toEqual({ jobId: 'custom-id', queue: 'novel-generation' });

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('throws ConflictException when a job already exists', async () => {
    const addMock = jest.fn(async () => {
      throw new Error('Job with ID already exists');
    });
    const { service, moduleRef, closeMock } = await createService({ addMock });

    await expect(
      service.enqueueNovelJob({
        payload: basePayload,
        clientRequestId: 'duplicate-id',
      }),
    ).rejects.toThrow(ConflictException);

    expect(addMock).toHaveBeenCalledTimes(1);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException when queueing fails unexpectedly', async () => {
    const addMock = jest.fn(async () => {
      throw new Error('redis timed out');
    });
    const { service, moduleRef, closeMock } = await createService({ addMock });

    await expect(
      service.enqueueNovelJob({
        payload: basePayload,
      }),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(addMock).toHaveBeenCalledTimes(1);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('returns a job when found', async () => {
    const aggregate = createAggregate({ id: 'job-456' });
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(aggregate),
      },
    });

    const result = await service.getJob('job-456');

    expect(repository.findByJobId).toHaveBeenCalledWith('job-456');
    expect(result).toBe(aggregate);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when a job is missing', async () => {
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.getJob('missing-job')).rejects.toThrow(NotFoundException);
    expect(repository.findByJobId).toHaveBeenCalledWith('missing-job');

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('lists recent jobs with explicit limit', async () => {
    const aggregate = createAggregate({ id: 'job-789' });
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        listActiveJobs: jest.fn().mockResolvedValue([aggregate]),
      },
    });

    const result = await service.listRecentJobs({ limit: 10 });

  expect(repository.listActiveJobs).toHaveBeenCalledWith({ limit: 10 });
    expect(result).toEqual([aggregate]);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('lists recent jobs with defaults when options are omitted', async () => {
    const aggregate = createAggregate();
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        listActiveJobs: jest.fn().mockResolvedValue([aggregate]),
      },
    });

    const result = await service.listRecentJobs();

    expect(repository.listActiveJobs).toHaveBeenCalledWith({});
    expect(result).toEqual([aggregate]);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('forwards status filters when provided', async () => {
    const aggregate = createAggregate({ id: 'job-900', status: 'completed' });
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        listActiveJobs: jest.fn().mockResolvedValue([aggregate]),
      },
    });

    const result = await service.listRecentJobs({ statuses: ['completed', 'failed'] });

    expect(repository.listActiveJobs).toHaveBeenCalledWith({ statuses: ['completed', 'failed'] });
    expect(result).toEqual([aggregate]);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('lists job events for an existing job', async () => {
    const aggregate = createAggregate({ id: 'job-abc' });
    const eventRecord: NovelJobEventRecord = {
      kind: 'job-status',
      jobId: 'job-abc',
      emittedAt: '2025-10-05T12:00:00.000Z',
      status: 'running',
      snapshot: { stage: 'analysis' },
    };

    const { service, repository, eventRepository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(aggregate),
      },
      eventRepository: {
        list: jest.fn().mockResolvedValue([eventRecord]),
      },
    });

    const result = await service.listJobEvents('job-abc', { limit: 25 });

    expect(repository.findByJobId).toHaveBeenCalledWith('job-abc');
    expect(eventRepository.list).toHaveBeenCalledWith('job-abc', { limit: 25 });
    expect(result).toEqual([eventRecord]);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when requesting events for a missing job', async () => {
    const { service, repository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.listJobEvents('unknown-job')).rejects.toThrow(NotFoundException);
    expect(repository.findByJobId).toHaveBeenCalledWith('unknown-job');

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('returns job metrics when available', async () => {
    const aggregate = createAggregate({ id: 'job-metrics' });
    const metrics: NovelJobMetrics = {
      jobId: 'job-metrics',
      cost: { totalUsd: 12.5, chaptersUsd: 12.5 },
      tokens: { total: 12000, chapters: 12000 },
      latencyMs: { total: 480000 },
      updatedAt: '2025-10-05T12:30:00.000Z',
    };

    const { service, repository, metricsRepository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(aggregate),
      },
      metricsRepository: {
        getMetrics: jest.fn().mockResolvedValue(metrics),
      },
    });

    const result = await service.getJobMetrics('job-metrics');

    expect(repository.findByJobId).toHaveBeenCalledWith('job-metrics');
    expect(metricsRepository.getMetrics).toHaveBeenCalledWith('job-metrics');
    expect(result).toBe(metrics);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('returns job metadata when available', async () => {
    const aggregate = createAggregate({ id: 'job-meta' });
    const metadata: NovelJobMetadata = {
      jobId: 'job-meta',
      storyBible: {
        characters: {
          hero: {
            name: 'Ara',
            summary: 'Protagonist of the novel',
            traits: ['brave'],
            relationships: [],
          },
        },
      },
      continuityAlerts: [],
      aiDecisions: [],
      enhancements: [],
      performance: undefined,
      updatedAt: '2025-10-05T12:45:00.000Z',
    };

    const { service, repository, metadataRepository, moduleRef, closeMock } = await createService({
      repository: {
        findByJobId: jest.fn().mockResolvedValue(aggregate),
      },
      metadataRepository: {
        getMetadata: jest.fn().mockResolvedValue(metadata),
      },
    });

    const result = await service.getJobMetadata('job-meta');

    expect(repository.findByJobId).toHaveBeenCalledWith('job-meta');
    expect(metadataRepository.getMetadata).toHaveBeenCalledWith('job-meta');
    expect(result).toBe(metadata);

    await moduleRef.close();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
