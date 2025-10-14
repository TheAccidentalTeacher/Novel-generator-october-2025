import type {
  ChapterAttempt,
  ChapterGenerationResult,
  ChapterState,
  CompletionUsage,
  GenerationContext,
  IAiStage,
  StageMetadata,
  StageResult,
  StageServices,
} from '../contracts';
import type {
  JobProgressSnapshot,
  GenerationEvent,
  GenerationProgressEvent,
  CostTrackedEvent,
  JobUpdatedEvent,
} from '../events';
import type {
  ChapterCostTrackedDomainEvent,
  ChapterProgressDomainEvent,
  JobStatusUpdatedDomainEvent,
} from '../domainEvents';
import type { ChapterOutlineDetails, ExistingChapterSummary } from '../../prompts/novelGeneration';

export interface ChapterStageOptions {
  readonly maxAttemptsPerChapter?: number;
  readonly retryDelayMs?: number;
  readonly computeWordCount?: (content: string) => number;
}

export interface ChapterStageFailureSummary {
  readonly chaptersCompleted: number;
  readonly chaptersFailed: number;
  readonly failedChapterNumbers: readonly number[];
  readonly totalChapters: number;
  readonly chapterWordCounts: readonly number[];
  readonly totalWordCount: number;
}

export class ChapterStageFailureError extends Error {
  constructor(message: string, readonly summary: ChapterStageFailureSummary) {
    super(message);
    this.name = 'ChapterStageFailureError';
  }
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 0;

export class ChapterStage implements IAiStage<GenerationContext, StageResult<GenerationContext>> {
  readonly name = 'chapter-stage';

  private readonly maxAttemptsPerChapter: number;
  private readonly retryDelayMs: number;
  private readonly computeWordCount: (content: string) => number;

  constructor(options: ChapterStageOptions = {}) {
    this.maxAttemptsPerChapter = Math.max(1, options.maxAttemptsPerChapter ?? DEFAULT_MAX_ATTEMPTS);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
    this.computeWordCount = options.computeWordCount ?? ChapterStage.defaultWordCount;
  }

  async execute(context: GenerationContext, services: StageServices): Promise<StageResult<GenerationContext>> {
    if (!context.outline || context.outline.length === 0) {
      throw new Error('ChapterStage requires an outline before chapter generation can begin.');
    }

    const { job } = context;
    const outline = context.outline;
    const now = () => services.now?.() ?? new Date();
    const emit = (event: GenerationEvent) => services.emit(event);

    const chaptersMap = new Map<number, ChapterState>(context.chapters.map((chapter) => [chapter.chapterNumber, chapter] as const));
    let chaptersCompleted = this.countCompletedChapters(chaptersMap);
    let chaptersFailed = 0;
    let totalCostInUsd = this.sumCost(chaptersMap);
    let totalTokens = this.sumTokens(chaptersMap);
    const failedChapterNumbers: number[] = [];

    const buildProgressSnapshot = (completed: number, failed: number): JobProgressSnapshot => this.buildProgressSnapshot(
      outline.length,
      completed,
      failed,
      failedChapterNumbers,
    );

    const emitJobUpdate = (status: string, message: string): void => {
      const currentPhase: 'chapter_generation' = 'chapter_generation';
      const progress = buildProgressSnapshot(chaptersCompleted, chaptersFailed);
      const occurredAt = now();

      emit({
        type: 'job-update',
        status,
        currentPhase,
        message,
        progress,
        occurredAt,
        context: {
          jobId: job.jobId,
          currentPhase,
          chaptersCompleted,
          chaptersFailed,
          totalChapters: outline.length,
        },
      } satisfies JobUpdatedEvent);

      services.publishDomainEvent?.({
        type: 'job-status-updated',
        jobId: job.jobId,
        occurredAt,
        status,
        currentPhase,
        message,
        progress,
        context: {
          jobId: job.jobId,
          currentPhase,
          chaptersCompleted,
          chaptersFailed,
          totalChapters: outline.length,
        },
      } satisfies JobStatusUpdatedDomainEvent);
    };

    services.logger?.info('ChapterStage started', { jobId: job.jobId, remainingChapters: outline.length - chaptersCompleted });
    this.emitStageLog(services, job.jobId, 'info', 'Chapter generation started.', {
      chaptersCompleted,
      totalChapters: outline.length,
    });
    const shouldEmitChapterKickoff = job.humanLikeWriting ?? true;
    if (shouldEmitChapterKickoff) {
      emitJobUpdate('chapter_generation', 'Starting chapter generation...');
    }

    for (const chapterOutline of outline) {
      const existingState = chaptersMap.get(chapterOutline.chapterNumber);

      if (existingState && existingState.content) {
        // Already generated; ensure ordering preserved but skip generation work.
        continue;
      }

      const attemptLog: ChapterAttempt[] = [...(existingState?.attempts ?? [])];
      let lastError: Error | undefined;

      emitJobUpdate('chapter_generation', `Generating chapter ${chapterOutline.chapterNumber} of ${outline.length}...`);

      for (let attempt = 1; attempt <= this.maxAttemptsPerChapter; attempt += 1) {
        const attemptContext = {
          jobId: job.jobId,
          currentPhase: 'chapter_generation' as const,
          chaptersCompleted,
          chaptersFailed,
          totalChapters: outline.length,
        };

  this.emitProgressEvent(services, {
          type: 'generation-progress',
          chapterNumber: chapterOutline.chapterNumber,
          status: 'ai_generating',
          details: `Chapter ${chapterOutline.chapterNumber} drafting commenced (attempt ${attempt}).`,
          wordTarget: chapterOutline.wordTarget,
          occurredAt: now(),
          context: attemptContext,
        });

        try {
          const chapterResult = await services.client.generateChapter(
            this.buildChapterInput(chapterOutline, chaptersMap, context),
          );

          const wordCount = this.computeWordCount(chapterResult.content);
          const updatedState: ChapterState = {
            chapterNumber: chapterOutline.chapterNumber,
            title: chapterOutline.title,
            wordCount,
            prompt: chapterResult.prompt,
            content: chapterResult.content,
            costInUsd: chapterResult.costInUsd,
            tokens: chapterResult.tokens,
            attempts: [...attemptLog, this.toAttempt(chapterResult)],
          };

          chaptersMap.set(chapterOutline.chapterNumber, updatedState);
          chaptersCompleted += 1;
          totalCostInUsd += chapterResult.costInUsd;
          totalTokens += chapterResult.tokens.totalTokens;

          this.emitProgressEvent(services, {
            type: 'generation-progress',
            chapterNumber: chapterOutline.chapterNumber,
            status: 'ai_completed',
            details: `Chapter ${chapterOutline.chapterNumber} drafting completed (attempt ${attempt}).`,
            wordsGenerated: wordCount,
            occurredAt: now(),
            context: attemptContext,
          });

          const costEventOccurredAt = now();
          emit({
            type: 'cost-tracking',
            chapterNumber: chapterOutline.chapterNumber,
            model: chapterResult.raw && typeof (chapterResult.raw as { model?: string }).model === 'string'
              ? (chapterResult.raw as { model?: string }).model!
              : 'unknown',
            promptTokens: chapterResult.tokens.promptTokens,
            completionTokens: chapterResult.tokens.completionTokens,
            totalTokens: chapterResult.tokens.totalTokens,
            costInUsd: chapterResult.costInUsd,
            occurredAt: costEventOccurredAt,
            context: {
              jobId: job.jobId,
              currentPhase: 'chapter_generation',
              chaptersCompleted,
              chaptersFailed,
              totalChapters: outline.length,
            },
          } satisfies CostTrackedEvent);

          services.publishDomainEvent?.({
            type: 'chapter-cost-tracked',
            jobId: job.jobId,
            occurredAt: costEventOccurredAt,
            context: {
              jobId: job.jobId,
              currentPhase: 'chapter_generation',
              chaptersCompleted,
              chaptersFailed,
              totalChapters: outline.length,
            },
            chapterNumber: chapterOutline.chapterNumber,
            model: chapterResult.raw && typeof (chapterResult.raw as { model?: string }).model === 'string'
              ? (chapterResult.raw as { model?: string }).model!
              : 'unknown',
            promptTokens: chapterResult.tokens.promptTokens,
            completionTokens: chapterResult.tokens.completionTokens,
            totalTokens: chapterResult.tokens.totalTokens,
            costInUsd: chapterResult.costInUsd,
          } satisfies ChapterCostTrackedDomainEvent);

          emitJobUpdate(
            'chapter_generation',
            `Chapter ${chapterOutline.chapterNumber} completed. ${chaptersCompleted}/${outline.length} chapters done.`,
          );

          this.emitStageLog(services, job.jobId, 'info', 'Chapter generated successfully.', {
            chapterNumber: chapterOutline.chapterNumber,
            attempt,
            costInUsd: chapterResult.costInUsd,
            wordCount,
          });

          // Successful generation; proceed to next chapter.
          lastError = undefined;
          break;
        } catch (error) {
          const wrappedError = error instanceof Error ? error : new Error(String(error));
          lastError = wrappedError;

          this.emitStageLog(services, job.jobId, attempt === this.maxAttemptsPerChapter ? 'error' : 'warn', 'Chapter generation attempt failed.', {
            chapterNumber: chapterOutline.chapterNumber,
            attempt,
            maxAttempts: this.maxAttemptsPerChapter,
            error: wrappedError.message,
          });

          services.logger?.warn('Chapter generation attempt failed', {
            jobId: job.jobId,
            chapterNumber: chapterOutline.chapterNumber,
            attempt,
            error: wrappedError.message,
          });

          if (attempt === this.maxAttemptsPerChapter) {
            chaptersFailed += 1;
            if (!failedChapterNumbers.includes(chapterOutline.chapterNumber)) {
              failedChapterNumbers.push(chapterOutline.chapterNumber);
            }

            emitJobUpdate(
              'chapter_generation',
              `Chapter ${chapterOutline.chapterNumber} failed after ${this.maxAttemptsPerChapter} attempts. ${chaptersFailed} chapters failed.`,
            );

            const failureSummary = this.buildFailureSummary(
              chaptersMap,
              outline.length,
              failedChapterNumbers,
              chaptersCompleted,
              chaptersFailed,
            );

            throw new ChapterStageFailureError(`Stage "${this.name}" failed: ${wrappedError.message}`, failureSummary);
          }

          if (this.retryDelayMs > 0) {
            await ChapterStage.delay(this.retryDelayMs);
          }
        }
      }

      if (lastError) {
        // Should not reach here; defensive safeguard.
        throw lastError;
      }
    }

    const updatedMetadata = {
      ...context.metadata,
      chapterStage: {
        totalCostInUsd,
        totalTokens,
        chaptersCompleted,
        chaptersFailed,
        maxAttemptsPerChapter: this.maxAttemptsPerChapter,
      },
    } satisfies Record<string, unknown>;

    const updatedContext: GenerationContext = {
      ...context,
      chapters: this.sortChapters(chaptersMap),
      metadata: updatedMetadata,
    };

    const stageMetadata: StageMetadata = {
      stage: this.name,
      attempt: 1,
      chaptersCompleted,
      chaptersFailed,
      totalCostInUsd,
      totalTokens,
      maxAttempts: this.maxAttemptsPerChapter,
      failedChapterNumbers: [...failedChapterNumbers],
    };

    return {
      status: 'success',
      context: updatedContext,
      metadata: stageMetadata,
    };
  }

  private buildChapterInput(
    chapterOutline: ChapterOutlineDetails,
    chaptersMap: Map<number, ChapterState>,
    context: GenerationContext,
  ) {
    const chaptersSoFar: ExistingChapterSummary[] = this.completedChaptersSorted(chaptersMap)
      .filter((chapter) => chapter.chapterNumber < chapterOutline.chapterNumber)
      .map((chapter) => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount ?? null,
      }));

    return {
      title: context.job.title,
      premise: context.job.premise,
      genre: context.job.genre,
      subgenre: context.job.subgenre,
      targetChapters: context.job.targetChapters,
      humanLikeWriting: context.job.humanLikeWriting,
      analysis: context.analysis,
      chaptersSoFar,
      chapterOutline,
    };
  }

  private completedChaptersSorted(chaptersMap: Map<number, ChapterState>): ChapterState[] {
    return Array.from(chaptersMap.values())
      .filter((chapter) => Boolean(chapter.content))
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  private buildFailureSummary(
    chaptersMap: Map<number, ChapterState>,
    totalChapters: number,
    failedChapterNumbers: readonly number[],
    chaptersCompleted: number,
    chaptersFailed: number,
  ): ChapterStageFailureSummary {
    const completedChapters = this.completedChaptersSorted(chaptersMap);
    const chapterWordCounts = completedChapters.map((chapter) => chapter.wordCount ?? 0);
    const totalWordCount = chapterWordCounts.reduce((acc, count) => acc + count, 0);

    return {
      chaptersCompleted,
      chaptersFailed,
      failedChapterNumbers: [...failedChapterNumbers],
      totalChapters,
      chapterWordCounts,
      totalWordCount,
    } satisfies ChapterStageFailureSummary;
  }

  private sortChapters(chaptersMap: Map<number, ChapterState>): ChapterState[] {
    return Array.from(chaptersMap.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  private countCompletedChapters(chaptersMap: Map<number, ChapterState>): number {
    return Array.from(chaptersMap.values()).reduce((acc, chapter) => (chapter.content ? acc + 1 : acc), 0);
  }

  private sumCost(chaptersMap: Map<number, ChapterState>): number {
    return Array.from(chaptersMap.values()).reduce((acc, chapter) => acc + (chapter.costInUsd ?? 0), 0);
  }

  private sumTokens(chaptersMap: Map<number, ChapterState>): number {
    return Array.from(chaptersMap.values()).reduce((acc, chapter) => acc + (chapter.tokens?.totalTokens ?? 0), 0);
  }

  private toAttempt(result: ChapterGenerationResult): ChapterAttempt {
    return {
      prompt: result.prompt,
      content: result.content,
      tokens: { ...result.tokens },
      costInUsd: result.costInUsd,
      rawResponse: result.raw,
    };
  }

  private buildProgressSnapshot(
    totalChapters: number,
    completed: number,
    failed: number,
    failedChapterNumbers: readonly number[] = [],
  ): JobProgressSnapshot {
    const progress: JobProgressSnapshot = {
      outlineComplete: true,
      chaptersCompleted: completed,
      chaptersFailed: failed,
      totalChapters,
      hasFailures: failed > 0,
      ...(failed > 0 && failedChapterNumbers.length > 0
        ? { failedChapterNumbers: [...failedChapterNumbers] as readonly number[] }
        : {}),
    };

    return progress;
  }

  private emitStageLog(
    services: StageServices,
    jobId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    details?: Record<string, unknown>,
  ): void {
    services.emit({
      type: 'stage-log',
      stage: this.name,
      level,
      message,
      details,
      occurredAt: services.now?.() ?? new Date(),
      context: {
        jobId,
        currentPhase: 'chapter_generation',
      },
    });
  }

  private emitProgressEvent(services: StageServices, event: GenerationProgressEvent): void {
    services.emit(event);
    services.publishDomainEvent?.({
      type: 'chapter-progress',
      jobId: event.context?.jobId ?? 'unknown',
      occurredAt: event.occurredAt,
      context: event.context,
      chapterNumber: event.chapterNumber,
      status: event.status,
      details: event.details,
      wordTarget: event.wordTarget,
      wordsGenerated: event.wordsGenerated,
    } satisfies ChapterProgressDomainEvent);
  }

  private static defaultWordCount(content: string): number {
    return content.trim().length === 0 ? 0 : content.trim().split(/\s+/).length;
  }

  private static async delay(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
