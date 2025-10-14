import type {
	NovelJobCostBreakdown,
	NovelJobCostDelta,
	NovelJobLatencyBreakdown,
	NovelJobLatencyDelta,
	NovelJobMetrics,
	NovelJobMetricsRepository,
	NovelJobTokenBreakdown,
	NovelJobTokenDelta,
} from '@letswriteabook/domain';
import {
	NovelJobMetricsModel,
	type NovelJobMetricsDocument,
	type NovelJobMetricsModelType,
} from '../models/novel-job-metrics';
import type { ClientSession } from 'mongoose';

export class MongoNovelJobMetricsRepository implements NovelJobMetricsRepository {
	public constructor(
		private readonly model: NovelJobMetricsModelType = NovelJobMetricsModel,
		private readonly session?: ClientSession,
	) {}

	public withSession(session: ClientSession): MongoNovelJobMetricsRepository {
		return new MongoNovelJobMetricsRepository(this.model, session);
	}

	public async incrementCosts(jobId: string, delta: NovelJobCostDelta): Promise<NovelJobMetrics> {
		const inc: Record<string, number> = buildIncrementPayload('cost', delta);

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
					$inc: inc,
					$setOnInsert: {
						jobId,
					},
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to increment cost metrics for job ${jobId}`);
		}

		return mapToMetrics(doc);
	}

	public async incrementTokens(jobId: string, delta: NovelJobTokenDelta): Promise<NovelJobMetrics> {
		const inc: Record<string, number> = buildIncrementPayload('tokens', delta);

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
					$inc: inc,
					$setOnInsert: {
						jobId,
					},
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to increment token metrics for job ${jobId}`);
		}

		return mapToMetrics(doc);
	}

	public async updateLatency(jobId: string, delta: NovelJobLatencyDelta): Promise<NovelJobMetrics> {
		const inc: Record<string, number> = buildIncrementPayload('latencyMs', delta);

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
					$inc: inc,
					$setOnInsert: {
						jobId,
					},
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to update latency metrics for job ${jobId}`);
		}

		return mapToMetrics(doc);
	}

	public async reset(jobId: string): Promise<NovelJobMetrics> {
		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
					$set: {
						cost: { totalUsd: 0, analysisUsd: 0, outlineUsd: 0, chaptersUsd: 0 },
						tokens: { total: 0, analysis: 0, outline: 0, chapters: 0 },
						latencyMs: {},
					},
					$setOnInsert: {
						jobId,
					},
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to reset metrics for job ${jobId}`);
		}

		return mapToMetrics(doc);
	}

	public async getMetrics(jobId: string): Promise<NovelJobMetrics | null> {
		const query = this.model.findOne({ jobId }).lean();
		if (this.session) {
			query.session(this.session);
		}

		const doc = await query.exec();
		return doc ? mapLeanToMetrics(doc) : null;
	}

	private buildQueryOptions<T extends Record<string, unknown>>(options: T): T & { session?: ClientSession } {
		return this.session ? { ...options, session: this.session } : options;
	}
}

type IncrementPayload = Record<string, number>;

type SupportedDelta = Record<string, number | undefined>;

function buildIncrementPayload(prefix: 'cost' | 'tokens' | 'latencyMs', delta: SupportedDelta): IncrementPayload {
	return Object.entries(delta).reduce<IncrementPayload>((acc, [key, value]) => {
		if (value === undefined || value === 0) {
			return acc;
		}

		acc[`${prefix}.${key}`] = value;
		return acc;
	}, {});
}

function mapToMetrics(doc: NovelJobMetricsDocument): NovelJobMetrics {
	return {
		jobId: doc.jobId,
		cost: sanitizeUnknownBreakdown(doc.cost) as NovelJobCostBreakdown,
		tokens: sanitizeUnknownBreakdown(doc.tokens) as NovelJobTokenBreakdown,
		latencyMs: sanitizeUnknownBreakdown(doc.latencyMs) as NovelJobLatencyBreakdown,
		updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
	};
}

function mapLeanToMetrics(doc: Record<string, unknown>): NovelJobMetrics {
	const typedDoc = doc as {
		readonly jobId: string;
		readonly cost?: Record<string, unknown>;
		readonly tokens?: Record<string, unknown>;
		readonly latencyMs?: Record<string, unknown>;
		readonly updatedAt?: Date | string;
	};

	return {
		jobId: typedDoc.jobId,
		cost: sanitizeUnknownBreakdown(typedDoc.cost) as NovelJobCostBreakdown,
		tokens: sanitizeUnknownBreakdown(typedDoc.tokens) as NovelJobTokenBreakdown,
		latencyMs: sanitizeUnknownBreakdown(typedDoc.latencyMs) as NovelJobLatencyBreakdown,
		updatedAt:
			typedDoc.updatedAt instanceof Date
				? typedDoc.updatedAt.toISOString()
				: typeof typedDoc.updatedAt === 'string'
					? typedDoc.updatedAt
					: new Date().toISOString(),
	};
}

function sanitizeUnknownBreakdown(value: unknown): Record<string, unknown> {
	const sanitized = JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;

	return Object.entries(sanitized).reduce<Record<string, unknown>>((acc, [key, entry]) => {
		if (typeof entry === 'number') {
			acc[key] = entry;
		}

		return acc;
	}, {});
}
