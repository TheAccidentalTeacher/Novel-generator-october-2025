import {
  ExistingChapterSummary,
  buildChapterPrompt,
  buildOutlinePrompt,
} from '../../prompts/novelGeneration';
import {
  LEGACY_JOB_SNAPSHOT,
  LegacyJobSnapshot,
  LegacySnapshotSummary,
} from '../../golden-tests/fixtures/legacyJobSnapshot';
import { LEGACY_FAILURE_SNAPSHOT } from '../../golden-tests/fixtures/legacyFailureSnapshot';
import { generateNovel, MockAiClient } from '../../index';
import type { GenerationEvent, GenerationProgressEvent, JobProgressSnapshot as EngineJobProgressSnapshot } from '../../core/events';
import type { GenerationContext, StageLogger } from '../../core/contracts';

function summarizeSnapshot(snapshot: LegacyJobSnapshot): LegacySnapshotSummary {
  const { job, outlineCall, chapterCalls, eventLog } = snapshot;

  const outlineCost = Number(outlineCall.cost.toFixed(5));
  const chapterCosts = chapterCalls.map((call) => Number(call.cost.toFixed(5)));
  const totalCost = Number((outlineCost + chapterCosts.reduce((acc, cost) => acc + cost, 0)).toFixed(5));
  const tokensFromUsage = outlineCall.usage.totalTokens + chapterCalls.reduce((acc, call) => acc + call.usage.totalTokens, 0);

  const costEvents = eventLog.filter((event): event is Extract<typeof eventLog[number], { type: 'cost-tracking' }> => event.type === 'cost-tracking');
  const tokensFromEvents = costEvents.reduce((acc, event) => acc + event.tokensUsed, 0);

  const eventSequence = eventLog.map((event) => {
    switch (event.type) {
      case 'phase-transition':
        return `${event.type}:${event.from}->${event.to}`;
      case 'job-update':
        return `${event.type}:${event.message}`;
      case 'generation-progress':
        return `${event.type}:${event.chapterNumber}:${event.status}`;
      case 'cost-tracking':
        return `${event.type}:${event.chapterNumber}`;
      default: {
        const exhaustiveCheck: never = event;
        throw new Error(`Unhandled event type while summarizing legacy snapshot: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  });

  const chapterWordCounts = chapterCalls.map((call) => call.result.wordCount);
  const generationProgressByChapter = chapterCalls.map((call) => ({
    chapter: call.chapterNumber,
    statuses: eventLog
      .filter(
        (event): event is Extract<typeof eventLog[number], { type: 'generation-progress' }> =>
          event.type === 'generation-progress' && event.chapterNumber === call.chapterNumber,
      )
      .map((event) => event.status),
  }));

  const finalJobUpdate = [...eventLog].reverse().find((event): event is Extract<typeof eventLog[number], { type: 'job-update' }> => event.type === 'job-update');
  if (!finalJobUpdate) {
    throw new Error('Legacy snapshot missing terminal job-update event.');
  }

  return {
    jobId: job.jobId,
    outlineCost,
    chapterCosts,
    totalCost,
    tokensFromUsage,
    tokensFromEvents,
    chapterWordCounts,
    eventSequence,
    generationProgressByChapter,
    finalJobStatus: {
      status: finalJobUpdate.status,
      currentPhase: finalJobUpdate.currentPhase,
      message: finalJobUpdate.message,
      progress: finalJobUpdate.progress,
      qualityMetrics: finalJobUpdate.qualityMetrics,
    },
  };
}

describe('legacy ai engine golden snapshot parity', () => {
  it('rebuilds the outline prompt identically to the legacy snapshot', () => {
    const { jobId: _jobId, ...outlineInput } = LEGACY_JOB_SNAPSHOT.job;
    const rebuilt = buildOutlinePrompt(outlineInput);
    expect(rebuilt).toBe(LEGACY_JOB_SNAPSHOT.outlineCall.prompt);
  });

  it('rebuilds each chapter prompt identically to the legacy snapshot', () => {
    LEGACY_JOB_SNAPSHOT.chapterCalls.forEach((chapterCall, index) => {
      const chaptersSoFar = LEGACY_JOB_SNAPSHOT.chapterCalls
        .slice(0, index)
        .map((previous) => ({
          chapterNumber: previous.chapterNumber,
          title: LEGACY_JOB_SNAPSHOT.outlineCall.response.outline[previous.chapterNumber - 1]?.title ?? previous.chapterNumber.toString(),
          wordCount: previous.result.wordCount,
        }));

      const chapterPromptInput = {
        title: LEGACY_JOB_SNAPSHOT.job.title,
        premise: LEGACY_JOB_SNAPSHOT.job.premise,
        genre: LEGACY_JOB_SNAPSHOT.job.genre,
        subgenre: LEGACY_JOB_SNAPSHOT.job.subgenre,
        targetChapters: LEGACY_JOB_SNAPSHOT.job.targetChapters,
        humanLikeWriting: LEGACY_JOB_SNAPSHOT.job.humanLikeWriting,
        analysis: LEGACY_JOB_SNAPSHOT.analysisSummary,
        chaptersSoFar,
        chapterOutline: LEGACY_JOB_SNAPSHOT.outlineCall.response.outline[index],
      } as const;

      const rebuilt = buildChapterPrompt(chapterPromptInput);
      expect(rebuilt).toBe(chapterCall.prompt);
    });
  });

  it('summarizes the job snapshot consistently with the hand-authored summary', () => {
    const summary = summarizeSnapshot(LEGACY_JOB_SNAPSHOT);
    expect(summary).toEqual(LEGACY_JOB_SNAPSHOT.summary);
  });

  it('matches failure snapshot outline and chapter prompts', () => {
    const { outline, job, analysisSummary } = LEGACY_FAILURE_SNAPSHOT;

    const { jobId: _jobId, ...outlineInput } = job;
    const failureOutlinePrompt = buildOutlinePrompt(outlineInput);
    expect(failureOutlinePrompt).toBe(LEGACY_FAILURE_SNAPSHOT.outlineCall.prompt);

    LEGACY_FAILURE_SNAPSHOT.chapterOutcomes.forEach((outcome) => {
      const outlineDetails = outline[outcome.chapterNumber - 1];
      expect(outlineDetails).toBeDefined();

      const chaptersSoFar: ReadonlyArray<ExistingChapterSummary> = LEGACY_FAILURE_SNAPSHOT.chapterOutcomes
        .filter((o) => o.chapterNumber < outcome.chapterNumber && o.finalStatus === 'completed' && o.result)
        .map((o) => ({
          chapterNumber: o.chapterNumber,
          title: outline[o.chapterNumber - 1]?.title ?? `Chapter ${o.chapterNumber}`,
          wordCount: o.result?.wordCount ?? null,
        }));

      const promptInput = {
        title: job.title,
        premise: job.premise,
        genre: job.genre,
        subgenre: job.subgenre,
        targetChapters: job.targetChapters,
        humanLikeWriting: job.humanLikeWriting,
        analysis: analysisSummary,
        chaptersSoFar,
        chapterOutline: outlineDetails,
      } as const;

      const rebuiltPrompt = buildChapterPrompt(promptInput);
      outcome.attempts.forEach((attempt) => {
        expect(attempt.prompt).toBe(rebuiltPrompt);
      });
    });
  });

  it('replays the legacy snapshot through the novel generation engine and matches the golden summary', async () => {
    const analysisResult = {
      raw: '{}',
      analysis: LEGACY_JOB_SNAPSHOT.analysisSummary,
      tokens: { promptTokens: 2000, completionTokens: 1800, totalTokens: 3800 },
      costInUsd: 0.12,
    } as const;

    let capturedOutlineCall: LegacyJobSnapshot['outlineCall'] | undefined;
    const capturedChapterCalls: LegacyJobSnapshot['chapterCalls'][number][] = [];
    const emittedEvents: GenerationEvent[] = [];

    const mockClient = new MockAiClient({
      analyzePremise: async () => analysisResult,
      generateOutline: async (input) => {
        const prompt = buildOutlinePrompt(input);
        expect(prompt).toBe(LEGACY_JOB_SNAPSHOT.outlineCall.prompt);

        capturedOutlineCall = {
          model: LEGACY_JOB_SNAPSHOT.outlineCall.model,
          prompt,
          usage: LEGACY_JOB_SNAPSHOT.outlineCall.usage,
          cost: LEGACY_JOB_SNAPSHOT.outlineCall.cost,
          response: {
            outline: LEGACY_JOB_SNAPSHOT.outlineCall.response.outline,
          },
        };

        return {
          prompt,
          outline: LEGACY_JOB_SNAPSHOT.outlineCall.response.outline,
          analysis: null,
          raw: { outline: LEGACY_JOB_SNAPSHOT.outlineCall.response.outline },
          tokens: LEGACY_JOB_SNAPSHOT.outlineCall.usage,
          costInUsd: LEGACY_JOB_SNAPSHOT.outlineCall.cost,
        };
      },
      generateChapter: async (input) => {
        const callIndex = capturedChapterCalls.length;
        const expectedCall = LEGACY_JOB_SNAPSHOT.chapterCalls[callIndex];
        expect(expectedCall).toBeDefined();

        const prompt = buildChapterPrompt(input);
        expect(prompt).toBe(expectedCall.prompt);

        const content = generateChapterContent(expectedCall.result.wordCount, expectedCall.chapterNumber);

        capturedChapterCalls.push({
          chapterNumber: expectedCall.chapterNumber,
          model: expectedCall.model,
          prompt,
          usage: expectedCall.usage,
          cost: expectedCall.cost,
          result: expectedCall.result,
        });

        return {
          prompt,
          chapterNumber: expectedCall.chapterNumber,
          content,
          tokens: expectedCall.usage,
          costInUsd: expectedCall.cost,
          raw: { model: expectedCall.model },
        };
      },
    });

    const baseTimestamp = Date.parse('2024-07-19T00:00:01.000Z');
    let tick = 0;

    const stageLogger: StageLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const initialContext: GenerationContext = {
      job: LEGACY_JOB_SNAPSHOT.job,
      analysis: null,
      outline: [],
      chapters: [],
      metadata: {},
    };

    const result = await generateNovel(initialContext, {
      client: mockClient,
      emit: (event) => {
        emittedEvents.push(event as GenerationEvent);
      },
      publishDomainEvent: () => undefined,
      now: () => new Date(baseTimestamp + tick++ * 1000),
      logger: stageLogger,
    });

    expect(result.analysis).toEqual(LEGACY_JOB_SNAPSHOT.analysisSummary);
    expect(capturedOutlineCall).toBeDefined();
    expect(capturedChapterCalls).toHaveLength(LEGACY_JOB_SNAPSHOT.chapterCalls.length);
    expect(result.chapters.map((chapter) => chapter.wordCount)).toEqual(
      LEGACY_JOB_SNAPSHOT.chapterCalls.map((call) => call.result.wordCount),
    );

    const legacyLikeSnapshot: LegacyJobSnapshot = {
      job: LEGACY_JOB_SNAPSHOT.job,
      outlineCall: capturedOutlineCall!,
      chapterCalls: capturedChapterCalls,
      analysisSummary: result.analysis!,
      eventLog: convertEventsToLegacy(emittedEvents),
      summary: LEGACY_JOB_SNAPSHOT.summary,
    };

    const runtimeSummary = summarizeSnapshot(legacyLikeSnapshot);
    expect(runtimeSummary).toEqual(LEGACY_JOB_SNAPSHOT.summary);
  });
});

function generateChapterContent(wordCount: number, chapterNumber: number): string {
  return Array.from({ length: wordCount }, (_, index) => `chapter${chapterNumber}_${index + 1}`).join(' ');
}

type LegacyEventLike = typeof LEGACY_JOB_SNAPSHOT.eventLog[number];

function convertEventsToLegacy(events: GenerationEvent[]): ReadonlyArray<LegacyEventLike> {
  return events
    .flatMap((event): LegacyEventLike[] => {
      switch (event.type) {
        case 'stage-log':
          return [];
        case 'phase-transition':
          return [
            {
              type: 'phase-transition',
              timestamp: event.occurredAt.toISOString(),
              from: event.from,
              to: event.to,
              phase: event.description,
            },
          ];
        case 'job-update':
          return [
            {
              type: 'job-update',
              timestamp: event.occurredAt.toISOString(),
              status: event.status,
              currentPhase: event.currentPhase,
              message: event.message,
              progress: stripProgress(event.progress),
              ...(event.qualityMetrics ? { qualityMetrics: event.qualityMetrics } : {}),
            },
          ];
        case 'generation-progress':
          return [
            {
              type: 'generation-progress',
              timestamp: event.occurredAt.toISOString(),
              chapterNumber: event.chapterNumber,
              status: ensureProgressStatus(event.status),
              details: normalizeProgressDetails(event),
              ...(event.wordTarget !== undefined ? { wordTarget: event.wordTarget } : {}),
              ...(event.wordsGenerated !== undefined ? { wordsGenerated: event.wordsGenerated } : {}),
            },
          ];
        case 'cost-tracking':
          return [
            {
              type: 'cost-tracking',
              timestamp: event.occurredAt.toISOString(),
              chapterNumber: event.chapterNumber,
              model: 'gpt-4o',
              promptTokens: event.promptTokens,
              completionTokens: event.completionTokens,
              tokensUsed: event.totalTokens,
              chapterCost: Number(event.costInUsd.toFixed(4)),
            },
          ];
        default: {
          const exhaustiveCheck: never = event;
          throw new Error(`Unhandled event type while converting to legacy format: ${JSON.stringify(exhaustiveCheck)}`);
        }
      }
    })
    .map((event) => ({ ...event })) as ReadonlyArray<LegacyEventLike>;
}

function stripProgress(progress: EngineJobProgressSnapshot): LegacyEventLike extends { progress: infer P } ? P : never {
  return {
    outlineComplete: progress.outlineComplete,
    chaptersCompleted: progress.chaptersCompleted,
    chaptersFailed: progress.chaptersFailed,
    totalChapters: progress.totalChapters,
    hasFailures: progress.hasFailures,
  } as LegacyEventLike extends { progress: infer P } ? P : never;
}

function normalizeProgressDetails(event: GenerationProgressEvent): string {
  const status = ensureProgressStatus(event.status);

  if (status === 'ai_generating') {
    return `Chapter ${event.chapterNumber} drafting commenced`;
  }

  return `Chapter ${event.chapterNumber} drafting completed`;
}

function ensureProgressStatus(status: GenerationProgressEvent['status']): 'ai_generating' | 'ai_completed' {
  if (status === 'ai_generating' || status === 'ai_completed') {
    return status as 'ai_generating' | 'ai_completed';
  }

  throw new Error(`Unexpected generation-progress status: ${status}`);
}
