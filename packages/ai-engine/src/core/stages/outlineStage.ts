import type {
  ChapterState,
  GenerationContext,
  IAiStage,
  StageResult,
  StageServices,
  StageMetadata,
  PremiseAnalysisResult,
} from '../contracts';
import type { StageLogEvent, JobProgressSnapshot } from '../events';
import type { JobStatusUpdatedDomainEvent } from '../domainEvents';

const OUTLINE_STAGE_NAME = 'outline-stage' as const;

export class OutlineStage implements IAiStage<GenerationContext, StageResult<GenerationContext>> {
  readonly name = OUTLINE_STAGE_NAME;

  async execute(context: GenerationContext, services: StageServices): Promise<StageResult<GenerationContext>> {
    const { job } = context;
    const attempt = 1;
    const now = () => services.now?.() ?? new Date();

    const totalChapters = job.targetChapters ?? context.outline?.length ?? 0;

    const buildProgress = (completed: number, failed: number): JobProgressSnapshot => ({
      outlineComplete: completed > 0,
      chaptersCompleted: completed,
      chaptersFailed: failed,
      totalChapters,
      hasFailures: failed > 0,
    });

    const emitStageLog = (event: Pick<StageLogEvent, 'level' | 'message' | 'details'>) => {
      services.emit({
        type: 'stage-log',
        stage: this.name,
        level: event.level,
        message: event.message,
        details: event.details,
        occurredAt: now(),
        context: {
          jobId: job.jobId,
          currentPhase: 'outline_generation',
          totalChapters: job.targetChapters,
        },
      });
    };

    const emitJobUpdate = (
      status: string,
      currentPhase: 'outline_generation' | 'chapter_generation',
      message: string,
    ): void => {
      const occurredAt = now();
      const progress = buildProgress(0, 0);

      services.emit({
        type: 'job-update',
        status,
        currentPhase,
        message,
        progress,
        occurredAt,
        context: {
          jobId: job.jobId,
          currentPhase,
          totalChapters,
        },
      });

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
          totalChapters,
        },
      } satisfies JobStatusUpdatedDomainEvent);
    };

    services.logger?.info('OutlineStage started', { jobId: job.jobId, attempt });
    emitStageLog({ level: 'info', message: 'Outline generation started.', details: { attempt } });
    emitJobUpdate('outline_pending', 'outline_generation', 'Creating detailed chapter outline from synopsis...');

    try {
      const analysisResult = await this.generateAnalysisIfNeeded(context, services);

      const outlineResult = await services.client.generateOutline({
        title: job.title,
        premise: job.premise,
        genre: job.genre,
        subgenre: job.subgenre,
        targetWordCount: job.targetWordCount,
        targetChapters: job.targetChapters,
        humanLikeWriting: job.humanLikeWriting,
      });

      const mergedChapters = this.mergeChapters(context, outlineResult.outline);
      const chosenAnalysis = outlineResult.analysis ?? analysisResult?.analysis ?? context.analysis ?? null;

      const updatedContext: GenerationContext = {
        ...context,
        analysis: chosenAnalysis,
        outline: outlineResult.outline,
        chapters: mergedChapters,
        metadata: {
          ...context.metadata,
          outlineStage: {
            prompt: outlineResult.prompt,
            raw: outlineResult.raw,
            tokens: outlineResult.tokens,
            costInUsd: outlineResult.costInUsd,
            analysisSource: analysisResult ? 'premise-analysis' : outlineResult.analysis ? 'outline-response' : context.analysis ? 'existing-context' : 'unknown',
          },
        },
      };

      emitStageLog({
        level: 'info',
        message: 'Outline generation completed successfully.',
        details: {
          attempt,
          chapters: outlineResult.outline.length,
          costInUsd: outlineResult.costInUsd,
          tokens: outlineResult.tokens.totalTokens,
        },
      });

      const metadata: StageMetadata = {
        stage: this.name,
        attempt,
        outlineCostInUsd: outlineResult.costInUsd,
        outlineTokens: outlineResult.tokens,
        premiseAnalysisCostInUsd: analysisResult?.costInUsd,
        premiseAnalysisTokens: analysisResult?.tokens,
      };

      emitJobUpdate('outline_complete', 'chapter_generation', 'Outline completed. Starting chapter generation...');

      return {
        status: 'success',
        context: updatedContext,
        metadata,
      };
    } catch (error) {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      services.logger?.error('OutlineStage failed', { jobId: job.jobId, attempt, error: wrappedError.message });
      emitStageLog({
        level: 'error',
        message: 'Outline generation failed.',
        details: { attempt, error: wrappedError.message },
      });
      throw wrappedError;
    }
  }

  private async generateAnalysisIfNeeded(
    context: GenerationContext,
    services: StageServices,
  ): Promise<PremiseAnalysisResult | null> {
    if (context.analysis) {
      return null;
    }

    services.logger?.debug('OutlineStage generating premise analysis', {
      jobId: context.job.jobId,
    });

    const result = await services.client.analyzePremise({
      premise: context.job.premise,
      genre: context.job.genre,
      subgenre: context.job.subgenre,
      targetWordCount: context.job.targetWordCount,
      targetChapters: context.job.targetChapters,
      humanLikeWriting: context.job.humanLikeWriting,
    });

    services.emit({
      type: 'stage-log',
      stage: this.name,
      level: 'debug',
      message: 'Premise analysis generated.',
      details: {
        costInUsd: result.costInUsd,
        totalTokens: result.tokens.totalTokens,
      },
      occurredAt: services.now?.() ?? new Date(),
      context: {
        jobId: context.job.jobId,
        currentPhase: 'analysis',
      },
    });

    return result;
  }

  private mergeChapters(context: GenerationContext, outline: GenerationContext['outline']): ChapterState[] {
    const existing = new Map(context.chapters.map((chapter) => [chapter.chapterNumber, chapter] as const));
    const safeOutline = outline ?? [];

    return safeOutline.map((chapterFromOutline) => {
      const current = existing.get(chapterFromOutline.chapterNumber);

      return {
        chapterNumber: chapterFromOutline.chapterNumber,
        title: chapterFromOutline.title,
        ...(current?.wordCount !== undefined ? { wordCount: current.wordCount } : { wordCount: null }),
        prompt: current?.prompt,
        content: current?.content,
        costInUsd: current?.costInUsd,
        tokens: current?.tokens,
        attempts: current?.attempts,
      } satisfies ChapterState;
    });
  }
}
