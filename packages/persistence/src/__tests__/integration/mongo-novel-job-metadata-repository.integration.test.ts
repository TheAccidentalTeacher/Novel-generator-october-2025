import { randomUUID } from 'node:crypto';
import type { Connection } from 'mongoose';
import { getMongoConnection } from '../../connection.ts';
import { NovelJobMetadataModel } from '../../models/novel-job-metadata.ts';
import { MongoNovelJobMetadataRepository } from '../../repositories/mongo-novel-job-metadata-repository.ts';

describe('MongoNovelJobMetadataRepository (integration)', () => {
	let connection: Connection;

	beforeAll(() => {
		connection = getMongoConnection();
	});

	afterEach(async () => {
		await NovelJobMetadataModel.deleteMany({}).exec();
	});

	it('upserts story bible characters, metadata, and themes', async () => {
		const repository = new MongoNovelJobMetadataRepository();
		const jobId = `job-${randomUUID()}`;

		await repository.upsertStoryBible(jobId, {
			characters: {
				alice: {
					name: 'Alice',
					summary: 'Curious protagonist',
					traits: ['brave'],
					relationships: [],
				},
			},
			metadata: { tone: 'whimsical' },
			themes: ['identity'],
			locations: { wonderland: { description: 'Surreal world' } },
		});

		const updated = await repository.upsertStoryBible(jobId, {
			characters: {
				alice: {
					name: 'Alice Liddell',
					summary: 'Older and wiser',
					traits: ['brave', 'curious'],
				},
			},
			removeCharacters: ['unused'],
			metadata: { tone: 'reflective', audience: 'young-adult' },
			themes: ['identity', 'growth'],
		});

		expect(updated.storyBible.characters.alice.name).toBe('Alice Liddell');
		expect(updated.storyBible.characters.alice.summary).toBe('Older and wiser');
		expect(updated.storyBible.characters.alice.traits).toEqual(expect.arrayContaining(['brave', 'curious']));
		expect(Object.keys(updated.storyBible.characters)).toEqual(['alice']);
		expect(updated.storyBible.metadata).toMatchObject({ tone: 'reflective', audience: 'young-adult' });
		expect(updated.storyBible.locations).toMatchObject({ wonderland: { description: 'Surreal world' } });
		expect(updated.storyBible.themes).toEqual(expect.arrayContaining(['identity', 'growth']));
	});

	it('adds and resolves continuity alerts', async () => {
		const repository = new MongoNovelJobMetadataRepository();
		const jobId = `job-${randomUUID()}`;

		const created = await repository.addContinuityAlert(jobId, {
			alertId: 'alert-1',
			title: 'Inconsistent timeline',
			message: 'Chapter 5 conflicts with Chapter 3 timeline.',
			severity: 'warning',
			context: { chapter: 5 },
		});

		expect(created.continuityAlerts[0]).toMatchObject({
			alertId: 'alert-1',
			resolved: false,
		});

		const resolved = await repository.resolveContinuityAlert(jobId, 'alert-1', '2025-10-06T12:00:00.000Z');
		expect(resolved.continuityAlerts[0]).toMatchObject({
			alertId: 'alert-1',
			resolved: true,
			resolvedAt: '2025-10-06T12:00:00.000Z',
		});
	});

	it('appends AI decisions in reverse chronological order', async () => {
		const repository = new MongoNovelJobMetadataRepository();
		const jobId = `job-${randomUUID()}`;

		await repository.appendAiDecision(jobId, {
			decisionId: 'decision-1',
			type: 'character-development',
			decidedAt: '2025-10-06T08:00:00.000Z',
			summary: 'Introduce rival character.',
		});

		const afterSecond = await repository.appendAiDecision(jobId, {
			decisionId: 'decision-2',
			type: 'plot-choice',
			decidedAt: '2025-10-06T09:00:00.000Z',
			summary: 'Switch to dual timeline.',
		});

		expect(afterSecond.aiDecisions).toHaveLength(2);
		expect(afterSecond.aiDecisions[0]).toMatchObject({ decisionId: 'decision-2' });
		expect(afterSecond.aiDecisions[1]).toMatchObject({ decisionId: 'decision-1' });
	});

	it('persists updates within a Mongo transaction', async () => {
		const repository = new MongoNovelJobMetadataRepository();
		const session = await connection.startSession();
		const jobId = `job-${randomUUID()}`;

		try {
			await session.withTransaction(async () => {
				const transactionalRepo = repository.withSession(session);
				await transactionalRepo.upsertStoryBible(jobId, {
					characters: {
						hero: {
							name: 'Hero',
						},
					},
				});
				await transactionalRepo.appendAiDecision(jobId, {
					decisionId: 'tx-1',
					type: 'structure',
					summary: 'Experiment with pacing.',
				});
			});
		} finally {
			await session.endSession();
		}

		const metadata = await repository.getMetadata(jobId);
		expect(metadata).not.toBeNull();
		expect(metadata?.storyBible.characters.hero).toBeDefined();
		expect(metadata?.aiDecisions[0]).toMatchObject({ decisionId: 'tx-1' });
	});
});