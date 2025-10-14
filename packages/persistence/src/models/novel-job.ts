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
import type {
  NovelChapterSnapshot,
  NovelGenerationContextSnapshot,
  NovelGenerationJobData,
  NovelJobEngineMetadata,
  NovelJobSummary,
  NovelOutlineChapterSnapshot,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';
import type { NovelJobFailureRecord, NovelJobStatus } from '@letswriteabook/domain';

@modelOptions({
  schemaOptions: { _id: false, versionKey: false },
  options: { allowMixed: Severity.ALLOW },
})
export class NovelJobFailureEntity implements NovelJobFailureRecord {
  @prop({ required: true })
  public occurredAt!: string;

  @prop({ required: true })
  public reason!: string;

  @prop()
  public stage?: string;

  @prop({ type: () => mongoose.Schema.Types.Mixed })
  public metadata?: Record<string, unknown>;
}

@modelOptions({
  schemaOptions: { collection: 'novel_jobs', timestamps: true, versionKey: false },
  options: { allowMixed: Severity.ALLOW },
})
@index({ jobId: 1 }, { unique: true })
@index({ status: 1, createdAt: -1 })
export class NovelJobEntity extends defaultClasses.TimeStamps {
  @prop({ required: true })
  public jobId!: string;

  @prop({ required: true })
  public queue!: string;

  @prop({ required: true, enum: ['queued', 'running', 'completed', 'failed'] })
  public status!: NovelJobStatus;

  @prop({ required: true })
  public payload!: NovelGenerationJobData['payload'];

  @prop()
  public requestedAt?: string | null;

  @prop({ required: true })
  public receivedAt!: string;

  @prop()
  public startedAt?: string;

  @prop()
  public completedAt?: string;

  @prop()
  public durationMs?: number;

  @prop({ type: () => mongoose.Schema.Types.Mixed })
  public analysis?: NovelGenerationContextSnapshot['analysis'];

  @prop({ type: () => [mongoose.Schema.Types.Mixed], default: [] })
  public outline!: NovelOutlineChapterSnapshot[];

  @prop({ type: () => [mongoose.Schema.Types.Mixed], default: [] })
  public chapters!: NovelChapterSnapshot[];

  @prop({ type: () => mongoose.Schema.Types.Mixed })
  public context?: NovelGenerationContextSnapshot;

  @prop({ type: () => mongoose.Schema.Types.Mixed })
  public summary?: NovelJobSummary;

  @prop({ type: () => mongoose.Schema.Types.Mixed })
  public engine?: NovelJobEngineMetadata;

  @prop({ type: () => [mongoose.Schema.Types.Mixed], default: [] })
  public events!: SerializedGenerationEvent[];

  @prop({ type: () => [mongoose.Schema.Types.Mixed], default: [] })
  public domainEvents!: SerializedDomainEvent[];

  @prop({ type: () => [NovelJobFailureEntity], default: [] })
  public failures!: NovelJobFailureRecord[];
}

export type NovelJobDocument = DocumentType<NovelJobEntity>;
export type NovelJobModelType = ReturnModelType<typeof NovelJobEntity>;
export const NovelJobModel = getModelForClass(NovelJobEntity);
