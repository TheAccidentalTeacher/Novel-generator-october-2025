import type { NovelJobCostDelta, NovelJobLatencyDelta, NovelJobMetrics, NovelJobMetricsRepository, NovelJobTokenDelta } from '@letswriteabook/domain';
import { type NovelJobMetricsModelType } from '../models/novel-job-metrics';
import type { ClientSession } from 'mongoose';
export declare class MongoNovelJobMetricsRepository implements NovelJobMetricsRepository {
    private readonly model;
    private readonly session?;
    constructor(model?: NovelJobMetricsModelType, session?: ClientSession | undefined);
    withSession(session: ClientSession): MongoNovelJobMetricsRepository;
    incrementCosts(jobId: string, delta: NovelJobCostDelta): Promise<NovelJobMetrics>;
    incrementTokens(jobId: string, delta: NovelJobTokenDelta): Promise<NovelJobMetrics>;
    updateLatency(jobId: string, delta: NovelJobLatencyDelta): Promise<NovelJobMetrics>;
    reset(jobId: string): Promise<NovelJobMetrics>;
    getMetrics(jobId: string): Promise<NovelJobMetrics | null>;
    private buildQueryOptions;
}
