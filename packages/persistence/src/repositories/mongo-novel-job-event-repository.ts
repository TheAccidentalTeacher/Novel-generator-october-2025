import type {
	ListNovelJobEventsOptions,
	NovelJobEventRecord,
	NovelJobEventRepository,
	NovelJobStatus,
} from '@letswriteabook/domain';
import type { SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';
import { NovelJobEventModel, type NovelJobEventModelType } from '../models/novel-job-event';
import type { ClientSession } from 'mongoose';

export class MongoNovelJobEventRepository implements NovelJobEventRepository {
	public constructor(
		private readonly model: NovelJobEventModelType = NovelJobEventModel,
		private readonly session?: ClientSession,
	) {}

	public withSession(session: ClientSession): MongoNovelJobEventRepository {
		return new MongoNovelJobEventRepository(this.model, session);
	}

	public async append(event: NovelJobEventRecord): Promise<void> {
		const emittedAt = event.emittedAt ?? new Date().toISOString();

		await this.model.create(
			[
				{
					jobId: event.jobId,
					kind: event.kind,
					emittedAt,
					event: event.kind === 'job-status' ? undefined : event.event,
					status: event.kind === 'job-status' ? event.status : undefined,
					snapshot: event.kind === 'job-status' ? event.snapshot ?? undefined : undefined,
				},
			],
			this.session ? { session: this.session } : undefined,
		);
	}

	public async list(jobId: string, options: ListNovelJobEventsOptions = {}): Promise<ReadonlyArray<NovelJobEventRecord>> {
		const limit = Math.max(1, options.limit ?? 250);
		const filter: Record<string, unknown> = { jobId };

		if (options.before) {
			filter.emittedAt = { $lt: options.before };
		}

		const query = this.model.find(filter).sort({ emittedAt: -1 }).limit(limit).lean();
		if (this.session) {
			query.session(this.session);
		}

		const docs = await query.exec();

		return docs.map((doc) => mapToRecord(doc));
	}
}

function mapToRecord(doc: {
	readonly jobId: string;
	readonly kind: 'generation' | 'domain' | 'job-status';
	readonly emittedAt: string;
	readonly event?: unknown;
	readonly status?: string;
	readonly snapshot?: Record<string, unknown>;
}): NovelJobEventRecord {
	if (doc.kind === 'generation') {
		return {
			kind: 'generation',
			jobId: doc.jobId,
			emittedAt: doc.emittedAt,
			event: doc.event as SerializedGenerationEvent,
		};
	}

	if (doc.kind === 'domain') {
		return {
			kind: 'domain',
			jobId: doc.jobId,
			emittedAt: doc.emittedAt,
			event: doc.event as SerializedDomainEvent,
		};
	}

	return {
		kind: 'job-status',
		jobId: doc.jobId,
		emittedAt: doc.emittedAt,
		status: (doc.status ?? 'queued') as NovelJobStatus,
		snapshot: sanitizeSnapshot(doc.snapshot),
	};
}

function sanitizeSnapshot(snapshot?: Record<string, unknown>): Record<string, unknown> | undefined {
	if (!snapshot) {
		return undefined;
	}

	return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}
