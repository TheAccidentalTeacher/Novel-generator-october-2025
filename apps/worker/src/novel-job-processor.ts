import type { WorkerConfig } from '@letswriteabook/config';
import { randomUUID } from 'node:crypto';
import type { Job } from 'bullmq';
import {
  generateNovel,
  MockAiClient,
  createOpenAiClient,
  type GenerateNovelOptions,
  type GenerationContext,
  type GenerationEvent,
  type IAiClient,
  type StageLogger,
  type CompletionUsage,
  type OpenAiClientModels,
  type AnalysisSummary,
  type ChapterState,
  type ChapterOutlineDetails,
} from '@letswriteabook/ai-engine';
import type {
  ContinuityAlertInput,
  NovelJobCostDelta,
  NovelJobEventRecord,
  NovelJobEventRepository,
  NovelJobFailureInput,
  NovelJobInitializationInput,
  NovelJobLatencyDelta,
  NovelJobMetadataRepository,
  NovelJobMetricsRepository,
  NovelJobRepository,
  NovelJobTokenDelta,
  NovelStoryBiblePatch,
} from '@letswriteabook/domain';
import type {
  NovelGenerationJobData,
  NovelGenerationJobResult,
  NovelGenerationContextSnapshot,
  NovelChapterSnapshot,
  NovelOutlineChapterSnapshot,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';
export type { NovelGenerationJobResult } from '@letswriteabook/shared-types';
import {
  createDomainRealtimeEvent,
  createGenerationRealtimeEvent,
  createJobStatusRealtimeEvent,
  type NovelRealtimeEvent,
} from '@letswriteabook/messaging';
import type { WorkerLogger } from './logger';
import type { NovelRealtimePublisher } from './realtime-publisher';
import {
  MongoNovelJobMetadataRepository,
  MongoNovelJobMetricsRepository,
  MongoNovelJobRepository,
  runInMongoTransaction,
} from '@letswriteabook/persistence';

type DomainEvent = Parameters<NonNullable<GenerateNovelOptions['publishDomainEvent']>>[0];

export interface NovelJobProcessor {
  process(job: Job<NovelGenerationJobData, NovelGenerationJobResult>): Promise<NovelGenerationJobResult>;
}

interface NovelJobRepositories {
  readonly jobs: NovelJobRepository;
  readonly events: NovelJobEventRepository;
  readonly metrics: NovelJobMetricsRepository;
  readonly metadata: NovelJobMetadataRepository;
}


function createEventPersister(repository: NovelJobEventRepository, logger: WorkerLogger) {
  return (event: NovelJobEventRecord): void => {
    repository.append(event).catch((error: unknown) => {
      logger.warn('Failed to persist realtime event', {
        jobId: event.jobId,
        kind: event.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  };
}

interface AiRuntime {
  readonly getClient: () => Promise<IAiClient>;
  readonly createStageLogger: (jobId: string) => StageLogger;
  readonly now: () => Date;
  readonly clientType: 'openai' | 'mock';
  readonly modelOverrides?: Record<string, string>;
}

export async function createNovelJobProcessor(
  config: WorkerConfig,
  logger: WorkerLogger,
  queueName: string,
  repositories: NovelJobRepositories,
  realtimePublisher?: NovelRealtimePublisher,
): Promise<NovelJobProcessor> {
  const runtime = await createAiRuntime(config, logger);
  const dispatchRealtime = createRealtimeDispatcher(realtimePublisher, logger);
  const persistEvent = createEventPersister(repositories.events, logger);

  return {
    async process(job) {
      logger.info('Received job', {
        queue: queueName,
        jobId: job.id,
        name: job.name,
        attemptsMade: job.attemptsMade,
      });

      const receivedAt = runtime.now();
      await safeUpdateProgress(job, logger, {
        status: 'acknowledged',
        receivedAt: receivedAt.toISOString(),
      });

      const events: SerializedGenerationEvent[] = [];
      const domainEvents: SerializedDomainEvent[] = [];
      const startedAt = runtime.now();

      const initializationInput: NovelJobInitializationInput = {
        jobId: job.data.jobId,
        queue: queueName,
        payload: job.data.payload,
        requestedAt: job.data.requestedAt,
        receivedAt: receivedAt.toISOString(),
        startedAt: startedAt.toISOString(),
      };

      await safeInitializeJob(repositories.jobs, initializationInput, logger);

      const runningRealtimeEvent = createJobStatusRealtimeEvent(job.data.jobId, 'running', {
        stage: 'acknowledged',
        queue: queueName,
        receivedAt: receivedAt.toISOString(),
      });
      dispatchRealtime(runningRealtimeEvent);
      persistEvent({
        kind: 'job-status',
        jobId: job.data.jobId,
        emittedAt: receivedAt.toISOString(),
        status: 'running',
        snapshot: runningRealtimeEvent.snapshot,
      });

      const emit = (event: GenerationEvent): void => {
        const serialized = serializeGenerationEvent(event);
        events.push(serialized);

        const generationEvent = createGenerationRealtimeEvent(job.data.jobId, serialized);
        dispatchRealtime(generationEvent);
        persistEvent({
          kind: 'generation',
          jobId: job.data.jobId,
          emittedAt: serialized.occurredAt,
          event: serialized,
        });

        void safeUpdateProgress(job, logger, {
          status: 'event',
          eventType: serialized.type,
          event: serialized,
          eventsProcessed: events.length,
        });
      };

      const publishDomainEvent = (event: DomainEvent): void => {
        const serialized = serializeDomainEvent(event);
        domainEvents.push(serialized);

        const domainEvent = createDomainRealtimeEvent(job.data.jobId, serialized);
        dispatchRealtime(domainEvent);
        persistEvent({
          kind: 'domain',
          jobId: job.data.jobId,
          emittedAt: serialized.occurredAt,
          event: serialized,
        });

        void safeUpdateProgress(job, logger, {
          status: 'domain-event',
          eventType: serialized.type,
          event: serialized,
          eventsProcessed: events.length,
        });
      };

      const stageLogger = runtime.createStageLogger(job.data.jobId);

      try {
        const context = await generateNovel(buildInitialContext(job.data, receivedAt.toISOString()), {
          client: await runtime.getClient(),
          emit,
          publishDomainEvent,
          logger: stageLogger,
          now: runtime.now,
        });

        const completedAt = runtime.now();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        const contextSnapshot = buildContextSnapshot(context);
        const outlineSnapshot = contextSnapshot.outline;
        const chapterSnapshots = contextSnapshot.chapters;
        const analysisSnapshot = contextSnapshot.analysis ?? null;

        await safeUpdateProgress(job, logger, {
          status: 'completed',
          completedAt: completedAt.toISOString(),
          durationMs,
          eventsProcessed: events.length,
        });

        const chaptersGenerated = context.chapters.filter((chapter) => Boolean(chapter.content)).length;
        const totalWordCount = context.chapters.reduce((count, chapter) => count + (chapter.wordCount ?? 0), 0);
        const totalChaptersPlanned = context.outline?.length ?? context.job.targetChapters ?? chaptersGenerated;

        logger.info('Novel job completed', {
          jobId: job.id,
          queue: queueName,
          chaptersGenerated,
          totalWordCount,
          durationMs,
        });

        const completedEvent = createJobStatusRealtimeEvent(job.data.jobId, 'completed', {
          queue: queueName,
          completedAt: completedAt.toISOString(),
          durationMs,
          chaptersGenerated,
          totalWordCount,
          totalChaptersPlanned,
        });
        dispatchRealtime(completedEvent);
        persistEvent({
          kind: 'job-status',
          jobId: job.data.jobId,
          emittedAt: completedAt.toISOString(),
          status: 'completed',
          snapshot: completedEvent.snapshot,
        });

        const generationResult: NovelGenerationJobResult = {
          status: 'completed',
          jobId: job.data.jobId,
          queue: queueName,
          requestedAt: job.data.requestedAt,
          receivedAt: receivedAt.toISOString(),
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          durationMs,
          engine: {
            clientType: runtime.clientType,
            ...(runtime.modelOverrides ? { modelOverrides: runtime.modelOverrides } : {}),
          },
          summary: {
            chaptersGenerated,
            totalChaptersPlanned,
            totalWordCount,
          },
          events,
          domainEvents,
          context: contextSnapshot,
          ...(outlineSnapshot ? { outline: outlineSnapshot } : {}),
          chapters: chapterSnapshots,
          analysis: analysisSnapshot,
        } satisfies NovelGenerationJobResult;

        await persistSuccessfulGeneration(repositories, generationResult, logger);

        return generationResult;
      } catch (error) {
        const wrapped = error instanceof Error ? error : new Error(String(error));
        logger.error('Novel job failed', {
          jobId: job.id,
          queue: queueName,
          error: wrapped.message,
        });

        const failureAt = runtime.now();

        await safeUpdateProgress(job, logger, {
          status: 'failed',
          failedAt: failureAt.toISOString(),
          error: wrapped.message,
        });

        const failedEvent = createJobStatusRealtimeEvent(job.data.jobId, 'failed', {
          queue: queueName,
          failedAt: failureAt.toISOString(),
          error: wrapped.message,
        });
        dispatchRealtime(failedEvent);
        persistEvent({
          kind: 'job-status',
          jobId: job.data.jobId,
          emittedAt: failureAt.toISOString(),
          status: 'failed',
          snapshot: failedEvent.snapshot,
        });

        const failure: NovelJobFailureInput = {
          reason: wrapped.message,
          occurredAt: failureAt.toISOString(),
          completedAt: failureAt.toISOString(),
          durationMs: failureAt.getTime() - startedAt.getTime(),
          stage: 'worker-runtime',
          metadata: {
            queue: queueName,
            attemptsMade: job.attemptsMade,
            eventsProcessed: events.length,
          },
        };

  await safeRecordFailure(repositories.jobs, job.data.jobId, failure, logger);
  await safeAddFailureAlert(repositories.metadata, job.data.jobId, failure, logger);

        throw wrapped;
      }
    },
  } satisfies NovelJobProcessor;
}

function createRealtimeDispatcher(
  publisher: NovelRealtimePublisher | undefined,
  logger: WorkerLogger,
): (event: NovelRealtimeEvent) => void {
  if (!publisher) {
    return () => {};
  }

  return (event: NovelRealtimeEvent) => {
    publisher.publish(event).catch((error: unknown) => {
      logger.warn('Realtime dispatch failed', {
        jobId: event.jobId,
        kind: event.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  };
}

async function createAiRuntime(config: WorkerConfig, logger: WorkerLogger): Promise<AiRuntime> {
  const now = () => new Date();

  if (config.openAiApiKey) {
    const sanitizedOverrides = sanitizeModelOverrides(config.modelOverrides);
    const apiKey = config.openAiApiKey!;
    const appliedOverrides = sanitizedOverrides
      ? Object.fromEntries(
          (['analysis', 'outline', 'chapter'] as const)
            .map((key) => {
              const value = sanitizedOverrides[key];
              return typeof value === 'string' ? [key, value] : null;
            })
            .filter((entry): entry is [string, string] => Array.isArray(entry)),
        )
      : undefined;

    let clientPromise: Promise<IAiClient> | undefined;

    return {
      getClient: async () => {
        if (!clientPromise) {
          clientPromise = createOpenAiClient({
            apiKey,
            ...(sanitizedOverrides ? { models: sanitizedOverrides } : {}),
          });
        }

        return clientPromise;
      },
      createStageLogger: (jobId) => createStageLogger(logger, jobId),
      now,
      clientType: 'openai',
      ...(appliedOverrides ? { modelOverrides: appliedOverrides } : {}),
    } satisfies AiRuntime;
  }

  const client = createMockAiClient();

  return {
    getClient: async () => client,
    createStageLogger: (jobId) => createStageLogger(logger, jobId),
    now,
    clientType: 'mock',
  } satisfies AiRuntime;
}

function sanitizeModelOverrides(overrides: WorkerConfig['modelOverrides']): OpenAiClientModels | undefined {
  if (!overrides) {
    return undefined;
  }

  const normalized = new Map<string, string>();

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const candidate = key.trim().toLowerCase();
    if (candidate === 'analysis' || candidate === 'outline' || candidate === 'chapter') {
      normalized.set(candidate, trimmed);
    }
  }

  const analysis = normalized.get('analysis');
  const outline = normalized.get('outline');
  const chapter = normalized.get('chapter');

  if (!analysis && !outline && !chapter) {
    return undefined;
  }

  return {
    ...(analysis ? { analysis } : {}),
    ...(outline ? { outline } : {}),
    ...(chapter ? { chapter } : {}),
  } satisfies OpenAiClientModels;
}

function createStageLogger(logger: WorkerLogger, jobId: string): StageLogger {
  const mapDetails = (details?: Record<string, unknown>) => ({ jobId, ...(details ?? {}) });

  return {
    debug(message, details) {
      logger.debug(message, mapDetails(details));
    },
    info(message, details) {
      logger.info(message, mapDetails(details));
    },
    warn(message, details) {
      logger.warn(message, mapDetails(details));
    },
    error(message, details) {
      logger.error(message, mapDetails(details));
    },
  } satisfies StageLogger;
}

function createMockAiClient(): IAiClient {
  return new MockAiClient({
    analyzePremise: async (input, _options) => {
      const analysis = {
        themes: [input.genre, `${input.subgenre} tensions`],
        characters: [
          { archetype: 'protagonist', conflict: 'internal doubts' },
          { archetype: 'antagonist', conflict: 'ideological opposition' },
        ],
        ...(input.humanLikeWriting
          ? {
              humanLikeElements: {
                emotionalResonance: 'Emphasize genuine uncertainty and vulnerability.',
                culturalTexture: 'Blend setting details with character perspectives.',
              },
            }
          : {}),
      } satisfies AnalysisSummary;

      return {
        raw: JSON.stringify({ source: 'mock', stage: 'analysis', genre: input.genre, subgenre: input.subgenre }),
        analysis,
        tokens: buildTokenUsage(120, 320),
        costInUsd: 0,
      };
    },
    generateOutline: async (input, _options) => {
      const outline = Array.from({ length: input.targetChapters }, (_, index) => {
        const chapterNumber = index + 1;
        const baseWordTarget = Math.max(600, Math.round(input.targetWordCount / Math.max(input.targetChapters, 1)));
        const variance = Math.round(baseWordTarget * 0.15);
        const wordTarget = baseWordTarget + (index % 2 === 0 ? variance : -variance);

        return {
          chapterNumber,
          title: `Chapter ${chapterNumber}: ${input.title}`,
          summary: `Key developments for chapter ${chapterNumber} of ${input.title}.`,
          keyEvents: [
            `Turning point ${chapterNumber}`,
            `Character shift ${chapterNumber}`,
            `Raising stakes ${chapterNumber}`,
          ],
          wordTarget,
          ...(input.humanLikeWriting
            ? {
                humanLikeElements: {
                  perspective: chapterNumber % 2 === 0 ? 'dual POV' : 'single POV',
                  tension: 'Maintain unresolved conflict threads.',
                },
              }
            : {}),
        };
      });

      return {
        prompt: `Mock outline prompt for ${input.title}`,
        outline,
        analysis: null,
        raw: { source: 'mock', stage: 'outline', model: 'mock-ai-outline' },
        tokens: buildTokenUsage(150, 420),
        costInUsd: 0,
      };
    },
    generateChapter: async (input, _options) => {
      const target = Math.max(240, Math.round(input.chapterOutline.wordTarget * 0.35));
      const content = buildMockChapterContent(target, input.chapterOutline.title, input.chapterOutline.chapterNumber);

      return {
        prompt: `Mock chapter prompt for ${input.chapterOutline.title}`,
        chapterNumber: input.chapterOutline.chapterNumber,
        content,
        tokens: buildTokenUsage(200, target + 120),
        costInUsd: 0,
        raw: { source: 'mock', stage: 'chapter', model: 'mock-ai-chapter' },
      };
    },
  });
}

function buildTokenUsage(promptTokens: number, completionTokens: number): CompletionUsage {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  } satisfies CompletionUsage;
}

function buildMockChapterContent(wordCount: number, title: string, chapterNumber: number): string {
  const baseToken = `${title.replace(/\s+/g, '-').toLowerCase()}-${chapterNumber}`;
  const words: string[] = [];

  for (let index = 0; index < wordCount; index += 1) {
    words.push(`mock_${baseToken}_${index % 50}`);
  }

  return words.join(' ');
}

function buildInitialContext(
  job: NovelGenerationJobData,
  receivedAtIso: string,
): GenerationContext {
  return {
    job: {
      jobId: job.jobId,
      title: job.payload.title,
      premise: job.payload.premise,
      genre: job.payload.genre,
      subgenre: job.payload.subgenre,
      targetWordCount: job.payload.targetWordCount,
      targetChapters: job.payload.targetChapters,
      humanLikeWriting: job.payload.humanLikeWriting,
      metadata: {
        requestedAt: job.requestedAt,
        receivedAt: receivedAtIso,
      },
    },
    analysis: null,
    outline: undefined,
    chapters: [],
    metadata: {
      payloadSnapshot: job.payload,
      enqueuedAt: job.requestedAt,
      receivedAt: receivedAtIso,
    },
  } satisfies GenerationContext;
}

function serializeGenerationEvent(event: GenerationEvent): SerializedGenerationEvent {
  return structuredSerialize(event) as SerializedGenerationEvent;
}

function serializeDomainEvent(event: DomainEvent): SerializedDomainEvent {
  return structuredSerialize(event) as SerializedDomainEvent;
}

function structuredSerialize<T extends { occurredAt: Date }>(value: T): Record<string, unknown> & { occurredAt: string } {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => (current instanceof Date ? current.toISOString() : current)),
  ) as Record<string, unknown> & { occurredAt: string };
}

function buildContextSnapshot(context: GenerationContext): NovelGenerationContextSnapshot {
  const outline = toOutlineSnapshot(context.outline);
  const chapters = context.chapters.map((chapter) => toChapterSnapshot(chapter));

  return {
    job: {
      jobId: context.job.jobId,
      title: context.job.title,
      premise: context.job.premise,
      genre: context.job.genre,
      subgenre: context.job.subgenre,
      targetWordCount: context.job.targetWordCount,
      targetChapters: context.job.targetChapters,
      humanLikeWriting: context.job.humanLikeWriting,
      metadata: context.job.metadata,
    },
    analysis: context.analysis as NovelGenerationContextSnapshot['analysis'],
    outline,
    chapters,
    metadata: context.metadata,
  } satisfies NovelGenerationContextSnapshot;
}

function toOutlineSnapshot(
  outline: GenerationContext['outline'],
): ReadonlyArray<NovelOutlineChapterSnapshot> | undefined {
  if (!outline) {
    return undefined;
  }

  return outline.map((chapter) => {
    const snapshot = {
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      summary: chapter.summary,
      keyEvents: [...chapter.keyEvents],
      ...(typeof chapter.wordTarget === 'number' ? { wordTarget: chapter.wordTarget } : {}),
      ...(chapter.humanLikeElements ? { humanLikeElements: chapter.humanLikeElements } : {}),
    } satisfies NovelOutlineChapterSnapshot;

    return snapshot;
  });
}

function toChapterSnapshot(chapter: ChapterState): NovelChapterSnapshot {
  const attempts = Array.isArray(chapter.attempts)
    ? chapter.attempts.map((attempt) => ({
        prompt: attempt.prompt,
        content: attempt.content,
        tokens: attempt.tokens,
        costInUsd: attempt.costInUsd,
        rawResponse: attempt.rawResponse,
      }))
    : [];

  const status: NovelChapterSnapshot['status'] = chapter.content
    ? 'completed'
    : attempts.length > 0
      ? 'failed'
      : 'pending';

  const snapshot = {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    status,
    wordCount: chapter.wordCount ?? null,
    ...(chapter.content ? { content: chapter.content } : {}),
    ...(chapter.costInUsd !== undefined ? { costInUsd: chapter.costInUsd } : {}),
    ...(chapter.tokens ? { tokens: chapter.tokens } : {}),
    attempts,
  } satisfies NovelChapterSnapshot;

  return snapshot;
}

async function safeUpdateProgress(
  job: Job<NovelGenerationJobData, NovelGenerationJobResult>,
  logger: WorkerLogger,
  progress: Record<string, unknown>,
): Promise<void> {
  try {
    await job.updateProgress(progress);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to update job progress', {
      jobId: job.id,
      progress,
      error: message,
    });
  }
}

async function safeInitializeJob(
  repository: NovelJobRepository,
  input: NovelJobInitializationInput,
  logger: WorkerLogger,
): Promise<void> {
  try {
    await repository.initializeJob(input);
  } catch (error) {
    logger.error('Failed to initialize job in repository', {
      jobId: input.jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function safeSaveGenerationResult(
  repository: NovelJobRepository,
  result: NovelGenerationJobResult,
  logger: WorkerLogger,
): Promise<void> {
  try {
    await repository.saveGenerationResult(result);
  } catch (error) {
    logger.error('Failed to persist job result', {
      jobId: result.jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function safeRecordFailure(
  repository: NovelJobRepository,
  jobId: string,
  failure: NovelJobFailureInput,
  logger: WorkerLogger,
): Promise<void> {
  try {
    await repository.recordFailure(jobId, failure);
  } catch (error) {
    logger.error('Failed to record job failure', {
      jobId,
      failure,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function safeRecordSuccessMetrics(
  metricsRepository: NovelJobMetricsRepository,
  metadataRepository: NovelJobMetadataRepository,
  result: NovelGenerationJobResult,
  logger: WorkerLogger,
  options: { readonly transactional?: boolean } = {},
): Promise<void> {
  const deltas = buildMetricsDeltas(result);

  try {
    await metricsRepository.reset(result.jobId);

    if (deltas.cost) {
      await metricsRepository.incrementCosts(result.jobId, deltas.cost);
    }

    if (deltas.tokens) {
      await metricsRepository.incrementTokens(result.jobId, deltas.tokens);
    }

    await metricsRepository.updateLatency(result.jobId, deltas.latency);
  } catch (error) {
    logger.warn('Failed to update job metrics', {
      jobId: result.jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (options.transactional) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  try {
    const storyBiblePatch = buildStoryBiblePatch(result);

    if (storyBiblePatch) {
      await metadataRepository.upsertStoryBible(result.jobId, storyBiblePatch);
    }
  } catch (error) {
    logger.warn('Failed to update job metadata', {
      jobId: result.jobId,
      error: error instanceof Error ? error.message : String(error),
    });

    if (options.transactional) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

async function safeAddFailureAlert(
  metadataRepository: NovelJobMetadataRepository,
  jobId: string,
  failure: NovelJobFailureInput,
  logger: WorkerLogger,
): Promise<void> {
  const createdAt = failure.occurredAt ?? new Date().toISOString();
  const alert: ContinuityAlertInput = {
    alertId: `failure-${randomUUID()}`,
    title: 'Novel job failure recorded',
    message: failure.reason,
    severity: 'critical',
    createdAt,
    context: {
      ...(failure.stage ? { stage: failure.stage } : {}),
      ...(failure.metadata ?? {}),
      ...(typeof failure.durationMs === 'number' ? { durationMs: failure.durationMs } : {}),
    },
  } satisfies ContinuityAlertInput;

  try {
    await metadataRepository.addContinuityAlert(jobId, alert);
  } catch (error) {
    logger.warn('Failed to append continuity alert', {
      jobId,
      alertId: alert.alertId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

interface MetricsDeltas {
  readonly cost: NovelJobCostDelta | null;
  readonly tokens: NovelJobTokenDelta | null;
  readonly latency: NovelJobLatencyDelta;
}

async function persistSuccessfulGeneration(
  repositories: NovelJobRepositories,
  result: NovelGenerationJobResult,
  logger: WorkerLogger,
): Promise<void> {
  if (supportsMongoTransactions(repositories)) {
    try {
      await runInMongoTransaction(async (session) => {
        const transactionalRepositories: TransactionalRepositories = {
          jobs: repositories.jobs.withSession(session),
          metrics: repositories.metrics.withSession(session),
          metadata: repositories.metadata.withSession(session),
          events: repositories.events,
        } satisfies TransactionalRepositories;

        await transactionalRepositories.jobs.saveGenerationResult(result);
        await safeRecordSuccessMetrics(
          transactionalRepositories.metrics,
          transactionalRepositories.metadata,
          result,
          logger,
          { transactional: true },
        );
      });

      return;
    } catch (error) {
      logger.error('Transactional persistence failed; falling back to non-transactional writes', {
        jobId: result.jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await safeSaveGenerationResult(repositories.jobs, result, logger);
  await safeRecordSuccessMetrics(repositories.metrics, repositories.metadata, result, logger);
}

type TransactionalRepositories = NovelJobRepositories & {
  readonly jobs: MongoNovelJobRepository;
  readonly metrics: MongoNovelJobMetricsRepository;
  readonly metadata: MongoNovelJobMetadataRepository;
};

function supportsMongoTransactions(repositories: NovelJobRepositories): repositories is TransactionalRepositories {
  return (
    typeof (repositories.jobs as MongoNovelJobRepository | undefined)?.withSession === 'function' &&
    typeof (repositories.metrics as MongoNovelJobMetricsRepository | undefined)?.withSession === 'function' &&
    typeof (repositories.metadata as MongoNovelJobMetadataRepository | undefined)?.withSession === 'function'
  );
}

function buildMetricsDeltas(result: NovelGenerationJobResult): MetricsDeltas {
  const chapters = Array.isArray(result.chapters) ? result.chapters : [];
  const totalChapterCost = chapters.reduce((sum, chapter) => sum + calculateChapterCost(chapter), 0);
  const totalChapterTokens = chapters.reduce((sum, chapter) => sum + calculateChapterTokens(chapter), 0);

  const cost: NovelJobCostDelta | null = totalChapterCost > 0 ? { totalUsd: totalChapterCost, chaptersUsd: totalChapterCost } : null;
  const tokens: NovelJobTokenDelta | null = totalChapterTokens > 0 ? { total: totalChapterTokens, chapters: totalChapterTokens } : null;

  const latency: NovelJobLatencyDelta = {
    total: result.durationMs,
  } satisfies NovelJobLatencyDelta;

  return { cost, tokens, latency } satisfies MetricsDeltas;
}

function calculateChapterCost(chapter: NovelChapterSnapshot): number {
  if (typeof chapter.costInUsd === 'number') {
    return chapter.costInUsd;
  }

  return (chapter.attempts ?? []).reduce((sum, attempt) => sum + (attempt.costInUsd ?? 0), 0);
}

function calculateChapterTokens(chapter: NovelChapterSnapshot): number {
  if (chapter.tokens && typeof chapter.tokens.totalTokens === 'number') {
    return chapter.tokens.totalTokens;
  }

  return (chapter.attempts ?? []).reduce((sum, attempt) => {
    const tokens = attempt.tokens;
    return sum + (tokens && typeof tokens.totalTokens === 'number' ? tokens.totalTokens : 0);
  }, 0);
}

function buildStoryBiblePatch(result: NovelGenerationJobResult): NovelStoryBiblePatch | null {
  const metadata: Record<string, unknown> = {};

  if (result.summary) {
    metadata.summary = sanitizeForStorage(result.summary);
  }

  if (result.analysis) {
    metadata.analysis = sanitizeForStorage(result.analysis);
  }

  if (result.outline && result.outline.length > 0) {
    metadata.outline = sanitizeForStorage(result.outline);
  }

  if (result.context?.metadata) {
    metadata.contextMetadata = sanitizeForStorage(result.context.metadata);
  }

  if (result.engine) {
    metadata.engine = sanitizeForStorage(result.engine);
  }

  if (Object.keys(metadata).length === 0) {
    return null;
  }

  return {
    metadata,
  } satisfies NovelStoryBiblePatch;
}

function sanitizeForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
