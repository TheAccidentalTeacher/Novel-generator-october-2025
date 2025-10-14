import type { ListNovelJobEventsOptions, NovelJobEventRecord, NovelJobEventRepository } from '@letswriteabook/domain';
import { type NovelJobEventModelType } from '../models/novel-job-event';
import type { ClientSession } from 'mongoose';
export declare class MongoNovelJobEventRepository implements NovelJobEventRepository {
    private readonly model;
    private readonly session?;
    constructor(model?: NovelJobEventModelType, session?: ClientSession | undefined);
    withSession(session: ClientSession): MongoNovelJobEventRepository;
    append(event: NovelJobEventRecord): Promise<void>;
    list(jobId: string, options?: ListNovelJobEventsOptions): Promise<ReadonlyArray<NovelJobEventRecord>>;
}
