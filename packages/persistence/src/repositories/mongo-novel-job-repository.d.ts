import type { NovelGenerationJobResult } from '@letswriteabook/shared-types';
import type { NovelJobAggregate, NovelJobFailureInput, NovelJobInitializationInput, NovelJobRepository, NovelJobStatus } from '@letswriteabook/domain';
import { type NovelJobModelType } from '../models/novel-job';
import type { ClientSession } from 'mongoose';
type ListOptions = {
    readonly limit?: number;
    readonly statuses?: ReadonlyArray<NovelJobStatus>;
};
export declare class MongoNovelJobRepository implements NovelJobRepository {
    private readonly model;
    private readonly session?;
    constructor(model?: NovelJobModelType, session?: ClientSession | undefined);
    withSession(session: ClientSession): MongoNovelJobRepository;
    initializeJob(input: NovelJobInitializationInput): Promise<NovelJobAggregate>;
    saveGenerationResult(result: NovelGenerationJobResult): Promise<NovelJobAggregate>;
    recordFailure(jobId: string, failure: NovelJobFailureInput): Promise<NovelJobAggregate>;
    findByJobId(jobId: string): Promise<NovelJobAggregate | null>;
    listActiveJobs(options?: ListOptions): Promise<ReadonlyArray<NovelJobAggregate>>;
    private buildQueryOptions;
}
export {};
