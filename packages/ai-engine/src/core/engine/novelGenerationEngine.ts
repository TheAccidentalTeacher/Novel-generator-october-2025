import type { GenerationContext, IAiStage, StageMetadata, StageServices } from '../contracts';
import { OutlineStage } from '../stages/outlineStage';
import { ChapterStage, ChapterStageFailureError, ChapterStageFailureSummary } from '../stages/chapterStage';
import type { GenerationContextSnapshot, PhaseIdentifier, JobProgressSnapshot, QualityMetricsSnapshot } from '../events';
import type { JobCompletedDomainEvent, PhaseTransitionedDomainEvent } from '../domainEvents';

export interface NovelGenerationEngineOptions {
  readonly stages?: ReadonlyArray<IAiStage>;
  readonly services?: Partial<StageServices>;
}

export class NovelGenerationEngine {
  private readonly stages: ReadonlyArray<IAiStage>;
  private readonly services: StageServices;

  constructor(options: NovelGenerationEngineOptions = {}) {
    this.stages = options.stages ?? [new OutlineStage(), new ChapterStage()];
    this.services = {
      client: options.services?.client ?? {
        analyzePremise: async () => {
          throw new Error('AI client not configured.');
        },
        generateOutline: async () => {
          throw new Error('AI client not configured.');
        },
        generateChapter: async () => {
          throw new Error('AI client not configured.');
        },
      },
      emit: options.services?.emit ?? (() => undefined),
      publishDomainEvent: options.services?.publishDomainEvent ?? (() => undefined),
      now: options.services?.now,
      logger: options.services?.logger ?? {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    };
  }

  async run(initialContext: GenerationContext): Promise<GenerationContext> {
    if (this.stages.length === 0) {
      throw new Error('NovelGenerationEngine configured without stages.');
    }

    const context: GenerationContext = {
      ...initialContext,
      chapters: [...initialContext.chapters],
    };

    const stageHistory: StageMetadata[] = [];
    let currentPhase: PhaseIdentifier = 'initialization';

    this.services.logger?.info?.('NovelGenerationEngine run started', {
      jobId: context.job.jobId,
      stages: this.stages.map((stage) => stage.name),
    });

    for (const [index, stage] of this.stages.entries()) {
      const { phase: nextPhase, description } = this.resolvePhase(stage.name);

      if (index === 0 && currentPhase !== nextPhase) {
        this.emitPhaseTransition(currentPhase, nextPhase, description, context);
      }

      currentPhase = nextPhase;

      this.emitStageLog(stage.name, 'info', 'Stage execution started.', context, currentPhase, {
        stage: stage.name,
      });

      this.services.logger?.info?.('Executing stage', {
        stage: stage.name,
        jobId: context.job.jobId,
        phase: currentPhase,
      });

      try {
        const result = await stage.execute(context, this.services);

        if (result.status !== 'success') {
          const level = result.status === 'retryable-failure' ? 'warn' : 'error';

          this.emitStageLog(stage.name, level, `Stage returned status "${result.status}".`, context, currentPhase, result.metadata);

          throw new Error(`Stage "${stage.name}" returned status "${result.status}".`);
        }

        if (result.metadata) {
          stageHistory.push(result.metadata);
        }

        Object.assign(context, result.context);

        this.emitStageLog(stage.name, 'info', 'Stage execution completed.', context, currentPhase, result.metadata);
      } catch (error) {
        const wrappedError = error instanceof Error ? error : new Error(String(error));

        this.emitStageLog(stage.name, 'error', 'Stage execution failed.', context, currentPhase, {
          stage: stage.name,
          error: wrappedError.message,
        });

        this.services.logger?.error?.('Stage execution failed', {
          stage: stage.name,
          jobId: context.job.jobId,
          phase: currentPhase,
          error: wrappedError.message,
        });

        if (error instanceof ChapterStageFailureError) {
          this.emitFailureCompletion(context, error.summary);
          throw error;
        }

        const failure = new Error(`Stage "${stage.name}" failed: ${wrappedError.message}`);
        (failure as { cause?: Error }).cause = wrappedError;
        throw failure;
      }
    }

    const completedAt = this.now();

    const finalContext: GenerationContext = stageHistory.length === 0
      ? {
          ...context,
          metadata: this.mergeMetadata(context.metadata, {
            engine: {
              completedAt,
              stages: [],
              lastCompletedStage: null,
            },
          }),
        }
      : {
          ...context,
          metadata: this.mergeMetadata(context.metadata, {
            engine: {
              lastCompletedStage: stageHistory[stageHistory.length - 1]?.stage ?? null,
              completedAt,
              stages: stageHistory,
            },
          }),
        };

  this.emitSuccessCompletion(finalContext);

    this.services.logger?.info?.('NovelGenerationEngine run completed', {
      jobId: finalContext.job.jobId,
      phase: 'completed',
    });

    return finalContext;
  }

  private mergeMetadata(
    existing: GenerationContext['metadata'],
    additions: Record<string, unknown>,
  ): GenerationContext['metadata'] {
    const base: Record<string, unknown> = existing ? { ...existing } : {};

    for (const [key, value] of Object.entries(additions)) {
      if (key === 'engine' && this.isRecord(value)) {
        const existingEngine = this.isRecord(base.engine) ? base.engine : {};
        base.engine = {
          ...existingEngine,
          ...value,
        };
        continue;
      }

      (base as Record<string, unknown>)[key] = value;
    }

    return base;
  }

  private emitSuccessCompletion(context: GenerationContext): void {
    const stats = this.buildStatsFromContext(context);
    const qualityMetrics = this.computeQualityMetrics(context.job, stats);
    const progress = this.buildJobProgress(
      stats.totalChapters,
      stats.chaptersCompleted,
      stats.chaptersFailed,
      stats.failedChapterNumbers,
    );
    const occurredAt = this.now();
    const contextSnapshot = this.snapshot(context, 'completed');

    this.services.emit({
      type: 'job-update',
      status: 'completed',
      currentPhase: 'completed',
      message: 'Novel generation completed successfully!',
      progress,
      qualityMetrics,
      occurredAt,
      context: contextSnapshot,
    });

    this.services.publishDomainEvent?.({
      type: 'job-completed',
      jobId: context.job.jobId,
      occurredAt,
      status: 'completed',
      currentPhase: 'completed',
      message: 'Novel generation completed successfully!',
      progress,
      qualityMetrics,
      context: contextSnapshot,
    } satisfies JobCompletedDomainEvent);
  }

  private emitFailureCompletion(context: GenerationContext, summary: ChapterStageFailureSummary): void {
    const estimatedCompletion = this.estimateFailureCompletion(context.job, summary);
    const progress = this.buildJobProgress(
      summary.totalChapters,
      summary.chaptersCompleted,
      summary.chaptersFailed,
      summary.failedChapterNumbers,
      estimatedCompletion ? { estimatedCompletion } : undefined,
      { includeOutlineComplete: false, includeTotalChapters: false },
    );
    const qualityMetrics = this.computeQualityMetrics(context.job, summary);
    const occurredAt = this.now();
    const contextSnapshot = this.snapshot(context, 'completed');

    this.services.emit({
      type: 'job-update',
      status: 'completed',
      currentPhase: 'completed',
      message: `Novel completed with ${summary.chaptersCompleted}/${summary.totalChapters} chapters. ${summary.chaptersFailed} chapters failed and can be retried.`,
      progress,
      qualityMetrics,
      occurredAt,
      context: contextSnapshot,
    });

    this.services.publishDomainEvent?.({
      type: 'job-completed',
      jobId: context.job.jobId,
      occurredAt,
      status: 'completed',
      currentPhase: 'completed',
      message: `Novel completed with ${summary.chaptersCompleted}/${summary.totalChapters} chapters. ${summary.chaptersFailed} chapters failed and can be retried.`,
      progress,
      qualityMetrics,
      context: contextSnapshot,
    } satisfies JobCompletedDomainEvent);
  }

  private buildStatsFromContext(context: GenerationContext): ChapterStageFailureSummary {
    const completedChapters = context.chapters.filter((chapter) => Boolean(chapter.content));
    const chapterWordCounts = completedChapters.map((chapter) => chapter.wordCount ?? 0);
    const totalWordCount = chapterWordCounts.reduce((acc, count) => acc + count, 0);
    const totalChapters = context.outline?.length ?? context.job.targetChapters ?? context.chapters.length;

    const metadata = this.extractChapterStageMetadata(context);
    const chaptersFailed = metadata && typeof metadata.chaptersFailed === 'number' ? metadata.chaptersFailed : 0;
    const failedChapterNumbers = metadata && Array.isArray(metadata.failedChapterNumbers)
      ? (metadata.failedChapterNumbers as number[])
      : [];

    return {
      chaptersCompleted: completedChapters.length,
      chaptersFailed,
      failedChapterNumbers,
      totalChapters,
      chapterWordCounts,
      totalWordCount,
    } satisfies ChapterStageFailureSummary;
  }

  private buildJobProgress(
    totalChapters: number,
    chaptersCompleted: number,
    chaptersFailed: number,
    failedChapterNumbers: readonly number[] = [],
    overrides: Partial<JobProgressSnapshot> = {},
    options: { includeOutlineComplete?: boolean; includeTotalChapters?: boolean } = {},
  ): JobProgressSnapshot {
    const includeOutlineComplete = options.includeOutlineComplete ?? true;
    const includeTotalChapters = options.includeTotalChapters ?? true;

    return {
      ...(includeOutlineComplete ? { outlineComplete: chaptersCompleted > 0 } : {}),
      chaptersCompleted,
      chaptersFailed,
      ...(includeTotalChapters ? { totalChapters } : {}),
      hasFailures: chaptersFailed > 0,
      ...(failedChapterNumbers.length > 0 ? { failedChapterNumbers: [...failedChapterNumbers] } : {}),
      ...overrides,
    } as JobProgressSnapshot;
  }

  private computeQualityMetrics(
    job: GenerationContext['job'],
    stats: ChapterStageFailureSummary,
  ): QualityMetricsSnapshot {
    const { chapterWordCounts, totalWordCount, chaptersCompleted, chaptersFailed, failedChapterNumbers, totalChapters } = stats;
    const averageChapterLength = chaptersCompleted > 0 ? Math.floor(totalWordCount / chaptersCompleted) : 0;
    const completionRate = totalChapters > 0 ? Math.round((chaptersCompleted / totalChapters) * 100) : 0;
    const targetAccuracy = this.computeTargetAccuracy(totalWordCount, chaptersFailed);

    return {
      averageChapterLength,
      totalWordCount,
      targetAccuracy,
      completionRate,
      chaptersCompleted,
      chaptersFailed,
      hasFailures: chaptersFailed > 0,
      failedChapters: [...failedChapterNumbers],
    } satisfies QualityMetricsSnapshot;
  }

  private computeTargetAccuracy(totalWordCount: number, chaptersFailed: number): number {
    if (totalWordCount <= 0) {
      return 0;
    }

    const divisor = chaptersFailed > 0 ? 12 : 24;
    return Math.round(totalWordCount / divisor);
  }

  private estimateFailureCompletion(
    job: GenerationContext['job'],
    summary: ChapterStageFailureSummary,
  ): string | undefined {
    const remainingChapters = Math.max(summary.totalChapters - summary.chaptersCompleted, 0);
    if (remainingChapters <= 0) {
      return undefined;
    }

    const baseTimestamp = this.extractTimestampFromJobId(job.jobId);
    if (!baseTimestamp) {
      return undefined;
    }

    const baseDate = new Date(baseTimestamp);
    if (Number.isNaN(baseDate.getTime())) {
      return undefined;
    }

    const minutesPerChapter = 6;
    const estimatedDate = new Date(baseDate.getTime() + remainingChapters * minutesPerChapter * 60 * 1000);
    return estimatedDate.toISOString();
  }

  private extractTimestampFromJobId(jobId: string): string | undefined {
    const match = jobId.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
    return match?.[0];
  }

  private extractChapterStageMetadata(context: GenerationContext): (Record<string, unknown> & {
    chaptersFailed?: unknown;
    failedChapterNumbers?: unknown;
  }) | undefined {
    if (!context.metadata || !this.isRecord(context.metadata)) {
      return undefined;
    }

    const stageMetadata = (context.metadata as Record<string, unknown>).chapterStage;
    if (!this.isRecord(stageMetadata)) {
      return undefined;
    }

    return stageMetadata as Record<string, unknown> & {
      chaptersFailed?: unknown;
      failedChapterNumbers?: unknown;
    };
  }

  private resolvePhase(stageName: string): { phase: PhaseIdentifier; description: string } {
    switch (stageName) {
      case 'outline-stage':
        return {
          phase: 'outlining',
          description: 'Creating detailed outline from synopsis',
        };
      case 'chapter-stage':
        return {
          phase: 'chapter_generation',
          description: 'Generating chapters from outline',
        };
      default:
        return {
          phase: stageName as PhaseIdentifier,
          description: `Executing stage ${stageName}`,
        };
    }
  }

  private emitPhaseTransition(
    from: PhaseIdentifier,
    to: PhaseIdentifier,
    description: string,
    context: GenerationContext,
  ): void {
    const occurredAt = this.now();
    const contextSnapshot = this.snapshot(context, to);

    this.services.emit({
      type: 'phase-transition',
      from,
      to,
      description,
      occurredAt,
      context: contextSnapshot,
    });

    this.services.publishDomainEvent?.({
      type: 'phase-transitioned',
      jobId: context.job.jobId,
      occurredAt,
      from,
      to,
      description,
      context: contextSnapshot,
    } satisfies PhaseTransitionedDomainEvent);
  }

  private emitStageLog(
    stage: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    context: GenerationContext,
    phase: PhaseIdentifier,
    details?: Record<string, unknown>,
  ): void {
    this.services.emit({
      type: 'stage-log',
      stage,
      level,
      message,
      details,
      occurredAt: this.now(),
      context: this.snapshot(context, phase),
    });
  }

  private snapshot(context: GenerationContext, phase: PhaseIdentifier): GenerationContextSnapshot {
    const chaptersCompleted = context.chapters.reduce(
      (total, chapter) => (chapter.content ? total + 1 : total),
      0,
    );

    const chaptersFailed = this.extractFailedChapters(context);

    const totalChapters = context.outline?.length ?? context.job.targetChapters ?? context.chapters.length;

    return {
      jobId: context.job.jobId,
      currentPhase: phase,
      chaptersCompleted,
      chaptersFailed: chaptersFailed > 0 ? chaptersFailed : undefined,
      totalChapters,
    } satisfies GenerationContextSnapshot;
  }

  private extractFailedChapters(context: GenerationContext): number {
    const chapterStageMetadata = context.metadata && this.isRecord(context.metadata.chapterStage)
      ? context.metadata.chapterStage
      : undefined;

    if (chapterStageMetadata && typeof chapterStageMetadata.chaptersFailed === 'number') {
      return chapterStageMetadata.chaptersFailed;
    }

    return 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private now(): Date {
    return this.services.now?.() ?? new Date();
  }
}
