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
