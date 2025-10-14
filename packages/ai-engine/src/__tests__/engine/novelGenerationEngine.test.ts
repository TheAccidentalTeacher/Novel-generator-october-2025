import type { GenerationContext, IAiStage, StageMetadata, StageResult } from '../../core/contracts';
import { NovelGenerationEngine } from '../../core/engine/novelGenerationEngine';
import { MockAiClient } from '../../core/client/mockClient';
import { ChapterStageFailureError } from '../../core/stages/chapterStage';

const FIXED_DATE = new Date('2025-10-04T00:00:00.000Z');

const BASE_CONTEXT: GenerationContext = {
  job: {
    jobId: 'test-job',
    title: 'Test Title',
    premise: 'Premise',
    genre: 'science_fiction',
    subgenre: 'dystopian',
    targetWordCount: 10_000,
    targetChapters: 2,
    humanLikeWriting: true,
  },
  analysis: null,
  outline: [],
  chapters: [],
  metadata: {},
};

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const outlineChapters = [
  {
    chapterNumber: 1,
    title: 'Chapter One',
    summary: 'Intro summary',
    keyEvents: ['event-1'],
    wordTarget: 5000,
  },
  {
    chapterNumber: 2,
    title: 'Chapter Two',
    summary: 'Second summary',
    keyEvents: ['event-2'],
    wordTarget: 5200,
  },
] as const;

function cloneContext(): GenerationContext {
  return {
    ...BASE_CONTEXT,
    chapters: [...BASE_CONTEXT.chapters],
    metadata: { ...BASE_CONTEXT.metadata },
  } satisfies GenerationContext;
}

describe('NovelGenerationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs outline then chapter stages and aggregates metadata', async () => {
    const analysisResult = {
      raw: '{}',
      analysis: { themes: ['resilience'] },
      tokens: { promptTokens: 50, completionTokens: 75, totalTokens: 125 },
      costInUsd: 0.15,
    } as const;

    const outlineResult = {
      prompt: 'outline prompt',
      outline: outlineChapters,
      analysis: analysisResult.analysis,
      raw: { outline: outlineChapters },
      tokens: { promptTokens: 60, completionTokens: 80, totalTokens: 140 },
      costInUsd: 0.35,
    } as const;

    const generateChapter = jest.fn(async (input: Parameters<MockAiClient['generateChapter']>[0]) => ({
      prompt: `chapter-${input.chapterOutline.chapterNumber}-prompt`,
      chapterNumber: input.chapterOutline.chapterNumber,
      content: `Content for chapter ${input.chapterOutline.chapterNumber}`,
      tokens: { promptTokens: 120, completionTokens: 210, totalTokens: 330 },
      costInUsd: 0.42,
      raw: { model: 'gpt-4o-mini' },
    }));

  const emit = jest.fn();
  const publishDomainEvent = jest.fn();

    const client = new MockAiClient({
      analyzePremise: async () => analysisResult,
      generateOutline: async () => outlineResult,
      generateChapter,
    });

    const engine = new NovelGenerationEngine({
      services: {
        client,
        emit,
        publishDomainEvent,
        now: () => FIXED_DATE,
        logger,
      },
    });

    const result = await engine.run(cloneContext());

    expect(result.analysis).toEqual(analysisResult.analysis);
    expect(result.outline).toEqual(outlineChapters);
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toMatchObject({
      chapterNumber: 1,
      content: 'Content for chapter 1',
    });

    const engineMetadata = (result.metadata?.engine ?? {}) as Record<string, unknown>;
    expect(engineMetadata).toMatchObject({
      lastCompletedStage: 'chapter-stage',
      completedAt: FIXED_DATE,
    });

    expect(Array.isArray(engineMetadata.stages)).toBe(true);
    const stageNames = (engineMetadata.stages as StageMetadata[]).map((metadata) => metadata.stage);
    expect(stageNames).toEqual(['outline-stage', 'chapter-stage']);

    expect(generateChapter).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalled();

    const domainEvents = publishDomainEvent.mock.calls.map(([event]) => event);
    expect(domainEvents.some((event) => event.type === 'phase-transitioned')).toBe(true);
    const completionEvent = domainEvents.find((event) => event.type === 'job-completed');
    expect(completionEvent).toMatchObject({
      status: 'completed',
      progress: expect.objectContaining({ chaptersCompleted: 2, chaptersFailed: 0 }),
    });
  });

  it('emits phase transitions and stage lifecycle logs', async () => {
    const emit = jest.fn();
    const publishDomainEvent = jest.fn();

    const client = new MockAiClient({
      analyzePremise: async () => ({
        raw: '{}',
        analysis: { themes: [] },
        tokens: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        costInUsd: 0.01,
      }),
      generateOutline: async () => ({
        prompt: 'outline',
        outline: outlineChapters,
        analysis: null,
        raw: {},
        tokens: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        costInUsd: 0.02,
      }),
      generateChapter: async (input) => ({
        prompt: `chapter-${input.chapterOutline.chapterNumber}`,
        chapterNumber: input.chapterOutline.chapterNumber,
        content: `Chapter ${input.chapterOutline.chapterNumber} body`,
        tokens: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        costInUsd: 0.03,
        raw: { model: 'gpt-4o-mini' },
      }),
    });

    const engine = new NovelGenerationEngine({
      services: {
        client,
        emit,
        publishDomainEvent,
        now: () => FIXED_DATE,
        logger,
      },
    });

    await engine.run(cloneContext());

    const events = emit.mock.calls.map(([event]) => event);
  const phaseTransitions = events.filter((event) => event.type === 'phase-transition');
  expect(phaseTransitions).toHaveLength(1);
  expect(phaseTransitions[0]).toMatchObject({ from: 'initialization', to: 'outlining' });

    const stageLogs = events.filter((event) => event.type === 'stage-log');
    const messages = stageLogs.map((event) => event.message);
    expect(messages).toEqual(expect.arrayContaining([
      'Stage execution started.',
      'Stage execution completed.',
    ]));

    const outlineStartLog = stageLogs.find((event) => event.stage === 'outline-stage' && event.message === 'Stage execution started.');
  expect(outlineStartLog?.context).toMatchObject({ jobId: BASE_CONTEXT.job.jobId, currentPhase: 'outlining' });

    const domainEvents = publishDomainEvent.mock.calls.map(([event]) => event);
    expect(domainEvents.filter((event) => event.type === 'phase-transitioned')).toHaveLength(1);
  });

  it('wraps stage errors and emits failure log', async () => {
    class FailingStage implements IAiStage {
      readonly name = 'failing-stage';

      async execute(): Promise<StageResult> {
        throw new Error('kaboom');
      }
    }

    const emit = jest.fn();

    const publishDomainEvent = jest.fn();

    const engine = new NovelGenerationEngine({
      stages: [new FailingStage()],
      services: {
        emit,
        publishDomainEvent,
        client: new MockAiClient({}),
        now: () => FIXED_DATE,
        logger,
      },
    });

    await expect(engine.run(cloneContext())).rejects.toThrow('Stage "failing-stage" failed: kaboom');

    const errorLogs = emit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'stage-log' && event.level === 'error' && event.stage === 'failing-stage');

    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]).toMatchObject({
      message: 'Stage execution failed.',
      details: expect.objectContaining({ error: 'kaboom' }),
    });
  });

  it('emits failure completion summary with legacy estimated completion when chapter stage fails', async () => {
    const emit = jest.fn();
    const publishDomainEvent = jest.fn();

    const failureSummary = {
      chaptersCompleted: 1,
      chaptersFailed: 1,
      failedChapterNumbers: [2],
      totalChapters: 2,
      chapterWordCounts: [1012],
      totalWordCount: 1012,
    } as const;

    class OutlineStub implements IAiStage {
      readonly name = 'outline-stage';

      async execute(context: GenerationContext): Promise<StageResult<GenerationContext>> {
        return {
          status: 'success',
          context: {
            ...context,
            outline: [
              {
                chapterNumber: 1,
                title: 'Chapter 1',
                summary: 'Summary',
                keyEvents: ['event'],
                wordTarget: 1000,
              },
              {
                chapterNumber: 2,
                title: 'Chapter 2',
                summary: 'Summary',
                keyEvents: ['event'],
                wordTarget: 1000,
              },
            ],
          },
          metadata: { stage: 'outline-stage', attempt: 1 },
        } satisfies StageResult<GenerationContext>;
      }
    }

    class ChapterStub implements IAiStage {
      readonly name = 'chapter-stage';

      async execute(context: GenerationContext): Promise<StageResult<GenerationContext>> {
        throw new ChapterStageFailureError('chapter stage failed', failureSummary);
      }
    }

    const context: GenerationContext = {
      ...BASE_CONTEXT,
      job: {
        ...BASE_CONTEXT.job,
        jobId: 'legacy-job-2024-07-20T04:15:30Z',
      },
    };

    const engine = new NovelGenerationEngine({
      stages: [new OutlineStub(), new ChapterStub()],
      services: {
        emit,
        publishDomainEvent,
        client: new MockAiClient({}),
        now: () => FIXED_DATE,
        logger,
      },
    });

    await expect(engine.run(context)).rejects.toThrow('chapter stage failed');

    const jobUpdates = emit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.type === 'job-update' && event.status === 'completed');

    expect(jobUpdates).toHaveLength(1);
    expect(jobUpdates[0]).toMatchObject({
      message: 'Novel completed with 1/2 chapters. 1 chapters failed and can be retried.',
      progress: {
        chaptersCompleted: 1,
        chaptersFailed: 1,
        hasFailures: true,
        failedChapterNumbers: [2],
        estimatedCompletion: '2024-07-20T04:21:30.000Z',
      },
    });

    const domainEvents = publishDomainEvent.mock.calls.map(([event]) => event);
    const failureCompletion = domainEvents.find((event) => event.type === 'job-completed');
    expect(failureCompletion).toMatchObject({
      message: 'Novel completed with 1/2 chapters. 1 chapters failed and can be retried.',
      progress: expect.objectContaining({ chaptersFailed: 1, estimatedCompletion: '2024-07-20T04:21:30.000Z' }),
    });
  });
});
