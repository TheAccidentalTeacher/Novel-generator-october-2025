import mongoose from 'mongoose';
import {
	defaultClasses,
	getModelForClass,
	index,
	modelOptions,
	prop,
	Severity,
	type DocumentType,
	type ReturnModelType,
} from '@typegoose/typegoose';

@modelOptions({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class StoryBibleRelationshipEntity {
	@prop({ required: true })
	public characterId!: string;

	@prop({ required: true })
	public description!: string;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class StoryBibleCharacterEntity {
	@prop({ required: true })
	public name!: string;

	@prop()
	public summary?: string;

	@prop({ type: () => [String], default: [] })
	public traits!: string[];

	@prop({ type: () => [StoryBibleRelationshipEntity], default: [] })
	public relationships!: StoryBibleRelationshipEntity[];

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public metadata?: Record<string, unknown>;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class ContinuityAlertEntity {
	@prop({ required: true })
	public alertId!: string;

	@prop({ required: true })
	public title!: string;

	@prop({ required: true })
	public message!: string;

	@prop({ required: true, enum: ['info', 'warning', 'critical'] })
	public severity!: 'info' | 'warning' | 'critical';

	@prop({ required: true })
	public createdAt!: string;

	@prop({ default: false })
	public resolved!: boolean;

	@prop()
	public resolvedAt?: string;

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public context?: Record<string, unknown>;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class AiDecisionEntity {
	@prop({ required: true })
	public decisionId!: string;

	@prop({ required: true })
	public type!: string;

	@prop({ required: true })
	public decidedAt!: string;

	@prop()
	public summary?: string;

	@prop()
	public confidence?: number;

	@prop()
	public impact?: string;

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public metadata?: Record<string, unknown>;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: Severity.ALLOW } })
export class EnhancementEntity {
	@prop({ required: true })
	public enhancementId!: string;

	@prop({ required: true })
	public createdAt!: string;

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public data?: Record<string, unknown>;
}

@modelOptions({
	schemaOptions: { collection: 'novel_job_metadata', versionKey: false, timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
@index({ jobId: 1 }, { unique: true })
@index({ jobId: 1, 'continuityAlerts.resolved': 1 })
export class NovelJobMetadataEntity extends defaultClasses.TimeStamps {
	@prop({ required: true, unique: true })
	public jobId!: string;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed, default: () => ({}) })
	public storyBibleCharacters!: Record<string, StoryBibleCharacterEntity>;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed })
	public storyBibleMetadata?: Record<string, unknown>;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed })
	public storyBibleLocations?: Record<string, unknown>;

	@prop({ type: () => [String], default: [] })
	public storyBibleThemes!: string[];

	@prop({ type: () => [ContinuityAlertEntity], default: [] })
	public continuityAlerts!: ContinuityAlertEntity[];

	@prop({ type: () => [AiDecisionEntity], default: [] })
	public aiDecisions!: AiDecisionEntity[];

	@prop({ type: () => [EnhancementEntity], default: [] })
	public enhancements!: EnhancementEntity[];

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public performance?: Record<string, unknown>;
}

export type NovelJobMetadataDocument = DocumentType<NovelJobMetadataEntity>;
export type NovelJobMetadataModelType = ReturnModelType<typeof NovelJobMetadataEntity>;
export const NovelJobMetadataModel = getModelForClass(NovelJobMetadataEntity);
