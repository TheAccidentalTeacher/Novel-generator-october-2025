import type {
  NovelGenerationJobData,
  NovelGenerationJobResult,
  NovelJobEngineMetadata,
  NovelJobSummary,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';

export type NovelJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface NovelChapterOutline {
  readonly chapterNumber: number;
  readonly title: string;
  readonly summary: string;
  readonly keyEvents: readonly string[];
  readonly wordTarget?: number;
  readonly humanLikeElements?: Record<string, unknown>;
}

export interface NovelChapterAttempt {
  readonly attemptNumber: number;
  readonly createdAt: string;
  readonly prompt: string;
  readonly content: string;
  readonly tokens: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly costInUsd: number;
  readonly rawResponse?: unknown;
}

export interface NovelChapterRecord {
  readonly chapterNumber: number;
  readonly title: string;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed';
  readonly wordCount?: number | null;
  readonly content?: string;
  readonly model?: string;
  readonly costInUsd?: number;
  readonly attempts: ReadonlyArray<NovelChapterAttempt>;
}

export interface NovelJobFailureRecord {
  readonly occurredAt: string;
  readonly reason: string;
  readonly stage?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface NovelJobSnapshot {
  readonly progress?: {
    readonly outlineComplete: boolean;
    readonly chaptersCompleted: number;
    readonly chaptersFailed: number;
    readonly totalChapters: number;
    readonly hasFailures: boolean;
  };
  readonly summary?: NovelJobSummary;
  readonly engine?: NovelJobEngineMetadata;
  readonly events: ReadonlyArray<SerializedGenerationEvent>;
  readonly domainEvents: ReadonlyArray<SerializedDomainEvent>;
  readonly context?: Record<string, unknown>;
}

export interface NovelJobAggregate {
  readonly id: string;
  readonly payload: NovelGenerationJobData['payload'];
  readonly requestedAt?: string;
  readonly queue: string;
  readonly status: NovelJobStatus;
  readonly outline?: ReadonlyArray<NovelChapterOutline>;
  readonly chapters: ReadonlyArray<NovelChapterRecord>;
  readonly snapshot: NovelJobSnapshot;
  readonly failures: ReadonlyArray<NovelJobFailureRecord>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NovelJobMapper {
  fromGenerationResult(result: NovelGenerationJobResult): NovelJobAggregate;
  applyFailure(
    job: NovelJobAggregate,
    reason: string,
    options?: { readonly occurredAt?: string; readonly stage?: string; readonly metadata?: Record<string, unknown> },
  ): NovelJobAggregate;
}

export interface NovelJobFailureInput {
  readonly reason: string;
  readonly occurredAt?: string;
  readonly stage?: string;
  readonly metadata?: Record<string, unknown>;
  readonly completedAt?: string;
  readonly durationMs?: number;
}

export interface NovelJobInitializationInput {
  readonly jobId: string;
  readonly queue: string;
  readonly payload: NovelGenerationJobData['payload'];
  readonly requestedAt?: string;
  readonly receivedAt: string;
  readonly startedAt: string;
}

export interface NovelJobRepository {
  initializeJob(input: NovelJobInitializationInput): Promise<NovelJobAggregate>;
  saveGenerationResult(result: NovelGenerationJobResult): Promise<NovelJobAggregate>;
  recordFailure(jobId: string, failure: NovelJobFailureInput): Promise<NovelJobAggregate>;
  findByJobId(jobId: string): Promise<NovelJobAggregate | null>;
  listActiveJobs(options?: {
    readonly limit?: number;
    readonly statuses?: ReadonlyArray<NovelJobStatus>;
  }): Promise<ReadonlyArray<NovelJobAggregate>>;
}

export interface NovelJobCostBreakdown {
  readonly totalUsd: number;
  readonly analysisUsd?: number;
  readonly outlineUsd?: number;
  readonly chaptersUsd?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobTokenBreakdown {
  readonly total: number;
  readonly analysis?: number;
  readonly outline?: number;
  readonly chapters?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobLatencyBreakdown {
  readonly analysis?: number;
  readonly outline?: number;
  readonly chapters?: number;
  readonly total?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobMetrics {
  readonly jobId: string;
  readonly cost: NovelJobCostBreakdown;
  readonly tokens: NovelJobTokenBreakdown;
  readonly latencyMs: NovelJobLatencyBreakdown;
  readonly updatedAt: string;
}

export interface NovelJobCostDelta {
  readonly totalUsd?: number;
  readonly analysisUsd?: number;
  readonly outlineUsd?: number;
  readonly chaptersUsd?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobTokenDelta {
  readonly total?: number;
  readonly analysis?: number;
  readonly outline?: number;
  readonly chapters?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobLatencyDelta {
  readonly analysis?: number;
  readonly outline?: number;
  readonly chapters?: number;
  readonly total?: number;
  readonly [segment: string]: number | undefined;
}

export interface NovelJobMetricsRepository {
  incrementCosts(jobId: string, delta: NovelJobCostDelta): Promise<NovelJobMetrics>;
  incrementTokens(jobId: string, delta: NovelJobTokenDelta): Promise<NovelJobMetrics>;
  updateLatency(jobId: string, delta: NovelJobLatencyDelta): Promise<NovelJobMetrics>;
  reset(jobId: string): Promise<NovelJobMetrics>;
  getMetrics(jobId: string): Promise<NovelJobMetrics | null>;
}

export interface NovelStoryBibleRelationship {
  readonly characterId: string;
  readonly description: string;
}

export interface NovelStoryBibleCharacter {
  readonly name: string;
  readonly summary?: string;
  readonly traits?: ReadonlyArray<string>;
  readonly relationships?: ReadonlyArray<NovelStoryBibleRelationship>;
  readonly metadata?: Record<string, unknown>;
}

export interface NovelStoryBible {
  readonly characters: Record<string, NovelStoryBibleCharacter>;
  readonly locations?: Record<string, unknown>;
  readonly themes?: ReadonlyArray<string>;
  readonly metadata?: Record<string, unknown>;
}

export interface NovelStoryBiblePatch {
  readonly characters?: Record<string, NovelStoryBibleCharacter>;
  readonly removeCharacters?: ReadonlyArray<string>;
  readonly locations?: Record<string, unknown>;
  readonly themes?: ReadonlyArray<string>;
  readonly metadata?: Record<string, unknown>;
}

export type ContinuityAlertSeverity = 'info' | 'warning' | 'critical';

export interface ContinuityAlertInput {
  readonly alertId: string;
  readonly title: string;
  readonly message: string;
  readonly severity: ContinuityAlertSeverity;
  readonly createdAt?: string;
  readonly context?: Record<string, unknown>;
}

export interface ContinuityAlertRecord extends ContinuityAlertInput {
  readonly createdAt: string;
  readonly resolved: boolean;
  readonly resolvedAt?: string;
}

export interface AiDecisionInput {
  readonly decisionId: string;
  readonly decidedAt?: string;
  readonly type: string;
  readonly summary?: string;
  readonly confidence?: number;
  readonly impact?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AiDecisionRecord extends AiDecisionInput {
  readonly decidedAt: string;
}

export interface NovelJobMetadata {
  readonly jobId: string;
  readonly storyBible: NovelStoryBible;
  readonly continuityAlerts: ReadonlyArray<ContinuityAlertRecord>;
  readonly aiDecisions: ReadonlyArray<AiDecisionRecord>;
  readonly performance?: Record<string, unknown>;
  readonly enhancements?: ReadonlyArray<Record<string, unknown>>;
  readonly updatedAt: string;
}

export interface NovelJobMetadataRepository {
  upsertStoryBible(jobId: string, patch: NovelStoryBiblePatch): Promise<NovelJobMetadata>;
  addContinuityAlert(jobId: string, alert: ContinuityAlertInput): Promise<NovelJobMetadata>;
  resolveContinuityAlert(jobId: string, alertId: string, resolvedAt?: string): Promise<NovelJobMetadata>;
  appendAiDecision(jobId: string, decision: AiDecisionInput): Promise<NovelJobMetadata>;
  getMetadata(jobId: string): Promise<NovelJobMetadata | null>;
}

export type NovelJobEventRecord =
  | {
    readonly kind: 'generation';
    readonly jobId: string;
    readonly emittedAt: string;
    readonly event: SerializedGenerationEvent;
  }
  | {
    readonly kind: 'domain';
    readonly jobId: string;
    readonly emittedAt: string;
    readonly event: SerializedDomainEvent;
  }
  | {
    readonly kind: 'job-status';
    readonly jobId: string;
    readonly emittedAt: string;
    readonly status: NovelJobStatus;
    readonly snapshot?: Record<string, unknown>;
  };

export interface ListNovelJobEventsOptions {
  readonly limit?: number;
  readonly before?: string;
}

export interface NovelJobEventRepository {
  append(event: NovelJobEventRecord): Promise<void>;
  list(jobId: string, options?: ListNovelJobEventsOptions): Promise<ReadonlyArray<NovelJobEventRecord>>;
}
