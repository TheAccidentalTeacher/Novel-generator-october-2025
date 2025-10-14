import type { AnalysisSummary, ChapterOutlineDetails, ExistingChapterSummary } from '../prompts/novelGeneration';

export type GenerationEvent =
  | PhaseTransitionedEvent
  | JobUpdatedEvent
  | GenerationProgressEvent
  | CostTrackedEvent
  | StageLogEvent;

export interface GenerationEventBase {
  readonly occurredAt: Date;
  readonly context?: Partial<GenerationContextSnapshot>;
}

export interface GenerationContextSnapshot {
  readonly jobId: string;
  readonly currentPhase?: PhaseIdentifier;
  readonly chaptersCompleted?: number;
  readonly chaptersFailed?: number;
  readonly totalChapters?: number;
}

export type PhaseIdentifier =
  | 'initialization'
  | 'analysis'
  | 'outline_generation'
  | 'chapter_generation'
  | 'cleanup'
  | 'outlining'
  | 'chapter_writing'
  | 'completed'
  | (string & {});

export interface PhaseTransitionedEvent extends GenerationEventBase {
  readonly type: 'phase-transition';
  readonly from: PhaseIdentifier;
  readonly to: PhaseIdentifier;
  readonly description: string;
}

export interface JobProgressSnapshot {
  readonly outlineComplete: boolean;
  readonly chaptersCompleted: number;
  readonly chaptersFailed: number;
  readonly totalChapters: number;
  readonly hasFailures: boolean;
  readonly failedChapterNumbers?: readonly number[];
  readonly estimatedCompletion?: string;
}

export interface QualityMetricsSnapshot {
  readonly averageChapterLength: number;
  readonly totalWordCount: number;
  readonly targetAccuracy: number;
  readonly completionRate: number;
  readonly chaptersCompleted: number;
  readonly chaptersFailed: number;
  readonly hasFailures: boolean;
  readonly failedChapters: readonly number[];
}

export interface JobUpdatedEvent extends GenerationEventBase {
  readonly type: 'job-update';
  readonly status: string;
  readonly currentPhase: PhaseIdentifier;
  readonly message: string;
  readonly progress: JobProgressSnapshot;
  readonly qualityMetrics?: QualityMetricsSnapshot;
}

export interface GenerationProgressEvent extends GenerationEventBase {
  readonly type: 'generation-progress';
  readonly chapterNumber: number;
  readonly status: 'ai_generating' | 'ai_completed' | (string & {});
  readonly details: string;
  readonly wordTarget?: number;
  readonly wordsGenerated?: number;
}

export interface CostTrackedEvent extends GenerationEventBase {
  readonly type: 'cost-tracking';
  readonly chapterNumber: number;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costInUsd: number;
}

export interface StageLogEvent extends GenerationEventBase {
  readonly type: 'stage-log';
  readonly stage: string;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface OutlineSnapshot {
  readonly analysis?: AnalysisSummary | null;
  readonly outline: readonly ChapterOutlineDetails[];
}

export interface ChapterSnapshot {
  readonly chapterNumber: number;
  readonly title: string;
  readonly content?: string;
  readonly wordCount?: number;
  readonly summary?: ExistingChapterSummary;
}
