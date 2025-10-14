import type { GenerationContextSnapshot, JobProgressSnapshot, PhaseIdentifier, QualityMetricsSnapshot } from './events';

export type DomainEvent =
  | PhaseTransitionedDomainEvent
  | JobStatusUpdatedDomainEvent
  | ChapterProgressDomainEvent
  | ChapterCostTrackedDomainEvent
  | JobCompletedDomainEvent;

export interface DomainEventBase {
  readonly type: string;
  readonly jobId: string;
  readonly occurredAt: Date;
  readonly context?: Partial<GenerationContextSnapshot>;
}

export interface PhaseTransitionedDomainEvent extends DomainEventBase {
  readonly type: 'phase-transitioned';
  readonly from: PhaseIdentifier;
  readonly to: PhaseIdentifier;
  readonly description: string;
}

export interface JobStatusUpdatedDomainEvent extends DomainEventBase {
  readonly type: 'job-status-updated';
  readonly status: string;
  readonly currentPhase: PhaseIdentifier;
  readonly message: string;
  readonly progress: JobProgressSnapshot;
}

export interface JobCompletedDomainEvent extends DomainEventBase {
  readonly type: 'job-completed';
  readonly status: string;
  readonly currentPhase: PhaseIdentifier;
  readonly message: string;
  readonly progress: JobProgressSnapshot;
  readonly qualityMetrics?: QualityMetricsSnapshot;
}

export interface ChapterProgressDomainEvent extends DomainEventBase {
  readonly type: 'chapter-progress';
  readonly chapterNumber: number;
  readonly status: 'ai_generating' | 'ai_completed' | (string & {});
  readonly details: string;
  readonly wordTarget?: number;
  readonly wordsGenerated?: number;
}

export interface ChapterCostTrackedDomainEvent extends DomainEventBase {
  readonly type: 'chapter-cost-tracked';
  readonly chapterNumber: number;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly costInUsd: number;
}
