/// <reference types="jest" />
import { generateNovel } from '../index';
import type { IAiClient, IAiStage, GenerationContext } from '../core/contracts';

describe('generateNovel', () => {
  const baseContext: GenerationContext = {
    job: {
      jobId: 'job-123',
      title: 'Test Novel',
      premise: 'A hero saves the world',
      genre: 'Fantasy',
      subgenre: 'Epic Fantasy',
      targetWordCount: 1000,
      targetChapters: 3,
      humanLikeWriting: true,
      metadata: {},
    },
    analysis: null,
    outline: [],
    chapters: [],
    metadata: {},
  } satisfies GenerationContext;

  const noopClient: IAiClient = {
    analyzePremise: async () => {
      throw new Error('analyzePremise should not be called in tests');
    },
    generateOutline: async () => {
      throw new Error('generateOutline should not be called in tests');
    },
    generateChapter: async () => {
      throw new Error('generateChapter should not be called in tests');
    },
  } satisfies IAiClient;

  it('throws when called without an AI client', async () => {
    await expect(generateNovel(baseContext, {} as never)).rejects.toThrow('generateNovel requires an AI client.');
  });

  it('runs the engine with provided stages and services', async () => {
    const stage: IAiStage = {
      name: 'noop-stage',
      execute: async (context) => ({
        status: 'success',
        context: {
          ...context,
          metadata: {
            ...context.metadata,
            stageRan: true,
          },
        },
        metadata: {
          stage: 'noop-stage',
          attempt: 1,
        },
      }),
    } satisfies IAiStage;

    const emit = jest.fn();
    const logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const now = () => new Date('2024-06-01T12:00:00.000Z');

    const result = await generateNovel(baseContext, {
      client: noopClient,
      stages: [stage],
      emit,
      logger,
      now,
    });

    expect(result.metadata?.stageRan).toBe(true);
    const engineMeta =
      result.metadata && typeof result.metadata === 'object'
        ? ((result.metadata as Record<string, unknown>).engine as Record<string, unknown> | undefined)
        : undefined;
    expect(engineMeta?.lastCompletedStage).toBe('noop-stage');
    expect(Array.isArray(engineMeta?.stages) ? engineMeta?.stages?.length : 0).toBeGreaterThanOrEqual(1);
    expect(emit).toHaveBeenCalled();
  });
});
