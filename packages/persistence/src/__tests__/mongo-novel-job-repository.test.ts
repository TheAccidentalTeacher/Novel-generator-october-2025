import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  NovelChapterAttemptSnapshot,
  NovelChapterSnapshot,
  NovelGenerationJobResult,
  NovelJobSummary,
  NovelOutlineChapterSnapshot,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';
import { MongoNovelJobRepository } from '../repositories/mongo-novel-job-repository';
import { connectToDatabase, disconnectFromDatabase, getMongoConnection } from '../connection';
import { NovelJobModel } from '../models/novel-job';

jest.setTimeout(120_000);

describe('MongoNovelJobRepository', () => {
  let mongo: MongoMemoryServer | null = null;
  let repository: MongoNovelJobRepository;

  beforeAll(async () => {
    const server = await MongoMemoryServer.create();
    mongo = server;
    await connectToDatabase(server.getUri(), { dbName: 'novel-jobs-tests' });
    repository = new MongoNovelJobRepository();
  });

  afterEach(async () => {
    const connection = getMongoConnection();
    if (connection.readyState === 1) {
      await connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    await disconnectFromDatabase();
    if (mongo) {
      await mongo.stop();
      mongo = null;
    }
  });

  it('initializes a job document for running jobs', async () => {
    const initialization = buildJobInitialization('job-initialization');

    const aggregate = await repository.initializeJob(initialization);

    expect(aggregate.id).toBe(initialization.jobId);
    expect(aggregate.status).toBe('running');
    expect(aggregate.snapshot.events).toEqual([]);
    expect(aggregate.snapshot.domainEvents).toEqual([]);
    expect(aggregate.chapters).toEqual([]);

    const document = await NovelJobModel.findOne({ jobId: initialization.jobId }).lean().exec();
    expect(document).not.toBeNull();
    expect(document?.status).toBe('running');
    expect(document?.queue).toBe(initialization.queue);
    expect(document?.payload.title).toBe(initialization.payload.title);
    expect(document?.receivedAt).toBe(initialization.receivedAt);
    expect(document?.startedAt).toBe(initialization.startedAt);
    expect(document?.completedAt).toBeUndefined();
    expect(document?.durationMs).toBeUndefined();
    expect(document?.failures).toEqual([]);
    expect(Array.isArray(document?.outline)).toBe(true);
    expect(Array.isArray(document?.chapters)).toBe(true);
  });

  it('persists generation results and maps them to aggregates', async () => {
    const result = buildGenerationResult('job-completed');

    const aggregate = await repository.saveGenerationResult(result);

    expect(aggregate.id).toBe(result.jobId);
    expect(aggregate.status).toBe('completed');
    expect(aggregate.payload.title).toBe(result.context.job.title);
    expect(aggregate.outline).toHaveLength(result.outline?.length ?? 0);
    expect(aggregate.chapters).toHaveLength(result.chapters?.length ?? 0);
    expect(aggregate.snapshot.summary).toEqual(result.summary);
    expect(aggregate.snapshot.events).toHaveLength(result.events.length);
    expect(aggregate.snapshot.domainEvents).toHaveLength(result.domainEvents.length);
    expect(aggregate.snapshot.progress?.chaptersCompleted).toBe(1);
    expect(aggregate.chapters[0]?.attempts[0]?.attemptNumber).toBe(1);
  });

  it('records job failures and marks the aggregate as failed', async () => {
    const initialization = buildJobInitialization('job-failure');
    await repository.initializeJob(initialization);
    const failureAt = '2025-10-04T00:02:00.000Z';

    const aggregate = await repository.recordFailure(initialization.jobId, {
      reason: 'chapter retry exhausted',
      stage: 'chapter_writing',
      metadata: { chapterNumber: 1 },
      occurredAt: failureAt,
      completedAt: failureAt,
      durationMs: 120_000,
    });

    expect(aggregate.status).toBe('failed');
    expect(aggregate.failures).toHaveLength(1);
    expect(aggregate.failures[0]).toMatchObject({
      reason: 'chapter retry exhausted',
      stage: 'chapter_writing',
      occurredAt: failureAt,
      metadata: { chapterNumber: 1 },
    });
    expect(aggregate.snapshot.progress).toBeUndefined();

    const document = await NovelJobModel.findOne({ jobId: initialization.jobId }).lean().exec();
    expect(document?.status).toBe('failed');
    expect(document?.completedAt).toBe(failureAt);
    expect(document?.durationMs).toBe(120_000);
    expect(document?.failures).toHaveLength(1);
  });

  it('finds jobs by id', async () => {
    const result = buildGenerationResult('job-find');
    await repository.saveGenerationResult(result);

    const found = await repository.findByJobId(result.jobId);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(result.jobId);
    expect(found?.snapshot.summary?.totalWordCount).toBe(result.summary.totalWordCount);
  });

  it('returns null when a job is not found', async () => {
    const found = await repository.findByJobId('does-not-exist');
    expect(found).toBeNull();
  });

  it('lists active jobs ordered by recency', async () => {
    const completed = buildGenerationResult('job-complete-list');
    await repository.saveGenerationResult(completed);

    const active = buildGenerationResult('job-active-list');
    await repository.saveGenerationResult(active);
    await NovelJobModel.updateOne({ jobId: active.jobId }, { status: 'running' }).exec();

    const jobs = await repository.listActiveJobs({ limit: 5 });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(active.jobId);
    expect(jobs[0]?.status).toBe('running');
  });

  it('filters jobs by provided statuses when specified', async () => {
    const completed = buildGenerationResult('job-finished-filter');
    await repository.saveGenerationResult(completed);

    const failedInitialization = buildJobInitialization('job-failed-filter');
    await repository.initializeJob(failedInitialization);
    await repository.recordFailure(failedInitialization.jobId, {
      reason: 'test failure',
    });

    const jobs = await repository.listActiveJobs({ statuses: ['completed'] });

    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe('job-finished-filter');
    expect(jobs[0]?.status).toBe('completed');
  });
});

function buildGenerationResult(jobId: string): NovelGenerationJobResult {
  const baseTime = new Date('2025-10-04T00:00:00.000Z');
  const requestedAt = new Date(baseTime.getTime() - 1_000).toISOString();
  const receivedAt = baseTime.toISOString();
  const startedAt = new Date(baseTime.getTime() + 1_000).toISOString();
  const completedAt = new Date(baseTime.getTime() + 5_000).toISOString();

  const outline = buildOutline();
  const chapters = buildChapters();

  const summary: NovelJobSummary = {
    chaptersGenerated: chapters.length,
    totalChaptersPlanned: outline.length,
    totalWordCount: chapters.reduce((sum, chapter) => sum + (chapter.wordCount ?? 0), 0),
  };

  const events: SerializedGenerationEvent[] = [
    {
      type: 'chapter.completed',
      occurredAt: completedAt,
      chapterNumber: 1,
    },
  ];

  const domainEvents: SerializedDomainEvent[] = [
    {
      type: 'novel.completed',
      occurredAt: completedAt,
      jobId,
    },
  ];

  return {
    status: 'completed',
    jobId,
    queue: 'novel-generation',
    requestedAt,
    receivedAt,
    startedAt,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    engine: { clientType: 'mock' },
    summary,
    events,
    domainEvents,
    context: {
      job: {
        jobId,
        title: 'Test Novel',
        premise: 'A story of perseverance.',
        genre: 'Drama',
        subgenre: 'Inspirational',
        targetWordCount: 48000,
        targetChapters: outline.length,
        humanLikeWriting: true,
        metadata: {
          requestedAt,
        },
      },
      analysis: {
        themes: ['resilience'],
        humanLikeElements: {
          emotionalResonance: 'Highlight the protagonist’s internal journey.',
        },
      },
      outline,
      chapters,
      metadata: {
        traceId: 'trace-1234',
      },
    },
    outline,
    chapters,
    analysis: {
      themes: ['resilience'],
      humanLikeElements: {
        emotionalResonance: 'Highlight the protagonist’s internal journey.',
      },
    },
  };
}

function buildJobInitialization(jobId: string) {
  return {
    jobId,
    queue: 'novel-generation',
    payload: {
      title: 'In-Progress Novel',
      premise: 'A novel being written.',
      genre: 'Drama',
      subgenre: 'Slice of Life',
      targetWordCount: 50000,
      targetChapters: 12,
      humanLikeWriting: true,
    },
    requestedAt: '2025-10-04T00:00:00.000Z',
    receivedAt: '2025-10-04T00:00:30.000Z',
    startedAt: '2025-10-04T00:00:45.000Z',
  };
}

function buildOutline(): ReadonlyArray<NovelOutlineChapterSnapshot> {
  return [
    {
      chapterNumber: 1,
      title: 'Chapter 1: The Challenge',
      summary: 'Introduce the protagonist and central conflict.',
      keyEvents: ['Protagonist faces setback', 'Mentor appears'],
      wordTarget: 2000,
      humanLikeElements: {
        perspective: 'first-person',
      },
    },
    {
      chapterNumber: 2,
      title: 'Chapter 2: Rising Stakes',
      summary: 'Complications intensify the conflict.',
      keyEvents: ['New obstacle emerges', 'Protagonist questions resolve'],
      wordTarget: 2200,
    },
  ];
}

function buildChapters(): ReadonlyArray<NovelChapterSnapshot> {
  const attempts: NovelChapterAttemptSnapshot[] = [
    {
      prompt: 'Write chapter 1',
      content: 'Chapter content.',
      tokens: {
        promptTokens: 120,
        completionTokens: 900,
        totalTokens: 1020,
      },
      costInUsd: 0.12,
      createdAt: new Date('2025-10-04T00:05:00.000Z').toISOString(),
      rawResponse: { source: 'mock' },
    },
  ];

  return [
    {
      chapterNumber: 1,
      title: 'The Challenge',
      status: 'completed',
      wordCount: 2100,
      content: 'Chapter content.',
      model: 'gpt-mock',
      costInUsd: 0.12,
      tokens: {
        promptTokens: 120,
        completionTokens: 900,
        totalTokens: 1020,
      },
      attempts,
    },
  ];
}
