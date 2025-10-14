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
import type { NovelJobStatus } from '@letswriteabook/domain';
import type { SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';

@modelOptions({
	schemaOptions: { collection: 'novel_job_events', versionKey: false, timestamps: true },
	options: { allowMixed: Severity.ALLOW },
})
@index({ jobId: 1, emittedAt: -1 })
@index({ jobId: 1, kind: 1, emittedAt: -1 })
export class NovelJobEventEntity extends defaultClasses.TimeStamps {
	@prop({ required: true })
	public jobId!: string;

	@prop({ required: true, enum: ['generation', 'domain', 'job-status'] })
	public kind!: 'generation' | 'domain' | 'job-status';

	@prop({ required: true })
	public emittedAt!: string;

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public event?: SerializedGenerationEvent | SerializedDomainEvent;

	@prop({ enum: ['queued', 'running', 'completed', 'failed'] })
	public status?: NovelJobStatus;

	@prop({ type: () => mongoose.Schema.Types.Mixed })
	public snapshot?: Record<string, unknown>;
}

export type NovelJobEventDocument = DocumentType<NovelJobEventEntity>;
export type NovelJobEventModelType = ReturnModelType<typeof NovelJobEventEntity>;
export const NovelJobEventModel = getModelForClass(NovelJobEventEntity);
