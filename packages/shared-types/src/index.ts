// Shared types placeholder. Consolidate cross-service DTOs here.
export type UUID = string;

export interface NovelJobPayload {
	readonly title: string;
	readonly premise: string;
	readonly genre: string;
	readonly subgenre: string;
	readonly targetWordCount: number;
	readonly targetChapters: number;
	readonly humanLikeWriting: boolean;
}

export interface CreateGenerationJobRequest extends NovelJobPayload {}

export interface CreateGenerationJobResponse {
	readonly jobId: UUID;
	readonly status: NovelJobStatus;
	readonly queue: string;
	readonly createdAt: string;
	readonly placeholder?: boolean;
}

export interface NovelGenerationJobData {
	readonly jobId: string;
	readonly payload: NovelJobPayload;
	readonly requestedAt: string;
}

export interface SerializedGenerationEvent {
	readonly type: string;
	readonly occurredAt: string;
	readonly [key: string]: unknown;
}

export interface SerializedDomainEvent {
	readonly type: string;
	readonly occurredAt: string;
	readonly [key: string]: unknown;
}

export interface NovelJobEngineMetadata {
	readonly clientType: 'openai' | 'mock';
	readonly modelOverrides?: Record<string, string>;
}

export interface NovelJobSummary {
	readonly chaptersGenerated: number;
	readonly totalChaptersPlanned: number;
	readonly totalWordCount: number;
}

export interface NovelAnalysisSnapshot {
	readonly themes?: readonly string[];
	readonly characters?: readonly unknown[];
	readonly humanLikeElements?: Record<string, unknown>;
	readonly [key: string]: unknown;
}

export interface NovelChapterAttemptSnapshot {
	readonly prompt: string;
	readonly content: string;
	readonly tokens: {
		readonly promptTokens: number;
		readonly completionTokens: number;
		readonly totalTokens: number;
	};
	readonly costInUsd: number;
	readonly rawResponse?: unknown;
	readonly createdAt?: string;
}

export interface NovelChapterSnapshot {
	readonly chapterNumber: number;
	readonly title: string;
	readonly status: 'pending' | 'in-progress' | 'completed' | 'failed';
	readonly wordCount?: number | null;
	readonly content?: string;
	readonly model?: string;
	readonly costInUsd?: number;
	readonly tokens?: {
		readonly promptTokens: number;
		readonly completionTokens: number;
		readonly totalTokens: number;
	};
	readonly attempts: ReadonlyArray<NovelChapterAttemptSnapshot>;
}

export interface NovelOutlineChapterSnapshot {
	readonly chapterNumber: number;
	readonly title: string;
	readonly summary: string;
	readonly keyEvents: readonly string[];
	readonly wordTarget?: number;
	readonly humanLikeElements?: Record<string, unknown>;
}

export interface NovelGenerationContextSnapshot {
	readonly job: {
		readonly jobId: string;
		readonly title: string;
		readonly premise: string;
		readonly genre: string;
		readonly subgenre: string;
		readonly targetWordCount: number;
		readonly targetChapters: number;
		readonly humanLikeWriting: boolean;
		readonly metadata?: Record<string, unknown>;
	};
	readonly analysis?: NovelAnalysisSnapshot | null;
	readonly outline?: ReadonlyArray<NovelOutlineChapterSnapshot>;
	readonly chapters: ReadonlyArray<NovelChapterSnapshot>;
	readonly metadata?: Record<string, unknown>;
}

export interface NovelGenerationJobResult {
	readonly status: 'completed';
	readonly jobId: string;
	readonly queue: string;
	readonly requestedAt?: string;
	readonly receivedAt: string;
	readonly startedAt: string;
	readonly completedAt: string;
	readonly durationMs: number;
	readonly engine: NovelJobEngineMetadata;
	readonly summary: NovelJobSummary;
	readonly events: ReadonlyArray<SerializedGenerationEvent>;
	readonly domainEvents: ReadonlyArray<SerializedDomainEvent>;
	readonly context: NovelGenerationContextSnapshot;
	readonly outline?: ReadonlyArray<NovelOutlineChapterSnapshot>;
	readonly chapters?: ReadonlyArray<NovelChapterSnapshot>;
	readonly analysis?: NovelAnalysisSnapshot | null;
}

export type NovelJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface NovelJobProgressSnapshot {
	readonly outlineComplete: boolean;
	readonly chaptersCompleted: number;
	readonly chaptersFailed: number;
	readonly totalChapters: number;
	readonly hasFailures: boolean;
}

export interface NovelJobFailureSnapshot {
	readonly occurredAt: string;
	readonly reason: string;
	readonly stage?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface NovelJobChapterAttemptSnapshot {
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

export interface NovelJobChapterRecordSnapshot {
	readonly chapterNumber: number;
	readonly title: string;
	readonly status: 'pending' | 'in-progress' | 'completed' | 'failed';
	readonly wordCount?: number | null;
	readonly content?: string;
	readonly model?: string;
	readonly costInUsd?: number;
	readonly attempts: ReadonlyArray<NovelJobChapterAttemptSnapshot>;
}

export interface NovelJobBaseResponse {
	readonly jobId: string;
	readonly status: NovelJobStatus;
	readonly queue: string;
	readonly payload: NovelGenerationJobData['payload'];
	readonly requestedAt: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly progress: NovelJobProgressSnapshot | null;
	readonly summary: NovelJobSummary | null;
	readonly engine: NovelJobEngineMetadata | null;
}

export interface NovelJobSummaryResponse extends NovelJobBaseResponse {}

export interface NovelJobDetailResponse extends NovelJobBaseResponse {
	readonly outline: ReadonlyArray<NovelOutlineChapterSnapshot>;
	readonly chapters: ReadonlyArray<NovelJobChapterRecordSnapshot>;
	readonly events: ReadonlyArray<SerializedGenerationEvent>;
	readonly domainEvents: ReadonlyArray<SerializedDomainEvent>;
	readonly context: NovelGenerationContextSnapshot | null;
	readonly failures: ReadonlyArray<NovelJobFailureSnapshot>;
}

export interface ListNovelJobsResponse {
	readonly items: ReadonlyArray<NovelJobSummaryResponse>;
	readonly count: number;
}

export type NovelJobEventResponse =
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
		readonly snapshot: Record<string, unknown> | null;
	};

export interface ListNovelJobEventsResponse {
	readonly count: number;
	readonly items: ReadonlyArray<NovelJobEventResponse>;
}

export interface NovelJobMetricsResponse {
	readonly jobId: string;
	readonly cost: Record<string, number> & {
		readonly totalUsd: number;
		readonly analysisUsd: number;
		readonly outlineUsd: number;
		readonly chaptersUsd: number;
	};
	readonly tokens: Record<string, number> & {
		readonly total: number;
		readonly analysis: number;
		readonly outline: number;
		readonly chapters: number;
	};
	readonly latencyMs: Record<string, number>;
	readonly updatedAt: string | null;
}

export interface NovelStoryBibleRelationshipSnapshot {
	readonly characterId: string;
	readonly description: string;
}

export interface NovelStoryBibleCharacterSnapshot {
	readonly name: string;
	readonly summary?: string;
	readonly traits?: ReadonlyArray<string>;
	readonly relationships?: ReadonlyArray<NovelStoryBibleRelationshipSnapshot>;
	readonly metadata?: Record<string, unknown>;
}

export interface NovelStoryBibleSnapshot {
	readonly characters: Record<string, NovelStoryBibleCharacterSnapshot>;
	readonly locations?: Record<string, unknown>;
	readonly themes?: ReadonlyArray<string>;
	readonly metadata?: Record<string, unknown>;
}

export type ContinuityAlertSeverity = 'info' | 'warning' | 'critical';

export interface NovelContinuityAlertSnapshot {
	readonly alertId: string;
	readonly title: string;
	readonly message: string;
	readonly severity: ContinuityAlertSeverity;
	readonly createdAt: string;
	readonly context?: Record<string, unknown>;
	readonly resolved: boolean;
	readonly resolvedAt?: string;
}

export interface NovelAiDecisionSnapshot {
	readonly decisionId: string;
	readonly decidedAt: string;
	readonly type: string;
	readonly summary?: string;
	readonly confidence?: number;
	readonly impact?: string;
	readonly metadata?: Record<string, unknown>;
}

export interface NovelJobMetadataResponse {
	readonly jobId: string;
	readonly storyBible: {
		readonly characters: Record<string, NovelStoryBibleCharacterSnapshot>;
		readonly metadata: Record<string, unknown> | null;
		readonly locations: Record<string, unknown> | null;
		readonly themes: ReadonlyArray<string>;
	};
	readonly continuityAlerts: ReadonlyArray<NovelContinuityAlertSnapshot>;
	readonly aiDecisions: ReadonlyArray<NovelAiDecisionSnapshot>;
	readonly enhancements: ReadonlyArray<Record<string, unknown>>;
	readonly performance: Record<string, unknown> | null;
	readonly updatedAt: string | null;
}
