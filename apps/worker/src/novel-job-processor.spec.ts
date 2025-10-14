import type { WorkerConfig } from '@letswriteabook/config';
import type { Job } from 'bullmq';
import type {
  ChapterOutlineDetails,
  ChapterState,
  GenerateNovelOptions,
  GenerationContext,
  GenerationEvent,
  OpenAiClient,
} from '@letswriteabook/ai-engine';
import { createOpenAiClient, generateNovel } from '@letswriteabook/ai-engine';
import type { NovelGenerationJobData } from '@letswriteabook/shared-types';
import { createNovelJobProcessor, type NovelGenerationJobResult } from './novel-job-processor';
import type { WorkerLogger } from './logger';
import type {
  NovelJobEventRepository,
  NovelJobMetadataRepository,
  NovelJobMetricsRepository,
  NovelJobRepository,
} from '@letswriteabook/domain';
import type { NovelRealtimePublisher } from './realtime-publisher';
import { runInMongoTransaction } from '@letswriteabook/persistence';
import { NOVEL_REALTIME_PROTOCOL_VERSION } from '@letswriteabook/messaging';

jest.mock('@letswriteabook/ai-engine', () => {
  const actual = jest.requireActual('@letswriteabook/ai-engine');
  return {
    ...actual,
    generateNovel: jest.fn(),
    createOpenAiClient: jest.fn(),
  };
});

jest.mock('@letswriteabook/persistence', () => {
  const actual = jest.requireActual('@letswriteabook/persistence');
  return {
    ...actual,
    runInMongoTransaction: jest.fn(),
  };
});

const generateNovelMock = jest.mocked(generateNovel);
const createOpenAiClientMock = jest.mocked(createOpenAiClient);
const runInMongoTransactionMock = jest.mocked(runInMongoTransaction);

const BASE_TIME = new Date('2025-10-04T10:00:00.000Z');

type PublishableDomainEvent = Parameters<NonNullable<GenerateNovelOptions['publishDomainEvent']>>[0];

function createLogger(): jest.Mocked<WorkerLogger> {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function createJob(overrides: Partial<Job<NovelGenerationJobData, NovelGenerationJobResult>> = {}): Job<
  NovelGenerationJobData,
  NovelGenerationJobResult
> {
  const updateProgress = jest.fn<Promise<void>, [Record<string, unknown>]>();
  updateProgress.mockResolvedValue(undefined);

  const job: Partial<Job<NovelGenerationJobData, NovelGenerationJobResult>> = {
    id: 'job-123',
    name: 'novel-generation',
    attemptsMade: 0,
    data: {
      jobId: 'job-123',
      requestedAt: '2025-10-04T09:50:00.000Z',
      payload: {
        title: 'The October Experiment',
        premise: 'An experiment in AI-generated storytelling.',
        genre: 'sci_fi',
        subgenre: 'cyberpunk',
        targetWordCount: 45000,
        targetChapters: 12,
        humanLikeWriting: true,
      },
    },
    updateProgress,
    ...overrides,
  };

  return job as Job<NovelGenerationJobData, NovelGenerationJobResult>;
}

function createRepositories(): {
  jobs: jest.Mocked<NovelJobRepository>;
  events: jest.Mocked<NovelJobEventRepository>;
  metrics: jest.Mocked<NovelJobMetricsRepository>;
  metadata: jest.Mocked<NovelJobMetadataRepository>;
} {
  const jobs: jest.Mocked<NovelJobRepository> = {
    initializeJob: jest.fn().mockResolvedValue({} as any),
    saveGenerationResult: jest.fn().mockResolvedValue({} as any),
    recordFailure: jest.fn().mockResolvedValue({} as any),
    findByJobId: jest.fn().mockResolvedValue(null),
    listActiveJobs: jest.fn().mockResolvedValue([]),
  };

  const events = {
    append: jest.fn<Promise<void>, [Parameters<NovelJobEventRepository['append']>[0]]>().mockResolvedValue(
      undefined,
    ),
    list: jest
      .fn<Promise<Awaited<ReturnType<NovelJobEventRepository['list']>>>, Parameters<NovelJobEventRepository['list']>>()
      .mockResolvedValue([]),
  } as unknown as jest.Mocked<NovelJobEventRepository>;

  const metrics: jest.Mocked<NovelJobMetricsRepository> = {
    incrementCosts: jest.fn().mockResolvedValue({} as any),
    incrementTokens: jest.fn().mockResolvedValue({} as any),
    updateLatency: jest.fn().mockResolvedValue({} as any),
    reset: jest.fn().mockResolvedValue({} as any),
    getMetrics: jest.fn().mockResolvedValue(null),
  };

  const metadata: jest.Mocked<NovelJobMetadataRepository> = {
    upsertStoryBible: jest.fn().mockResolvedValue({} as any),
    addContinuityAlert: jest.fn().mockResolvedValue({} as any),
    resolveContinuityAlert: jest.fn().mockResolvedValue({} as any),
    appendAiDecision: jest.fn().mockResolvedValue({} as any),
    getMetadata: jest.fn().mockResolvedValue(null),
  };

  return { jobs, events, metrics, metadata };
}

function createRealtimePublisher(): jest.Mocked<NovelRealtimePublisher> {
  const publish = jest
    .fn<Promise<void>, [Parameters<NovelRealtimePublisher['publish']>[0]]>()
    .mockResolvedValue(undefined);
  const close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

  return {
    publish,
    close,
  } as unknown as jest.Mocked<NovelRealtimePublisher>;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('createNovelJobProcessor', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    jest.setSystemTime(BASE_TIME);
    generateNovelMock.mockReset();
    createOpenAiClientMock.mockReset();
    runInMongoTransactionMock.mockReset();
    runInMongoTransactionMock.mockImplementation(async (work) => work({} as any));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('processes a job with OpenAI client and returns serialized result', async () => {
    const logger = createLogger();
    const config: WorkerConfig = {
      nodeEnv: 'development',
      mongoUri: undefined,
      redisUrl: 'redis://localhost:6379',
      openAiApiKey: 'sk-test',
      modelOverrides: {
        analysis: '  gpt-4o-mini  ',
        outline: 'gpt-4.1',
        chapter: '  gpt-4.1-mini',
        ignored: 'value',
      },
      sentryDsn: undefined,
      novelQueueName: 'novel-generation',
      loggerLevels: ['info', 'warn', 'error'],
    };

    const openAiClient = {} as unknown as OpenAiClient;
    createOpenAiClientMock.mockResolvedValue(openAiClient);

    generateNovelMock.mockImplementation(async (context, options) => {
      const event: GenerationEvent = {
        type: 'stage-log',
        occurredAt: new Date('2025-10-04T10:00:30.000Z'),
        stage: 'analysis',
        level: 'info',
        message: 'analysis complete',
        details: { checkpoint: 1 },
      } satisfies GenerationEvent;

      options.emit?.(event);

      const domainEvent: PublishableDomainEvent = {
        type: 'job-completed',
        jobId: context.job.jobId,
        occurredAt: new Date('2025-10-04T10:03:00.000Z'),
        status: 'completed',
        currentPhase: 'completed',
        message: 'Generation finished',
        progress: {
          outlineComplete: true,
          chaptersCompleted: 1,
          chaptersFailed: 0,
          totalChapters: 1,
          hasFailures: false,
        },
      };

      options.publishDomainEvent?.(domainEvent);

      options.logger?.info('stage-progress', { stage: 'analysis' });

      jest.setSystemTime(new Date('2025-10-04T10:05:00.000Z'));

      const outline: ChapterOutlineDetails[] = [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          summary: 'Intro',
          keyEvents: ['event-1'],
          wordTarget: 4000,
        },
      ];

      const chapters: ChapterState[] = [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          wordCount: 3800,
          content: 'Generated chapter content.',
        },
      ];

      const updatedContext: GenerationContext = {
        ...context,
        outline,
        chapters,
        analysis: context.analysis,
      };

      return updatedContext;
    });

    const job = createJob();
    const repositories = createRepositories();
    const realtimePublisher = createRealtimePublisher();
    const processor = await createNovelJobProcessor(
      config,
      logger,
      'novel-generation',
      repositories,
      realtimePublisher,
    );
    const result = await processor.process(job);
    await flushMicrotasks();

    expect(createOpenAiClientMock).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      models: {
        analysis: 'gpt-4o-mini',
        outline: 'gpt-4.1',
        chapter: 'gpt-4.1-mini',
      },
    });
    expect(generateNovelMock).toHaveBeenCalledTimes(1);

    const [initialContext] = generateNovelMock.mock.calls[0];
    expect(initialContext.job).toMatchObject({
      jobId: 'job-123',
      title: 'The October Experiment',
      metadata: {
        requestedAt: '2025-10-04T09:50:00.000Z',
        receivedAt: '2025-10-04T10:00:00.000Z',
      },
    });

    expect(job.updateProgress).toHaveBeenCalledWith({
      status: 'acknowledged',
      receivedAt: '2025-10-04T10:00:00.000Z',
    });
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'event', eventType: 'stage-log' }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'domain-event', eventType: 'job-completed' }),
    );
    expect(job.updateProgress).toHaveBeenCalledWith({
      status: 'completed',
      completedAt: '2025-10-04T10:05:00.000Z',
      durationMs: 300000,
      eventsProcessed: 1,
    });

    expect(logger.info).toHaveBeenCalledWith('stage-progress', expect.objectContaining({ jobId: 'job-123', stage: 'analysis' }));

    expect(result).toMatchObject({
      status: 'completed',
      jobId: 'job-123',
      queue: 'novel-generation',
      engine: {
        clientType: 'openai',
        modelOverrides: {
          analysis: 'gpt-4o-mini',
          outline: 'gpt-4.1',
          chapter: 'gpt-4.1-mini',
        },
      },
      summary: {
        chaptersGenerated: 1,
        totalChaptersPlanned: 1,
        totalWordCount: 3800,
      },
    });

    expect(result.events).toEqual([
      expect.objectContaining({
        type: 'stage-log',
        occurredAt: '2025-10-04T10:00:30.000Z',
        details: { checkpoint: 1 },
      }),
    ]);
    expect(result.domainEvents).toEqual([
      expect.objectContaining({
        type: 'job-completed',
        occurredAt: '2025-10-04T10:03:00.000Z',
        progress: expect.objectContaining({ chaptersCompleted: 1, hasFailures: false }),
      }),
    ]);

    expect(realtimePublisher.publish).toHaveBeenCalledTimes(4);
    const publishedKinds = realtimePublisher.publish.mock.calls.map(([event]) => event.kind);
    expect(publishedKinds).toEqual(['job-status', 'generation', 'domain', 'job-status']);
    expect(realtimePublisher.publish.mock.calls[0][0]).toMatchObject({
      version: NOVEL_REALTIME_PROTOCOL_VERSION,
      kind: 'job-status',
      jobId: 'job-123',
      status: 'running',
    });
    expect(realtimePublisher.publish.mock.calls[3][0]).toMatchObject({
      version: NOVEL_REALTIME_PROTOCOL_VERSION,
      kind: 'job-status',
      jobId: 'job-123',
      status: 'completed',
    });
    for (const [event] of realtimePublisher.publish.mock.calls) {
      expect(event.version).toBe(NOVEL_REALTIME_PROTOCOL_VERSION);
    }

    expect(repositories.jobs.initializeJob).toHaveBeenCalledWith({
      jobId: 'job-123',
      queue: 'novel-generation',
      payload: job.data.payload,
      requestedAt: '2025-10-04T09:50:00.000Z',
      receivedAt: '2025-10-04T10:00:00.000Z',
      startedAt: '2025-10-04T10:00:00.000Z',
    });
    expect(repositories.jobs.saveGenerationResult).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-123', status: 'completed' }),
    );
    expect(repositories.jobs.recordFailure).not.toHaveBeenCalled();
    expect(repositories.events.append).toHaveBeenCalledTimes(4);
    expect(repositories.events.append.mock.calls[0][0]).toMatchObject({
      kind: 'job-status',
      status: 'running',
    });
    expect(repositories.events.append.mock.calls[3][0]).toMatchObject({
      kind: 'job-status',
      status: 'completed',
    });
    expect(repositories.metrics.reset).toHaveBeenCalledWith('job-123');
    expect(repositories.metrics.updateLatency).toHaveBeenCalledWith('job-123', { total: 300000 });
    expect(repositories.metrics.incrementCosts).not.toHaveBeenCalled();
    expect(repositories.metrics.incrementTokens).not.toHaveBeenCalled();
    expect(repositories.metadata.upsertStoryBible).toHaveBeenCalledWith(
      'job-123',
      expect.objectContaining({
        metadata: expect.objectContaining({ summary: expect.any(Object) }),
      }),
    );
    expect(repositories.metadata.addContinuityAlert).not.toHaveBeenCalled();
  });

  it('logs and rethrows errors from generateNovel', async () => {
    const logger = createLogger();
    const config: WorkerConfig = {
      nodeEnv: 'development',
      mongoUri: undefined,
      redisUrl: 'redis://localhost:6379',
      openAiApiKey: 'sk-test',
      modelOverrides: undefined,
      sentryDsn: undefined,
      novelQueueName: 'novel-generation',
      loggerLevels: ['info', 'warn', 'error'],
    };

    const openAiClient = {} as unknown as OpenAiClient;

    createOpenAiClientMock.mockResolvedValue(openAiClient);

    generateNovelMock.mockRejectedValue(new Error('generation failed'));

    const job = createJob();
    const repositories = createRepositories();
    const realtimePublisher = createRealtimePublisher();
    const processor = await createNovelJobProcessor(
      config,
      logger,
      'novel-generation',
      repositories,
      realtimePublisher,
    );

    await expect(processor.process(job)).rejects.toThrow('generation failed');
    await flushMicrotasks();

    expect(logger.error).toHaveBeenCalledWith('Novel job failed', expect.objectContaining({ jobId: 'job-123' }));
    expect(job.updateProgress).toHaveBeenCalledWith({
      status: 'failed',
      failedAt: '2025-10-04T10:00:00.000Z',
      error: 'generation failed',
    });
    expect(repositories.jobs.initializeJob).toHaveBeenCalled();
    expect(repositories.jobs.recordFailure).toHaveBeenCalledWith(
      'job-123',
      expect.objectContaining({ reason: 'generation failed', stage: 'worker-runtime' }),
    );
    expect(repositories.metadata.addContinuityAlert).toHaveBeenCalledWith(
      'job-123',
      expect.objectContaining({
        title: 'Novel job failure recorded',
        severity: 'critical',
        message: 'generation failed',
      }),
    );
    expect(repositories.metrics.reset).not.toHaveBeenCalled();
    expect(realtimePublisher.publish).toHaveBeenCalledTimes(2);
    expect(realtimePublisher.publish.mock.calls[1][0]).toMatchObject({
      version: NOVEL_REALTIME_PROTOCOL_VERSION,
      kind: 'job-status',
      status: 'failed',
    });
    for (const [event] of realtimePublisher.publish.mock.calls) {
      expect(event.version).toBe(NOVEL_REALTIME_PROTOCOL_VERSION);
    }
    expect(repositories.events.append).toHaveBeenCalledTimes(2);
    expect(repositories.events.append.mock.calls[1][0]).toMatchObject({
      kind: 'job-status',
      status: 'failed',
    });
  });

  it('falls back to the mock client when no OpenAI API key is provided', async () => {
    const logger = createLogger();
    const config: WorkerConfig = {
      nodeEnv: 'development',
      mongoUri: undefined,
      redisUrl: 'redis://localhost:6379',
      openAiApiKey: undefined,
      modelOverrides: undefined,
      sentryDsn: undefined,
      novelQueueName: 'novel-generation',
      loggerLevels: ['info', 'warn', 'error'],
    };

    generateNovelMock.mockImplementation(async (context) => {
      jest.setSystemTime(new Date('2025-10-04T10:01:00.000Z'));

      const chapters = [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          status: 'completed',
          wordCount: 1200,
          content: 'Mock content',
        },
      ] as unknown as ChapterState[];

      const outline = [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          summary: 'Intro',
          keyEvents: ['event'],
          wordTarget: 1200,
        },
      ] as unknown as ChapterOutlineDetails[];

      return {
        ...context,
        outline,
        chapters,
      } as GenerationContext;
    });

    const job = createJob();
    const repositories = createRepositories();
    const realtimePublisher = createRealtimePublisher();
    const processor = await createNovelJobProcessor(
      config,
      logger,
      'novel-generation',
      repositories,
      realtimePublisher,
    );
    const result = await processor.process(job);
    await flushMicrotasks();

    expect(createOpenAiClientMock).not.toHaveBeenCalled();
    expect(result.engine.clientType).toBe('mock');
    expect(result.summary).toMatchObject({
      chaptersGenerated: 1,
      totalWordCount: 1200,
    });
    expect(repositories.jobs.initializeJob).toHaveBeenCalledWith({
      jobId: 'job-123',
      queue: 'novel-generation',
      payload: job.data.payload,
      requestedAt: '2025-10-04T09:50:00.000Z',
      receivedAt: '2025-10-04T10:00:00.000Z',
      startedAt: '2025-10-04T10:00:00.000Z',
    });
    expect(repositories.jobs.saveGenerationResult).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-123', status: 'completed' }),
    );
    expect(realtimePublisher.publish).toHaveBeenCalledTimes(2);
    expect(realtimePublisher.publish.mock.calls[0][0]).toMatchObject({
      version: NOVEL_REALTIME_PROTOCOL_VERSION,
      status: 'running',
    });
    expect(realtimePublisher.publish.mock.calls[1][0]).toMatchObject({
      version: NOVEL_REALTIME_PROTOCOL_VERSION,
      status: 'completed',
    });
    for (const [event] of realtimePublisher.publish.mock.calls) {
      expect(event.version).toBe(NOVEL_REALTIME_PROTOCOL_VERSION);
    }
    expect(repositories.events.append).toHaveBeenCalledTimes(2);
    expect(repositories.metadata.upsertStoryBible).toHaveBeenCalled();
    expect(repositories.metrics.reset).toHaveBeenCalledWith('job-123');
    expect(repositories.metrics.updateLatency).toHaveBeenCalledWith('job-123', { total: 60000 });
  });

  it('processes successfully when realtime publisher is not provided', async () => {
    const logger = createLogger();
    const config: WorkerConfig = {
      nodeEnv: 'development',
      mongoUri: undefined,
      redisUrl: 'redis://localhost:6379',
      openAiApiKey: undefined,
      modelOverrides: undefined,
      sentryDsn: undefined,
      novelQueueName: 'novel-generation',
      loggerLevels: ['info', 'warn', 'error'],
    };

    generateNovelMock.mockImplementation(async (context) => context as unknown as GenerationContext);

    const job = createJob();
    const repositories = createRepositories();
    const processor = await createNovelJobProcessor(config, logger, 'novel-generation', repositories, undefined);

    await expect(processor.process(job)).resolves.toMatchObject({ status: 'completed', jobId: 'job-123' });
    await flushMicrotasks();

    expect(repositories.events.append).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalledWith('Realtime dispatch failed', expect.anything());
  });

  it('persists job result inside a Mongo transaction when repositories expose sessions', async () => {
    const logger = createLogger();
    const config: WorkerConfig = {
      nodeEnv: 'development',
      mongoUri: undefined,
      redisUrl: 'redis://localhost:6379',
      openAiApiKey: undefined,
      modelOverrides: undefined,
      sentryDsn: undefined,
      novelQueueName: 'novel-generation',
      loggerLevels: ['info', 'warn', 'error'],
    };

    const sessionStub = { id: 'session-stub' } as unknown;
    runInMongoTransactionMock.mockImplementationOnce(async (work) => work(sessionStub as any));

    generateNovelMock.mockImplementation(async (context) => {
      jest.setSystemTime(new Date('2025-10-04T10:04:00.000Z'));

      const outline = [
        {
          chapterNumber: 1,
          title: 'Outline Entry',
          summary: 'Summary',
          keyEvents: ['event'],
          wordTarget: 1400,
        },
      ] as unknown as ChapterOutlineDetails[];

      const chapters = [
        {
          chapterNumber: 1,
          title: 'Chapter',
          status: 'completed',
          wordCount: 1200,
          content: 'Content',
        },
      ] as unknown as ChapterState[];

      return {
        ...context,
        outline,
        chapters,
        analysis: {
          themes: ['perseverance'],
        },
      } as GenerationContext;
    });

    const job = createJob();

    const events: jest.Mocked<NovelJobEventRepository> = {
      append: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<NovelJobEventRepository>;

    const jobsSession = {
      initializeJob: jest.fn().mockResolvedValue({} as any),
      saveGenerationResult: jest.fn().mockResolvedValue({} as any),
      recordFailure: jest.fn().mockResolvedValue({} as any),
      findByJobId: jest.fn().mockResolvedValue(null),
      listActiveJobs: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<NovelJobRepository>;

    const jobs = {
      initializeJob: jest.fn().mockResolvedValue({} as any),
      saveGenerationResult: jest.fn().mockResolvedValue({} as any),
      recordFailure: jest.fn().mockResolvedValue({} as any),
      findByJobId: jest.fn().mockResolvedValue(null),
      listActiveJobs: jest.fn().mockResolvedValue([]),
      withSession: jest.fn().mockReturnValue(jobsSession),
    } as unknown as jest.Mocked<NovelJobRepository> & { withSession: jest.Mock };

    const metricsSession = {
      incrementCosts: jest.fn().mockResolvedValue({} as any),
      incrementTokens: jest.fn().mockResolvedValue({} as any),
      updateLatency: jest.fn().mockResolvedValue({} as any),
      reset: jest.fn().mockResolvedValue({} as any),
      getMetrics: jest.fn().mockResolvedValue(null),
    } as jest.Mocked<NovelJobMetricsRepository>;

    const metrics = {
      incrementCosts: jest.fn().mockResolvedValue({} as any),
      incrementTokens: jest.fn().mockResolvedValue({} as any),
      updateLatency: jest.fn().mockResolvedValue({} as any),
      reset: jest.fn().mockResolvedValue({} as any),
      getMetrics: jest.fn().mockResolvedValue(null),
      withSession: jest.fn().mockReturnValue(metricsSession),
    } as unknown as jest.Mocked<NovelJobMetricsRepository> & { withSession: jest.Mock };

    const metadataSession = {
      upsertStoryBible: jest.fn().mockResolvedValue({} as any),
      addContinuityAlert: jest.fn().mockResolvedValue({} as any),
      resolveContinuityAlert: jest.fn().mockResolvedValue({} as any),
      appendAiDecision: jest.fn().mockResolvedValue({} as any),
      getMetadata: jest.fn().mockResolvedValue(null),
    } as jest.Mocked<NovelJobMetadataRepository>;

    const metadata = {
      upsertStoryBible: jest.fn().mockResolvedValue({} as any),
      addContinuityAlert: jest.fn().mockResolvedValue({} as any),
      resolveContinuityAlert: jest.fn().mockResolvedValue({} as any),
      appendAiDecision: jest.fn().mockResolvedValue({} as any),
      getMetadata: jest.fn().mockResolvedValue(null),
      withSession: jest.fn().mockReturnValue(metadataSession),
    } as unknown as jest.Mocked<NovelJobMetadataRepository> & { withSession: jest.Mock };

    const repositories = {
      jobs,
      events,
      metrics,
      metadata,
    } satisfies Parameters<typeof createNovelJobProcessor>[3];

    const realtimePublisher = createRealtimePublisher();
    const processor = await createNovelJobProcessor(
      config,
      logger,
      'novel-generation',
      repositories,
      realtimePublisher,
    );

    await processor.process(job);
    await flushMicrotasks();

    expect(runInMongoTransactionMock).toHaveBeenCalledTimes(1);
    expect(jobs.withSession).toHaveBeenCalledWith(sessionStub);
    expect(jobsSession.saveGenerationResult).toHaveBeenCalledTimes(1);
    expect(jobs.saveGenerationResult).not.toHaveBeenCalled();
    expect(metricsSession.reset).toHaveBeenCalledTimes(1);
    expect(metrics.reset).not.toHaveBeenCalled();
    expect(metadataSession.upsertStoryBible).toHaveBeenCalledTimes(1);
    expect(metadata.upsertStoryBible).not.toHaveBeenCalled();
  });
});
