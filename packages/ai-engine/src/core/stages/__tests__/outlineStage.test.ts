import { OutlineStage } from '../outlineStage';
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
  analysis: null,
  outline: [],
  chapters: [],
  metadata: {},
};

const FIXED_DATE = new Date('2025-10-04T00:00:00.000Z');

function createServices(overrides: Partial<StageServices> = {}): StageServices {
  return {
    client: overrides.client!,
    emit: overrides.emit ?? (() => undefined),
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

describe('OutlineStage', () => {
  it('generates analysis and outline, updating context and emitting logs', async () => {
    const analysisResult = {
      raw: '{"themes":["found family"]}',
      analysis: { themes: ['found family'] },
      tokens: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      costInUsd: 0.25,
    } as const;

    const outline = [
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
      {
        chapterNumber: 3,
        title: 'Orbit of Witnesses',
        summary: 'Third chapter summary',
        keyEvents: ['event-3'],
        wordTarget: 5200,
      },
    ] as const;

    const outlineResult = {
      prompt: 'outline prompt',
      outline,
      analysis: null,
      raw: { outline },
      tokens: { promptTokens: 150, completionTokens: 250, totalTokens: 400 },
      costInUsd: 0.45,
    } as const;

  const emit = jest.fn();
  const publishDomainEvent = jest.fn();

    const stage = new OutlineStage();
    const client = new MockAiClient({
      analyzePremise: async () => analysisResult,
      generateOutline: async () => outlineResult,
    });

  const result = await stage.execute(BASE_CONTEXT, createServices({ client, emit, publishDomainEvent }));

    expect(result.status).toBe('success');
    expect(result.context.analysis).toEqual(analysisResult.analysis);
    expect(result.context.outline).toEqual(outline);
    expect(result.context.chapters).toHaveLength(3);
    expect(result.context.chapters[0]).toMatchObject({
      chapterNumber: 1,
      title: 'Signals in the Vent Core',
    });

    expect(result.metadata).toMatchObject({
      stage: 'outline-stage',
      outlineCostInUsd: outlineResult.costInUsd,
      outlineTokens: outlineResult.tokens,
      premiseAnalysisCostInUsd: analysisResult.costInUsd,
    });

    expect(emit).toHaveBeenCalled();
    const messages = emit.mock.calls.map(([event]) => event.message ?? event.details?.message ?? null);
    expect(messages.some((m) => m === 'Outline generation completed successfully.')).toBe(true);

    expect(publishDomainEvent).toHaveBeenCalledTimes(2);
    expect(publishDomainEvent).toHaveBeenNthCalledWith(1, {
      type: 'job-status-updated',
      jobId: BASE_CONTEXT.job.jobId,
      occurredAt: FIXED_DATE,
      status: 'outline_pending',
      currentPhase: 'outline_generation',
      message: 'Creating detailed chapter outline from synopsis...',
      progress: {
        outlineComplete: false,
        chaptersCompleted: 0,
        chaptersFailed: 0,
        totalChapters: BASE_CONTEXT.job.targetChapters ?? 0,
        hasFailures: false,
      },
      context: {
        jobId: BASE_CONTEXT.job.jobId,
        currentPhase: 'outline_generation',
        totalChapters: BASE_CONTEXT.job.targetChapters ?? 0,
      },
    });
    expect(publishDomainEvent).toHaveBeenNthCalledWith(2, {
      type: 'job-status-updated',
      jobId: BASE_CONTEXT.job.jobId,
      occurredAt: FIXED_DATE,
      status: 'outline_complete',
      currentPhase: 'chapter_generation',
      message: 'Outline completed. Starting chapter generation...',
      progress: {
        outlineComplete: false,
        chaptersCompleted: 0,
        chaptersFailed: 0,
        totalChapters: BASE_CONTEXT.job.targetChapters ?? 0,
        hasFailures: false,
      },
      context: {
        jobId: BASE_CONTEXT.job.jobId,
        currentPhase: 'chapter_generation',
        totalChapters: BASE_CONTEXT.job.targetChapters ?? 0,
      },
    });
  });

  it('skips premise analysis when context already provides it', async () => {
    const outlineResult = {
      prompt: 'outline prompt',
      outline: [
        {
          chapterNumber: 1,
          title: 'Signals in the Vent Core',
          summary: 'First chapter summary',
          keyEvents: ['event-1'],
          wordTarget: 5200,
        },
      ],
      analysis: null,
      raw: {},
      tokens: { promptTokens: 150, completionTokens: 250, totalTokens: 400 },
      costInUsd: 0.45,
    } as const;

    const emit = jest.fn();
    const analyzePremiseSpy = jest.fn();
    const stage = new OutlineStage();
    const client = new MockAiClient({
      analyzePremise: analyzePremiseSpy,
      generateOutline: async () => outlineResult,
    });

    const contextWithAnalysis: GenerationContext = {
      ...BASE_CONTEXT,
      analysis: { themes: ['found family'] },
    };

    const result = await stage.execute(contextWithAnalysis, createServices({ client, emit }));

    expect(result.status).toBe('success');
    expect(analyzePremiseSpy).not.toHaveBeenCalled();
    expect(result.context.analysis).toEqual(contextWithAnalysis.analysis);
  });

  it('propagates errors and emits failure log when outline generation fails', async () => {
    const stage = new OutlineStage();
    const emit = jest.fn();
    const error = new Error('outline failed');
    const client = new MockAiClient({
      analyzePremise: async () => ({
        raw: '{}',
        analysis: { themes: [] },
        tokens: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
        costInUsd: 0.01,
      }),
      generateOutline: async () => {
        throw error;
      },
    });

    await expect(stage.execute(BASE_CONTEXT, createServices({ client, emit }))).rejects.toThrow(error);

    expect(emit).toHaveBeenCalled();
    const errorEvents = emit.mock.calls.filter(([event]) => event.type === 'stage-log' && event.level === 'error');
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0][0]).toMatchObject({
      message: 'Outline generation failed.',
      details: expect.objectContaining({ error: error.message }),
    });
  });
});
