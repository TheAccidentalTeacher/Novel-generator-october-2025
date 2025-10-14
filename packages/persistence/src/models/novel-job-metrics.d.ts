import { defaultClasses, type DocumentType, type ReturnModelType } from '@typegoose/typegoose';
export declare class NovelJobCostBreakdownEntity {
    totalUsd: number;
    analysisUsd?: number;
    outlineUsd?: number;
    chaptersUsd?: number;
    extra?: Record<string, number>;
}
export declare class NovelJobTokenBreakdownEntity {
    total: number;
    analysis?: number;
    outline?: number;
    chapters?: number;
    extra?: Record<string, number>;
}
export declare class NovelJobLatencyBreakdownEntity {
    analysis?: number;
    outline?: number;
    chapters?: number;
    total?: number;
    extra?: Record<string, number>;
}
export declare class NovelJobMetricsEntity extends defaultClasses.TimeStamps {
    jobId: string;
    cost: NovelJobCostBreakdownEntity;
    tokens: NovelJobTokenBreakdownEntity;
    latencyMs: NovelJobLatencyBreakdownEntity;
}
export type NovelJobMetricsDocument = DocumentType<NovelJobMetricsEntity>;
export type NovelJobMetricsModelType = ReturnModelType<typeof NovelJobMetricsEntity>;
export declare const NovelJobMetricsModel: ReturnModelType<typeof NovelJobMetricsEntity, import("@typegoose/typegoose/lib/types").BeAnObject>;
