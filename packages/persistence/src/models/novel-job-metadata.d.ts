import { defaultClasses, type DocumentType, type ReturnModelType } from '@typegoose/typegoose';
export declare class StoryBibleRelationshipEntity {
    characterId: string;
    description: string;
}
export declare class StoryBibleCharacterEntity {
    name: string;
    summary?: string;
    traits: string[];
    relationships: StoryBibleRelationshipEntity[];
    metadata?: Record<string, unknown>;
}
export declare class ContinuityAlertEntity {
    alertId: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    createdAt: string;
    resolved: boolean;
    resolvedAt?: string;
    context?: Record<string, unknown>;
}
export declare class AiDecisionEntity {
    decisionId: string;
    type: string;
    decidedAt: string;
    summary?: string;
    confidence?: number;
    impact?: string;
    metadata?: Record<string, unknown>;
}
export declare class EnhancementEntity {
    enhancementId: string;
    createdAt: string;
    data?: Record<string, unknown>;
}
export declare class NovelJobMetadataEntity extends defaultClasses.TimeStamps {
    jobId: string;
    storyBibleCharacters: Record<string, StoryBibleCharacterEntity>;
    storyBibleMetadata?: Record<string, unknown>;
    storyBibleLocations?: Record<string, unknown>;
    storyBibleThemes: string[];
    continuityAlerts: ContinuityAlertEntity[];
    aiDecisions: AiDecisionEntity[];
    enhancements: EnhancementEntity[];
    performance?: Record<string, unknown>;
}
export type NovelJobMetadataDocument = DocumentType<NovelJobMetadataEntity>;
export type NovelJobMetadataModelType = ReturnModelType<typeof NovelJobMetadataEntity>;
export declare const NovelJobMetadataModel: ReturnModelType<typeof NovelJobMetadataEntity, import("@typegoose/typegoose/lib/types").BeAnObject>;
