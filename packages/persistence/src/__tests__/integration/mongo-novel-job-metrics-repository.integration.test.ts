import { randomUUID } from 'node:crypto';
import type { Connection } from 'mongoose';
import { getMongoConnection } from '../../connection.ts';
import { NovelJobMetricsModel } from '../../models/novel-job-metrics.ts';
import { MongoNovelJobMetricsRepository } from '../../repositories/mongo-novel-job-metrics-repository.ts';

describe('MongoNovelJobMetricsRepository (integration)', () => {
	let connection: Connection;

	beforeAll(() => {
		connection = getMongoConnection();
	});

	afterEach(async () => {
		await NovelJobMetricsModel.deleteMany({}).exec();
	});

	it('increments metrics and persists aggregates', async () => {
		const repository = new MongoNovelJobMetricsRepository();
		const jobId = `job-${randomUUID()}`;

		const cost = await repository.incrementCosts(jobId, {
			totalUsd: 1.25,
			analysisUsd: 0.5,
			outlineUsd: 0.25,
		});

		expect(cost.cost.totalUsd).toBeCloseTo(1.25);
		expect(cost.cost.analysisUsd).toBeCloseTo(0.5);
		expect(cost.cost.outlineUsd).toBeCloseTo(0.25);

		const tokens = await repository.incrementTokens(jobId, {
			total: 10_000,
			analysis: 1_000,
			chapters: 8_000,
		});

		expect(tokens.tokens.total).toBe(10_000);
		expect(tokens.tokens.analysis).toBe(1_000);
		expect(tokens.tokens.chapters).toBe(8_000);

		const latency = await repository.updateLatency(jobId, {
			total: 12_000,
			outline: 2_000,
		});

		expect(latency.latencyMs.total).toBe(12_000);
		expect(latency.latencyMs.outline).toBe(2_000);

		const fetched = await repository.getMetrics(jobId);
		expect(fetched).not.toBeNull();
		expect(fetched?.cost.totalUsd).toBeCloseTo(1.25);
		expect(fetched?.tokens.total).toBe(10_000);
		expect(fetched?.latencyMs.total).toBe(12_000);
	});

	it('resets existing metrics document', async () => {
		const repository = new MongoNovelJobMetricsRepository();
		const jobId = `job-${randomUUID()}`;

		await repository.incrementCosts(jobId, { totalUsd: 2.5, chaptersUsd: 2.5 });
		await repository.incrementTokens(jobId, { total: 5_000, chapters: 5_000 });

		const reset = await repository.reset(jobId);
		expect(reset.cost.totalUsd).toBe(0);
		expect(reset.tokens.total).toBe(0);
		for (const value of Object.values(reset.latencyMs ?? {})) {
			expect(value).toBe(0);
		}

		const fetched = await repository.getMetrics(jobId);
		expect(fetched?.cost.totalUsd).toBe(0);
		expect(fetched?.tokens.total).toBe(0);
	});

	it('supports transactions via withSession', async () => {
		const repository = new MongoNovelJobMetricsRepository();
		const session = await connection.startSession();
		const jobId = `job-${randomUUID()}`;

		try {
			await session.withTransaction(async () => {
				const transactionalRepo = repository.withSession(session);
				await transactionalRepo.incrementCosts(jobId, { totalUsd: 0.75 });
				await transactionalRepo.incrementTokens(jobId, { total: 2_500 });
			});
		} finally {
			await session.endSession();
		}

		const fetched = await repository.getMetrics(jobId);
		expect(fetched).not.toBeNull();
		expect(fetched?.cost.totalUsd).toBeCloseTo(0.75);
		expect(fetched?.tokens.total).toBe(2_500);
	});
});