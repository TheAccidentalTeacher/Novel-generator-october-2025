import { defaultClasses, type DocumentType, type ReturnModelType } from '@typegoose/typegoose';
import type { NovelJobStatus } from '@letswriteabook/domain';
import type { SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';
export declare class NovelJobEventEntity extends defaultClasses.TimeStamps {
    jobId: string;
    kind: 'generation' | 'domain' | 'job-status';
    emittedAt: string;
    event?: SerializedGenerationEvent | SerializedDomainEvent;
    status?: NovelJobStatus;
    snapshot?: Record<string, unknown>;
}
export type NovelJobEventDocument = DocumentType<NovelJobEventEntity>;
export type NovelJobEventModelType = ReturnModelType<typeof NovelJobEventEntity>;
export declare const NovelJobEventModel: ReturnModelType<typeof NovelJobEventEntity, import("@typegoose/typegoose/lib/types").BeAnObject>;
