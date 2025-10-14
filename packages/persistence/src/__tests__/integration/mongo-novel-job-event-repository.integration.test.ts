import { randomUUID } from 'node:crypto';
import type { Connection } from 'mongoose';
import { getMongoConnection } from '../../connection.ts';
import { NovelJobEventModel } from '../../models/novel-job-event.ts';
import { MongoNovelJobEventRepository } from '../../repositories/mongo-novel-job-event-repository.ts';

describe('MongoNovelJobEventRepository (integration)', () => {
	let connection: Connection;

	beforeAll(() => {
		connection = getMongoConnection();
	});

	afterEach(async () => {
		await NovelJobEventModel.deleteMany({}).exec();
	});

	it('persists and lists events in reverse chronological order', async () => {
		const repository = new MongoNovelJobEventRepository();
		const jobId = `job-${randomUUID()}`;

		await repository.append({
			kind: 'generation',
			jobId,
			emittedAt: '2025-10-06T08:00:00.000Z',
			event: {
				type: 'chapter-progress',
				payload: { chapterNumber: 1, status: 'completed' },
			},
		});

		await repository.append({
			kind: 'domain',
			jobId,
			emittedAt: '2025-10-06T09:00:00.000Z',
			event: {
				type: 'continuity-alert',
				payload: { alertId: 'alert-1' },
			},
		});

		await repository.append({
			kind: 'job-status',
			jobId,
			emittedAt: '2025-10-06T10:00:00.000Z',
			status: 'running',
			snapshot: { progress: { chaptersCompleted: 1 } },
		});

		const events = await repository.list(jobId);
		expect(events.map((event) => event.kind)).toEqual(['job-status', 'domain', 'generation']);
		expect(events[0]).toMatchObject({ kind: 'job-status', status: 'running' });
		expect(events[1]).toMatchObject({ kind: 'domain', event: expect.objectContaining({ type: 'continuity-alert' }) });
		expect(events[2]).toMatchObject({ kind: 'generation', event: expect.objectContaining({ type: 'chapter-progress' }) });
	});

	it('applies limit and before cursor when listing', async () => {
		const repository = new MongoNovelJobEventRepository();
		const jobId = `job-${randomUUID()}`;

		await repository.append({
			kind: 'generation',
			jobId,
			emittedAt: '2025-10-06T08:00:00.000Z',
			event: { type: 'chapter-progress', payload: {} },
		});
		await repository.append({
			kind: 'domain',
			jobId,
			emittedAt: '2025-10-06T09:00:00.000Z',
			event: { type: 'continuity-alert', payload: {} },
		});
		await repository.append({
			kind: 'job-status',
			jobId,
			emittedAt: '2025-10-06T10:00:00.000Z',
			status: 'completed',
		});

		const limited = await repository.list(jobId, { limit: 2 });
		expect(limited).toHaveLength(2);
		expect(limited[0].kind).toBe('job-status');
		expect(limited[1].kind).toBe('domain');

		const paged = await repository.list(jobId, {
			before: '2025-10-06T09:30:00.000Z',
		});
		expect(paged).toHaveLength(2);
		expect(paged.map((event) => event.kind)).toEqual(['domain', 'generation']);
	});

	it('supports transactions when appending events', async () => {
		const repository = new MongoNovelJobEventRepository();
		const session = await connection.startSession();
		const jobId = `job-${randomUUID()}`;

		try {
			await session.withTransaction(async () => {
				const transactionalRepo = repository.withSession(session);
				await transactionalRepo.append({
					kind: 'generation',
					jobId,
					event: { type: 'chapter-progress', payload: { chapterNumber: 1 } },
				});
				await transactionalRepo.append({
					kind: 'job-status',
					jobId,
					status: 'running',
				});
			});
		} finally {
			await session.endSession();
		}

		const events = await repository.list(jobId);
		expect(events).toHaveLength(2);
		expect(events[0].kind).toBe('job-status');
		expect(events[1].kind).toBe('generation');
	});
});