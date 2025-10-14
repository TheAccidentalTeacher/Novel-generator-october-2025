import type { AiDecisionInput, ContinuityAlertInput, NovelJobMetadata, NovelJobMetadataRepository, NovelStoryBiblePatch } from '@letswriteabook/domain';
import { type NovelJobMetadataModelType } from '../models/novel-job-metadata';
import type { ClientSession } from 'mongoose';
export declare class MongoNovelJobMetadataRepository implements NovelJobMetadataRepository {
    private readonly model;
    private readonly session?;
    constructor(model?: NovelJobMetadataModelType, session?: ClientSession | undefined);
    withSession(session: ClientSession): MongoNovelJobMetadataRepository;
    upsertStoryBible(jobId: string, patch: NovelStoryBiblePatch): Promise<NovelJobMetadata>;
    addContinuityAlert(jobId: string, alert: ContinuityAlertInput): Promise<NovelJobMetadata>;
    resolveContinuityAlert(jobId: string, alertId: string, resolvedAt?: string): Promise<NovelJobMetadata>;
    appendAiDecision(jobId: string, decision: AiDecisionInput): Promise<NovelJobMetadata>;
    getMetadata(jobId: string): Promise<NovelJobMetadata | null>;
    private findOrCreate;
    private buildQueryOptions;
}
