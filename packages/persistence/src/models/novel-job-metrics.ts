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

@modelOptions({ schemaOptions: { _id: false, versionKey: false } })
export class NovelJobCostBreakdownEntity {
	@prop({ required: true, default: 0 })
	public totalUsd!: number;

	@prop({ default: 0 })
	public analysisUsd?: number;

	@prop({ default: 0 })
	public outlineUsd?: number;

	@prop({ default: 0 })
	public chaptersUsd?: number;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed })
	public extra?: Record<string, number>;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false } })
export class NovelJobTokenBreakdownEntity {
	@prop({ required: true, default: 0 })
	public total!: number;

	@prop({ default: 0 })
	public analysis?: number;

	@prop({ default: 0 })
	public outline?: number;

	@prop({ default: 0 })
	public chapters?: number;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed })
	public extra?: Record<string, number>;
}

@modelOptions({ schemaOptions: { _id: false, versionKey: false } })
export class NovelJobLatencyBreakdownEntity {
	@prop({ default: 0 })
	public analysis?: number;

	@prop({ default: 0 })
	public outline?: number;

	@prop({ default: 0 })
	public chapters?: number;

	@prop({ default: 0 })
	public total?: number;

	@prop({ allowMixed: Severity.ALLOW, type: () => mongoose.Schema.Types.Mixed })
	public extra?: Record<string, number>;
}

@modelOptions({
	schemaOptions: { collection: 'novel_job_metrics', versionKey: false, timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
@index({ jobId: 1 }, { unique: true })
@index({ updatedAt: -1 })
export class NovelJobMetricsEntity extends defaultClasses.TimeStamps {
	@prop({ required: true, unique: true })
	public jobId!: string;

	@prop({ type: () => NovelJobCostBreakdownEntity, _id: false, default: () => ({ totalUsd: 0 }) })
	public cost!: NovelJobCostBreakdownEntity;

	@prop({ type: () => NovelJobTokenBreakdownEntity, _id: false, default: () => ({ total: 0 }) })
	public tokens!: NovelJobTokenBreakdownEntity;

	@prop({ type: () => NovelJobLatencyBreakdownEntity, _id: false, default: () => ({}) })
	public latencyMs!: NovelJobLatencyBreakdownEntity;
}

export type NovelJobMetricsDocument = DocumentType<NovelJobMetricsEntity>;
export type NovelJobMetricsModelType = ReturnModelType<typeof NovelJobMetricsEntity>;
export const NovelJobMetricsModel = getModelForClass(NovelJobMetricsEntity);
