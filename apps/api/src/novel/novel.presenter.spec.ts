/// <reference types="jest" />
import type { NovelJobAggregate, NovelJobEventRecord, NovelJobMetrics } from '@letswriteabook/domain';
import {
  presentNovelJobDetail,
  presentNovelJobEvents,
  presentNovelJobMetadata,
  presentNovelJobMetrics,
  presentNovelJobSummaries,
  presentNovelJobSummary,
} from './novel.presenter';

const baseJob: NovelJobAggregate = {
  id: 'job-001',
  payload: {
    title: 'The Long Voyage',
    premise: 'An explorer crosses uncharted galaxies in search of a lost civilization.',
    genre: 'Science Fiction',
    subgenre: 'Space Opera',
    targetWordCount: 120_000,
    targetChapters: 36,
    humanLikeWriting: true,
  },
  queue: 'novel-generation',
  status: 'running',
  outline: [
    {
      chapterNumber: 1,
      title: 'Lift Off',
      summary: 'The crew departs their home world.',
      keyEvents: ['Departure', 'Family Farewells'],
    },
  ],
  chapters: [
    {
      chapterNumber: 1,
      title: 'Lift Off',
      status: 'in-progress',
      attempts: [],
    },
  ],
  snapshot: {
    progress: {
      outlineComplete: true,
      chaptersCompleted: 0,
      chaptersFailed: 0,
      totalChapters: 36,
      hasFailures: false,
    },
    summary: {
      chaptersGenerated: 0,
      totalChaptersPlanned: 36,
      totalWordCount: 0,
    },
    engine: {
      clientType: 'mock',
    },
    events: [],
    domainEvents: [],
    context: {
      metadata: {
        runId: 'run-123',
      },
    },
  },
  failures: [],
  createdAt: new Date('2025-01-01T12:00:00.000Z'),
  updatedAt: new Date('2025-01-01T12:05:00.000Z'),
};

describe('novel presenter', () => {
  it('presents a novel job summary', () => {
    const result = presentNovelJobSummary(baseJob);

    expect(result).toEqual({
      jobId: 'job-001',
      status: 'running',
      queue: 'novel-generation',
      payload: baseJob.payload,
      requestedAt: null,
      createdAt: '2025-01-01T12:00:00.000Z',
      updatedAt: '2025-01-01T12:05:00.000Z',
      progress: baseJob.snapshot.progress,
      summary: baseJob.snapshot.summary,
      engine: baseJob.snapshot.engine,
    });
  });

  it('presents a novel job detail with outline defaults', () => {
    const job: NovelJobAggregate = {
      ...baseJob,
      requestedAt: '2025-01-01T11:59:00.000Z',
      outline: undefined,
      chapters: [],
      snapshot: {
        ...baseJob.snapshot,
        context: undefined,
      },
    };

    const result = presentNovelJobDetail(job);

    expect(result).toMatchObject({
      jobId: 'job-001',
      outline: [],
      chapters: [],
      events: job.snapshot.events,
      domainEvents: job.snapshot.domainEvents,
      context: null,
      failures: [],
    });
    expect(result.requestedAt).toBe('2025-01-01T11:59:00.000Z');
  });

  it('presents multiple summaries', () => {
    const results = presentNovelJobSummaries([baseJob, baseJob]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(results[1]);
  });

  it('presents job events across kinds', () => {
    const events: ReadonlyArray<NovelJobEventRecord> = [
      {
        kind: 'generation',
        jobId: 'job-001',
        emittedAt: '2025-10-05T12:00:00.000Z',
        event: {
          type: 'stage-log',
          occurredAt: '2025-10-05T12:00:00.000Z',
          message: 'analysis complete',
        },
      },
      {
        kind: 'domain',
        jobId: 'job-001',
        emittedAt: '2025-10-05T12:01:00.000Z',
        event: {
          type: 'job-progress',
          occurredAt: '2025-10-05T12:01:00.000Z',
          status: 'running',
        },
      },
      {
        kind: 'job-status',
        jobId: 'job-001',
        emittedAt: '2025-10-05T12:02:00.000Z',
        status: 'running',
        snapshot: { stage: 'outline' },
      },
    ];

    const result = presentNovelJobEvents(events);

    expect(result.count).toBe(3);
    expect(result.items[0]).toMatchObject({ kind: 'generation' });
    expect(result.items[1]).toMatchObject({ kind: 'domain' });
    expect(result.items[2]).toMatchObject({ kind: 'job-status', snapshot: { stage: 'outline' } });
  });

  it('presents job metrics including additional segments', () => {
    const metrics: NovelJobMetrics = {
      jobId: 'job-001',
      cost: {
        totalUsd: 15,
        analysisUsd: 5,
        outlineUsd: 3,
        chaptersUsd: 7,
        bonusUsd: 1,
      },
      tokens: {
        total: 22000,
        analysis: 6000,
        outline: 4000,
        chapters: 12000,
        retries: 500,
      },
      latencyMs: {
        total: 420000,
        analysis: 120000,
      },
      updatedAt: '2025-10-05T12:03:00.000Z',
    };

    const result = presentNovelJobMetrics('job-001', metrics);

    expect(result).toEqual({
      jobId: 'job-001',
      cost: {
        totalUsd: 15,
        analysisUsd: 5,
        outlineUsd: 3,
        chaptersUsd: 7,
        bonusUsd: 1,
      },
      tokens: {
        total: 22000,
        analysis: 6000,
        outline: 4000,
        chapters: 12000,
        retries: 500,
      },
      latencyMs: {
        total: 420000,
        analysis: 120000,
      },
      updatedAt: '2025-10-05T12:03:00.000Z',
    });
  });

  it('presents job metadata with defaults when absent', () => {
    const result = presentNovelJobMetadata('job-001', null);

    expect(result).toEqual({
      jobId: 'job-001',
      storyBible: {
        characters: {},
        metadata: null,
        locations: null,
        themes: [],
      },
      continuityAlerts: [],
      aiDecisions: [],
      enhancements: [],
      performance: null,
      updatedAt: null,
    });
  });
});
