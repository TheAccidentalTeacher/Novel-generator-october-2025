import { ChapterStage } from '../chapterStage';
import { MockAiClient } from '../../client/mockClient';
import type { GenerationContext, StageServices } from '../../contracts';

const BASE_CONTEXT: GenerationContext = {
  job: {
    jobId: 'job-123',
    title: 'Beyond the Silent Orbit',
    premise: 'A covert engineer prevents a coup.',
    genre: 'science_fiction',
    subgenre: 'dystopian',
    targetWordCount: 18_000,
    targetChapters: 3,
    humanLikeWriting: true,
  },
  analysis: { themes: ['found family'] },
  outline: [
    {
      chapterNumber: 1,
      title: 'Signals in the Vent Core',
      summary: 'First chapter summary',
      keyEvents: ['event-1'],
      wordTarget: 5200,
    },
    {
      chapterNumber: 2,
      title: 'Trust Metrics',
      summary: 'Second chapter summary',
      keyEvents: ['event-2'],
      wordTarget: 5600,
    },
  ],
  chapters: [],
  metadata: {},
};

const FIXED_DATE = new Date('2025-10-04T00:00:00.000Z');

function createServices(overrides: Partial<StageServices>): StageServices {
  return {
    client: overrides.client!,
    emit: overrides.emit ?? jest.fn(),
    now: overrides.now ?? (() => FIXED_DATE),
    publishDomainEvent: overrides.publishDomainEvent ?? (() => undefined),
    logger:
      overrides.logger ??
      {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
  };
}

describe('ChapterStage', () => {
  it('generates all chapters and updates context with cost metadata', async () => {
    const generateChapterMock = jest.fn(async (input) => ({
      prompt: `prompt-${input.chapterOutline.chapterNumber}`,
      chapterNumber: input.chapterOutline.chapterNumber,
      content: `Chapter ${input.chapterOutline.chapterNumber} content words`,
      tokens: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      costInUsd: 0.42,
      raw: { model: 'gpt-4o' },
    }));

  const emit = jest.fn();
  const publishDomainEvent = jest.fn();
    const stage = new ChapterStage();
    const result = await stage.execute(
      BASE_CONTEXT,
      createServices({ client: new MockAiClient({ generateChapter: generateChapterMock }), emit, publishDomainEvent }),
    );

    expect(result.status).toBe('success');
    expect(result.context.chapters).toHaveLength(2);
    expect(result.context.chapters[0]).toMatchObject({
      chapterNumber: 1,
      content: 'Chapter 1 content words',
      costInUsd: 0.42,
      tokens: { totalTokens: 300 },
    });

    expect(result.metadata).toMatchObject({
      stage: 'chapter-stage',
      chaptersCompleted: 2,
      totalCostInUsd: 0.84,
      totalTokens: 600,
    });

    const costEvents = emit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'cost-tracking');
    expect(costEvents).toHaveLength(2);

    const domainEvents = publishDomainEvent.mock.calls.map(([event]) => event);
    expect(domainEvents.filter((event) => event.type === 'job-status-updated')).toHaveLength(5);
    expect(domainEvents.some((event) => event.type === 'chapter-progress' && event.status === 'ai_generating')).toBe(true);
    expect(domainEvents.some((event) => event.type === 'chapter-progress' && event.status === 'ai_completed')).toBe(true);
    expect(domainEvents.filter((event) => event.type === 'chapter-cost-tracked')).toHaveLength(2);
  });

  it('retries failed attempts and succeeds within max attempts', async () => {
    let attempts = 0;
    const generateChapterMock = jest.fn(async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('transient failure');
      }

      return {
        prompt: 'prompt-1',
        chapterNumber: 1,
        content: 'Recovered chapter content',
        tokens: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        costInUsd: 0.2,
        raw: { model: 'gpt-4o' },
      } as const;
    });

    const emit = jest.fn();
    const stage = new ChapterStage({ maxAttemptsPerChapter: 3 });

    const context = {
      ...BASE_CONTEXT,
      outline: [BASE_CONTEXT.outline![0]],
    } satisfies GenerationContext;

    const result = await stage.execute(context, createServices({ client: new MockAiClient({ generateChapter: generateChapterMock }), emit }));

    expect(result.context.chapters[0]?.content).toBe('Recovered chapter content');
    expect(generateChapterMock).toHaveBeenCalledTimes(2);

    const warnLogs = emit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'stage-log' && event.level === 'warn');
    expect(warnLogs).toHaveLength(1);
  });

  it('throws after exhausting max attempts', async () => {
    const generateChapterMock = jest.fn(async () => {
      throw new Error('permanent failure');
    });

    const emit = jest.fn();
    const stage = new ChapterStage({ maxAttemptsPerChapter: 2 });

    await expect(
      stage.execute(BASE_CONTEXT, createServices({ client: new MockAiClient({ generateChapter: generateChapterMock }), emit })),
    ).rejects.toThrow('permanent failure');

    const errorLogs = emit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'stage-log' && event.level === 'error');
    expect(errorLogs).toHaveLength(1);
  });
});
