import { defaultClasses, type DocumentType, type ReturnModelType } from '@typegoose/typegoose';
import type { NovelChapterSnapshot, NovelGenerationContextSnapshot, NovelGenerationJobData, NovelJobEngineMetadata, NovelJobSummary, NovelOutlineChapterSnapshot, SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';
import type { NovelJobFailureRecord, NovelJobStatus } from '@letswriteabook/domain';
export declare class NovelJobFailureEntity implements NovelJobFailureRecord {
    occurredAt: string;
    reason: string;
    stage?: string;
    metadata?: Record<string, unknown>;
}
export declare class NovelJobEntity extends defaultClasses.TimeStamps {
    jobId: string;
    queue: string;
    status: NovelJobStatus;
    payload: NovelGenerationJobData['payload'];
    requestedAt?: string | null;
    receivedAt: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    analysis?: NovelGenerationContextSnapshot['analysis'];
    outline: NovelOutlineChapterSnapshot[];
    chapters: NovelChapterSnapshot[];
    context?: NovelGenerationContextSnapshot;
    summary?: NovelJobSummary;
    engine?: NovelJobEngineMetadata;
    events: SerializedGenerationEvent[];
    domainEvents: SerializedDomainEvent[];
    failures: NovelJobFailureRecord[];
}
export type NovelJobDocument = DocumentType<NovelJobEntity>;
export type NovelJobModelType = ReturnModelType<typeof NovelJobEntity>;
export declare const NovelJobModel: ReturnModelType<typeof NovelJobEntity, import("@typegoose/typegoose/lib/types").BeAnObject>;
