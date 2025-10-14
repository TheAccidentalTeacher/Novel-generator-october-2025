import type {
  NovelGenerationJobData,
  NovelGenerationJobResult,
  NovelChapterSnapshot,
  NovelOutlineChapterSnapshot,
  NovelChapterAttemptSnapshot,
} from '@letswriteabook/shared-types';
import type {
  NovelChapterAttempt,
  NovelChapterOutline,
  NovelChapterRecord,
  NovelJobAggregate,
  NovelJobFailureInput,
  NovelJobFailureRecord,
  NovelJobInitializationInput,
  NovelJobRepository,
  NovelJobStatus,
} from '@letswriteabook/domain';
import { NovelJobModel, type NovelJobDocument, type NovelJobModelType } from '../models/novel-job';
import type { ClientSession } from 'mongoose';

type ListOptions = { readonly limit?: number; readonly statuses?: ReadonlyArray<NovelJobStatus> };

export class MongoNovelJobRepository implements NovelJobRepository {
  public constructor(
    private readonly model: NovelJobModelType = NovelJobModel,
    private readonly session?: ClientSession,
  ) {}

  public withSession(session: ClientSession): MongoNovelJobRepository {
    return new MongoNovelJobRepository(this.model, session);
  }

  public async initializeJob(input: NovelJobInitializationInput): Promise<NovelJobAggregate> {
    const doc = await this.model
      .findOneAndUpdate(
        { jobId: input.jobId },
        {
          $set: {
            queue: input.queue,
            status: 'running',
            payload: input.payload,
            requestedAt: input.requestedAt ?? null,
            receivedAt: input.receivedAt,
            startedAt: input.startedAt,
            completedAt: undefined,
            durationMs: undefined,
            analysis: undefined,
            summary: undefined,
            engine: undefined,
            context: undefined,
            outline: [],
            chapters: [],
            events: [],
            domainEvents: [],
          },
          $setOnInsert: {
            failures: [],
            jobId: input.jobId,
          },
        },
  this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
      )
      .exec();

    if (!doc) {
      throw new Error(`Failed to initialize job document for jobId=${input.jobId}`);
    }

    return toAggregate(doc);
  }

  public async saveGenerationResult(result: NovelGenerationJobResult): Promise<NovelJobAggregate> {
    const payload = extractPayloadFromContext(result);

    const doc = await this.model
      .findOneAndUpdate(
        { jobId: result.jobId },
        {
          $set: {
            queue: result.queue,
            status: 'completed',
            payload,
            requestedAt: result.requestedAt ?? null,
            receivedAt: result.receivedAt,
            startedAt: result.startedAt,
            completedAt: result.completedAt,
            durationMs: result.durationMs,
            outline: result.outline ?? [],
            chapters: result.chapters ?? [],
            analysis: result.analysis ?? null,
            summary: result.summary,
            engine: result.engine,
            context: result.context,
            events: result.events,
            domainEvents: result.domainEvents,
          },
          $setOnInsert: {
            failures: [],
            jobId: result.jobId,
          },
        },
  this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
      )
      .exec();

    if (!doc) {
      throw new Error(`Failed to persist job result for jobId=${result.jobId}`);
    }

    return toAggregate(doc);
  }

  public async recordFailure(jobId: string, failure: NovelJobFailureInput): Promise<NovelJobAggregate> {
    const failureRecord: NovelJobFailureRecord = {
      occurredAt: failure.occurredAt ?? new Date().toISOString(),
      reason: failure.reason,
      ...(failure.stage ? { stage: failure.stage } : {}),
      ...(failure.metadata ? { metadata: failure.metadata } : {}),
    };

    const doc = await this.model
      .findOneAndUpdate(
        { jobId },
        {
          $set: {
            status: 'failed',
            ...(failure.completedAt ? { completedAt: failure.completedAt } : {}),
            ...(typeof failure.durationMs === 'number' ? { durationMs: failure.durationMs } : {}),
          },
          $push: {
            failures: failureRecord,
          },
        },
  this.buildQueryOptions({ new: true }),
      )
      .exec();

    if (!doc) {
      throw new Error(`Job with id ${jobId} was not found while recording failure.`);
    }

    return toAggregate(doc);
  }

  public async findByJobId(jobId: string): Promise<NovelJobAggregate | null> {
    const query = this.model.findOne({ jobId });
    if (this.session) {
      query.session(this.session);
    }
    const doc = await query.exec();
    return doc ? toAggregate(doc) : null;
  }

  public async listActiveJobs(options: ListOptions = {}): Promise<ReadonlyArray<NovelJobAggregate>> {
    const limit = Math.max(1, options.limit ?? 50);
    const statuses = options.statuses && options.statuses.length > 0 ? options.statuses : ['queued', 'running'];

    const query = this.model.find({ status: { $in: statuses } }).sort({ createdAt: -1 }).limit(limit);
    if (this.session) {
      query.session(this.session);
    }

    const docs = (await query.exec()) as unknown as NovelJobDocument[];

    return docs.map((doc) => toAggregate(doc));
  }

  private buildQueryOptions<T extends Record<string, unknown>>(options: T): T & { session?: ClientSession } {
    return this.session ? { ...options, session: this.session } : options;
  }
}

function extractPayloadFromContext(result: NovelGenerationJobResult): NovelGenerationJobData['payload'] {
  const jobContext = result.context.job;

  return {
    title: jobContext.title,
    premise: jobContext.premise,
    genre: jobContext.genre,
    subgenre: jobContext.subgenre,
    targetWordCount: jobContext.targetWordCount,
    targetChapters: jobContext.targetChapters,
    humanLikeWriting: jobContext.humanLikeWriting,
  } satisfies NovelGenerationJobData['payload'];
}

function toAggregate(doc: NovelJobDocument): NovelJobAggregate {
  const outline = (doc.outline ?? []).map(mapOutline);
  const chapters = (doc.chapters ?? []).map(mapChapter);
  const failures = (doc.failures ?? []).map(mapFailure);
  const events = doc.events ?? [];
  const domainEvents = doc.domainEvents ?? [];
  const summary = doc.summary;
  const engine = doc.engine;
  const context = JSON.parse(JSON.stringify(doc.context ?? {})) as Record<string, unknown>;

  const progress = buildProgress(outline, chapters, failures);

  return {
    id: doc.jobId,
    payload: doc.payload,
    requestedAt: doc.requestedAt ?? undefined,
    queue: doc.queue,
    status: doc.status,
    outline,
    chapters,
    snapshot: {
      ...(progress ? { progress } : {}),
      ...(summary ? { summary } : {}),
      ...(engine ? { engine } : {}),
      events,
      domainEvents,
      context,
    },
    failures,
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  };
}

function mapOutline(outline: NovelOutlineChapterSnapshot): NovelChapterOutline {
  return {
    chapterNumber: outline.chapterNumber,
    title: outline.title,
    summary: outline.summary,
    keyEvents: [...outline.keyEvents],
    ...(typeof outline.wordTarget === 'number' ? { wordTarget: outline.wordTarget } : {}),
    ...(outline.humanLikeElements ? { humanLikeElements: outline.humanLikeElements } : {}),
  };
}

function mapChapter(chapter: NovelChapterSnapshot): NovelChapterRecord {
  return {
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    status: chapter.status,
    wordCount: chapter.wordCount ?? null,
    content: chapter.content,
    model: chapter.model,
    costInUsd: chapter.costInUsd,
    attempts: mapChapterAttempts(chapter.attempts ?? []),
  };
}

function mapChapterAttempts(attempts: ReadonlyArray<NovelChapterAttemptSnapshot>): ReadonlyArray<NovelChapterAttempt> {
  return attempts.map((attempt, index) => ({
    attemptNumber: index + 1,
    createdAt: attempt.createdAt ?? new Date().toISOString(),
    prompt: attempt.prompt,
    content: attempt.content,
    tokens: attempt.tokens,
    costInUsd: attempt.costInUsd,
    rawResponse: attempt.rawResponse,
  }));
}

function mapFailure(failure: NovelJobFailureRecord): NovelJobFailureRecord {
  return {
    occurredAt: failure.occurredAt,
    reason: failure.reason,
    ...(failure.stage ? { stage: failure.stage } : {}),
    ...(failure.metadata ? { metadata: failure.metadata } : {}),
  };
}

function buildProgress(
  outline: ReadonlyArray<NovelChapterOutline>,
  chapters: ReadonlyArray<NovelChapterRecord>,
  failures: ReadonlyArray<NovelJobFailureRecord>,
): NovelJobAggregate['snapshot']['progress'] | undefined {
  const totalChapters = outline.length || chapters.length;
  if (!totalChapters) {
    return undefined;
  }

  const chaptersCompleted = chapters.filter((chapter) => chapter.status === 'completed').length;
  const chaptersFailed = chapters.filter((chapter) => chapter.status === 'failed').length;

  return {
    outlineComplete: outline.length > 0,
    chaptersCompleted,
    chaptersFailed,
    totalChapters,
    hasFailures: chaptersFailed > 0 || failures.length > 0,
  };
}
