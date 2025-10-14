/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { NovelController } from './novel.controller';
import { NovelService } from './novel.service';
import type {
  NovelJobAggregate,
  NovelJobEventRecord,
  NovelJobMetadata,
  NovelJobMetrics,
} from '@letswriteabook/domain';

function buildAggregate(overrides: Partial<NovelJobAggregate> = {}): NovelJobAggregate {
  const baseDate = new Date('2025-10-05T12:00:00.000Z');
  return {
    id: 'job-001',
    payload: {
      title: 'The Autumn Trials',
      premise: 'Explorers test the limits of collaborative AI writing.',
      genre: 'Science Fiction',
      subgenre: 'Adventure',
      targetWordCount: 90000,
      targetChapters: 30,
      humanLikeWriting: true,
    },
    queue: 'novel-generation',
    status: 'running',
    chapters: [],
    snapshot: {
      events: [],
      domainEvents: [],
    },
    failures: [],
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  } satisfies NovelJobAggregate;
}

describe('NovelController', () => {
  let controller: NovelController;
  let service: jest.Mocked<NovelService>;

  beforeEach(async () => {
    service = {
      enqueueNovelJob: jest.fn(),
      getJob: jest.fn(),
      listRecentJobs: jest.fn(),
      listJobEvents: jest.fn(),
      getJobMetrics: jest.fn(),
      getJobMetadata: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<NovelService>;

    const moduleRef = await Test.createTestingModule({
      controllers: [NovelController],
      providers: [{ provide: NovelService, useValue: service }],
    }).compile();

    controller = moduleRef.get(NovelController);
  });

  it('queues a novel job', async () => {
    service.enqueueNovelJob.mockResolvedValue({ jobId: 'job-xyz', queue: 'novel-generation' });

    const result = await controller.createJob({
      payload: {
        title: 'The Autumn Trials',
        premise: 'Explorers test the limits of collaborative AI writing.',
        genre: 'Science Fiction',
        subgenre: 'Adventure',
        targetWordCount: 90000,
        targetChapters: 30,
        humanLikeWriting: false,
      },
    } as any);

    expect(service.enqueueNovelJob).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ title: 'The Autumn Trials' }),
      }),
    );
    expect(result).toEqual({ status: 'queued', jobId: 'job-xyz', queue: 'novel-generation' });
  });

  it('returns job details', async () => {
    const aggregate = buildAggregate({
      status: 'completed',
      snapshot: {
        events: [],
        domainEvents: [],
        summary: {
          chaptersGenerated: 5,
          totalChaptersPlanned: 10,
          totalWordCount: 25000,
        },
      },
      chapters: [],
    });

    service.getJob.mockResolvedValue(aggregate);

    const result = await controller.getJob({ jobId: 'job-001' } as any);

    expect(service.getJob).toHaveBeenCalledWith('job-001');
    expect(result).toMatchObject({
      jobId: 'job-001',
      status: 'completed',
      summary: aggregate.snapshot.summary,
    });
  });

  it('lists jobs with single status filter', async () => {
    const aggregate = buildAggregate();
    service.listRecentJobs.mockResolvedValue([aggregate]);

    const result = await controller.listJobs({ limit: 10, status: 'running' } as any);

    expect(service.listRecentJobs).toHaveBeenCalledWith({ limit: 10, statuses: ['running'] });
    expect(result).toEqual({
      items: [
        expect.objectContaining({ jobId: 'job-001', status: 'running' }),
      ],
      count: 1,
    });
  });

  it('lists jobs with multiple statuses', async () => {
    const aggregate = buildAggregate({ status: 'failed' });
    service.listRecentJobs.mockResolvedValue([aggregate]);

    const result = await controller.listJobs({ status: ['failed', 'completed'] } as any);

    expect(service.listRecentJobs).toHaveBeenCalledWith({ statuses: ['failed', 'completed'] });
    expect(result.count).toBe(1);
    expect(result.items[0]).toMatchObject({ status: 'failed' });
  });

  it('lists job events with pagination options', async () => {
    const event: Extract<NovelJobEventRecord, { kind: 'generation' }> = {
      kind: 'generation',
      jobId: 'job-001',
      emittedAt: '2025-10-05T12:00:00.000Z',
      event: {
        type: 'stage-log',
        occurredAt: '2025-10-05T12:00:00.000Z',
        message: 'analysis complete',
      },
    };

    service.listJobEvents.mockResolvedValue([event]);

    const result = await controller.listJobEvents(
      { jobId: 'job-001' } as any,
      { limit: 25, before: '2025-10-05T12:05:00.000Z' } as any,
    );

    expect(service.listJobEvents).toHaveBeenCalledWith('job-001', {
      limit: 25,
      before: '2025-10-05T12:05:00.000Z',
    });
    expect(result).toEqual({
      count: 1,
      items: [
        {
          kind: 'generation',
          jobId: 'job-001',
          emittedAt: '2025-10-05T12:00:00.000Z',
          event: event.event,
        },
      ],
    });
  });

  it('returns job metrics with defaults applied', async () => {
    const metrics: NovelJobMetrics = {
      jobId: 'job-001',
      cost: {
        totalUsd: 12.75,
        chaptersUsd: 12.75,
        bonusUsd: 3.5,
      },
      tokens: {
        total: 18000,
        chapters: 18000,
        retries: 2500,
      },
      latencyMs: {
        total: 360000,
        analysis: 120000,
      },
      updatedAt: '2025-10-05T12:10:00.000Z',
    };

    service.getJobMetrics.mockResolvedValue(metrics);

    const result = await controller.getJobMetrics({ jobId: 'job-001' } as any);

    expect(service.getJobMetrics).toHaveBeenCalledWith('job-001');
    expect(result).toEqual({
      jobId: 'job-001',
      cost: {
        totalUsd: 12.75,
        analysisUsd: 0,
        outlineUsd: 0,
        chaptersUsd: 12.75,
        bonusUsd: 3.5,
      },
      tokens: {
        total: 18000,
        analysis: 0,
        outline: 0,
        chapters: 18000,
        retries: 2500,
      },
      latencyMs: {
        total: 360000,
        analysis: 120000,
      },
      updatedAt: '2025-10-05T12:10:00.000Z',
    });
  });

  it('returns job metadata with fallback defaults', async () => {
    const metadata: NovelJobMetadata = {
      jobId: 'job-001',
      storyBible: {
        characters: {
          lead: {
            name: 'Ora',
            summary: 'Explorer and protagonist',
            traits: ['curious'],
            relationships: [],
          },
        },
        metadata: { tone: 'optimistic' },
        themes: ['discovery'],
      },
      continuityAlerts: [],
      aiDecisions: [],
      enhancements: [],
      performance: { throughput: 1.2 },
      updatedAt: '2025-10-05T12:15:00.000Z',
    };

    service.getJobMetadata.mockResolvedValue(metadata);

    const result = await controller.getJobMetadata({ jobId: 'job-001' } as any);

    expect(service.getJobMetadata).toHaveBeenCalledWith('job-001');
    expect(result).toEqual({
      jobId: 'job-001',
      storyBible: {
        characters: metadata.storyBible.characters,
        metadata: { tone: 'optimistic' },
        locations: null,
        themes: ['discovery'],
      },
      continuityAlerts: [],
      aiDecisions: [],
      enhancements: [],
      performance: { throughput: 1.2 },
      updatedAt: '2025-10-05T12:15:00.000Z',
    });
  });
});
