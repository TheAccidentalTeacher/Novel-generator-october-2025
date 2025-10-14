import type { GenerationContext } from '../../core/contracts';
import { MockAiClient } from '../../core/client/mockClient';
import type { GenerationEvent, CostTrackedEvent, GenerationProgressEvent } from '../../core/events';
import { NovelGenerationEngine } from '../../core/engine/novelGenerationEngine';
import { buildChapterPrompt, buildOutlinePrompt } from '../../prompts/novelGeneration';
import { LEGACY_JOB_SNAPSHOT } from '../../golden-tests/fixtures/legacyJobSnapshot';
import { LEGACY_FAILURE_SNAPSHOT } from '../../golden-tests/fixtures/legacyFailureSnapshot';

const SILENT_LOGGER = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

function createDeterministicClock(start = new Date('2025-10-04T00:00:00.000Z')): () => Date {
	let current = start.getTime();
	return () => {
		current += 1000;
		return new Date(current);
	};
}

function createInitialContext(job: GenerationContext['job']): GenerationContext {
	return {
		job,
		analysis: null,
		outline: [],
		chapters: [],
		metadata: {},
	} satisfies GenerationContext;
}

function buildChapterContent(wordCount: number, chapterNumber: number, excerpt: string): string {
	const tokens = excerpt.split(/\s+/).filter(Boolean);
	if (tokens.length >= wordCount) {
		return tokens.slice(0, wordCount).join(' ');
	}

	const filler = Array.from({ length: wordCount - tokens.length }, (_, index) => `chapter${chapterNumber}_word${index + 1}`);
	return [...tokens, ...filler].join(' ');
}

function costEventTokens(event: CostTrackedEvent): number {
	const tokensUsed = (event as unknown as { tokensUsed?: number }).tokensUsed;
	return typeof tokensUsed === 'number' ? tokensUsed : event.totalTokens;
}

function formatEventSequence(events: readonly GenerationEvent[]): string[] {
	return events
		.filter((event) => event.type !== 'stage-log')
		.map((event) => {
			switch (event.type) {
				case 'phase-transition':
					return `${event.type}:${event.from}->${event.to}`;
				case 'job-update':
					return `${event.type}:${event.message}`;
				case 'generation-progress':
					return `${event.type}:${event.chapterNumber}:${event.status}`;
				case 'cost-tracking':
					return `${event.type}:${event.chapterNumber}`;
						default: {
							const exhaustiveCheck: never = event;
							throw new Error(`Unhandled event type in sequence formatter: ${JSON.stringify(exhaustiveCheck)}`);
						}
			}
		});
}

function summarizeSuccessRun(context: GenerationContext, events: readonly GenerationEvent[]) {
	const outlineMetadata = (context.metadata?.outlineStage ?? {}) as {
		readonly costInUsd?: number;
		readonly tokens?: { readonly totalTokens: number };
	};

	const outlineCost = Number(((outlineMetadata.costInUsd ?? 0)).toFixed(5));
	const chapterCosts = context.chapters.map((chapter) => Number(((chapter.costInUsd ?? 0)).toFixed(5)));
	const totalCost = Number((outlineCost + chapterCosts.reduce((acc, cost) => acc + cost, 0)).toFixed(5));

	const tokensFromUsage = (outlineMetadata.tokens?.totalTokens ?? 0)
		+ context.chapters.reduce((acc, chapter) => acc + (chapter.tokens?.totalTokens ?? 0), 0);

		const costEvents = events.filter((event): event is CostTrackedEvent => event.type === 'cost-tracking');
		const tokensFromEvents = costEvents.reduce((acc, event) => acc + costEventTokens(event), 0);

	const generationProgressEvents = events.filter((event): event is GenerationProgressEvent => event.type === 'generation-progress');
	const generationProgressByChapter = context.chapters.map((chapter) => ({
		chapter: chapter.chapterNumber,
		statuses: generationProgressEvents
			.filter((event) => event.chapterNumber === chapter.chapterNumber)
			.map((event) => event.status),
	}));

	const jobUpdates = [...events].reverse().filter((event) => event.type === 'job-update');
	if (jobUpdates.length === 0) {
		throw new Error('Expected at least one job-update event to summarize engine run.');
	}

	const finalJobUpdate = jobUpdates[0];

	return {
		jobId: context.job.jobId,
		outlineCost,
		chapterCosts,
		totalCost,
		tokensFromUsage,
		tokensFromEvents,
		chapterWordCounts: context.chapters.map((chapter) => chapter.wordCount ?? 0),
		eventSequence: formatEventSequence(events),
		generationProgressByChapter,
		finalJobStatus: {
			status: finalJobUpdate.status,
			currentPhase: finalJobUpdate.currentPhase,
			message: finalJobUpdate.message,
			progress: finalJobUpdate.progress,
			qualityMetrics: (finalJobUpdate as typeof finalJobUpdate & { qualityMetrics?: unknown }).qualityMetrics,
		},
	};
}

function summarizeFailureRun(
	events: readonly GenerationEvent[],
	{
		jobId,
		outlineCost,
		outlineTokens,
		expectedChapters,
	}: {
		jobId: string;
		outlineCost: number;
		outlineTokens: number;
		expectedChapters: readonly number[];
	},
) {
	const costEvents = events.filter((event): event is CostTrackedEvent => event.type === 'cost-tracking');
		const chapterCosts = costEvents.map((event) => Number((event.costInUsd).toFixed(5)));
	const totalCost = Number((outlineCost + chapterCosts.reduce((acc, cost) => acc + cost, 0)).toFixed(5));

		const tokensFromEvents = costEvents.reduce((acc, event) => acc + costEventTokens(event), 0);

	const generationProgressEvents = events.filter((event): event is GenerationProgressEvent => event.type === 'generation-progress');
	const completedChapters = new Set(
		generationProgressEvents
			.filter((event) => event.status === 'ai_completed')
			.map((event) => event.chapterNumber),
	);

	const completedChapterWordCounts = generationProgressEvents
		.filter((event) => event.status === 'ai_completed' && typeof event.wordsGenerated === 'number')
		.map((event) => event.wordsGenerated ?? 0);

	const failedChapters = expectedChapters.filter((chapter) => !completedChapters.has(chapter));

	const jobUpdates = [...events].reverse().filter((event) => event.type === 'job-update');
	if (jobUpdates.length === 0) {
		throw new Error('Expected at least one job-update event for failure summary.');
	}
	const finalJobUpdate = jobUpdates[0];

	return {
		jobId,
		outlineCost: Number(outlineCost.toFixed(5)),
		chapterCosts,
		totalCost,
		tokensFromUsage: outlineTokens + tokensFromEvents,
		tokensFromEvents,
		completedChapterWordCounts,
		failedChapters,
		eventSequence: formatEventSequence(events),
		finalJobStatus: {
			status: finalJobUpdate.status,
			currentPhase: finalJobUpdate.currentPhase,
			message: finalJobUpdate.message,
			progress: finalJobUpdate.progress,
			qualityMetrics: (finalJobUpdate as typeof finalJobUpdate & { qualityMetrics?: unknown }).qualityMetrics,
		},
	};
}

describe('NovelGenerationEngine golden regression parity', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('replays the legacy success snapshot using mocked OpenAI responses', async () => {
		const snapshot = LEGACY_JOB_SNAPSHOT;
		const events: GenerationEvent[] = [];
		let chapterIndex = 0;

		const client = new MockAiClient({
			analyzePremise: async () => ({
				raw: JSON.stringify({ source: 'legacy-analysis' }),
				analysis: snapshot.analysisSummary,
				tokens: { promptTokens: 1200, completionTokens: 900, totalTokens: 2100 },
				costInUsd: 0.0021,
			}),
			generateOutline: async (input) => {
				const prompt = buildOutlinePrompt(input);
				expect(prompt).toEqual(snapshot.outlineCall.prompt);
				return {
					prompt,
					outline: snapshot.outlineCall.response.outline,
					analysis: snapshot.analysisSummary,
					raw: { model: snapshot.outlineCall.model },
					tokens: {
						promptTokens: snapshot.outlineCall.usage.promptTokens,
						completionTokens: snapshot.outlineCall.usage.completionTokens,
						totalTokens: snapshot.outlineCall.usage.totalTokens,
					},
					costInUsd: snapshot.outlineCall.cost,
				};
			},
			generateChapter: async (input) => {
				const record = snapshot.chapterCalls[chapterIndex];
				expect(record).toBeDefined();
				expect(buildChapterPrompt(input)).toEqual(record.prompt);

				chapterIndex += 1;

				return {
					prompt: record.prompt,
					chapterNumber: record.chapterNumber,
					content: buildChapterContent(record.result.wordCount, record.chapterNumber, record.result.contentExcerpt),
					tokens: record.usage,
					costInUsd: record.cost,
					raw: { model: record.model },
				};
			},
		});

		const engine = new NovelGenerationEngine({
			services: {
				client,
				emit: (event) => events.push(event),
				now: createDeterministicClock(),
				logger: SILENT_LOGGER,
			},
		});

		const result = await engine.run(createInitialContext(snapshot.job));

		expect(result.analysis).toEqual(snapshot.analysisSummary);
		expect(result.outline).toEqual(snapshot.outlineCall.response.outline);
		expect(result.chapters).toHaveLength(snapshot.chapterCalls.length);

		result.chapters.forEach((chapter, index) => {
			const record = snapshot.chapterCalls[index];
			expect(chapter.chapterNumber).toBe(record.chapterNumber);
			expect(chapter.wordCount).toBe(record.result.wordCount);
			expect(chapter.prompt).toBe(record.prompt);
			expect(chapter.costInUsd).toBeCloseTo(record.cost, 10);
			expect(chapter.tokens).toEqual(record.usage);
		});

		const summary = summarizeSuccessRun(result, events);
		expect(summary).toEqual(snapshot.summary);
	});

	it('captures the legacy failure snapshot semantics when chapter generation exhausts retries', async () => {
		const snapshot = LEGACY_FAILURE_SNAPSHOT;
		const events: GenerationEvent[] = [];
		const chapterAttemptHistory = new Map<number, number>();
		const outlineCall = snapshot.outlineCall;

		const client = new MockAiClient({
			analyzePremise: async () => ({
				raw: JSON.stringify({ source: 'legacy-analysis' }),
				analysis: snapshot.analysisSummary,
				tokens: { promptTokens: 900, completionTokens: 700, totalTokens: 1600 },
				costInUsd: 0.0016,
			}),
			generateOutline: async (input) => {
				const prompt = buildOutlinePrompt(input);
				expect(prompt).toEqual(outlineCall.prompt);
				return {
					prompt,
					outline: snapshot.outline,
					analysis: snapshot.analysisSummary,
					raw: { model: outlineCall.model },
					tokens: {
						promptTokens: outlineCall.usage.promptTokens,
						completionTokens: outlineCall.usage.completionTokens,
						totalTokens: outlineCall.usage.totalTokens,
					},
					costInUsd: outlineCall.cost,
				};
			},
					generateChapter: async (input) => {
						const outcome = snapshot.chapterOutcomes.find((item) => item.chapterNumber === input.chapterOutline.chapterNumber);
				if (!outcome) {
					throw new Error(`Unexpected chapter request for chapter ${input.chapterOutline.chapterNumber}`);
				}

						const attempts = chapterAttemptHistory.get(outcome.chapterNumber) ?? 0;
						const attemptRecord = outcome.attempts[attempts] ?? outcome.attempts[outcome.attempts.length - 1];
						expect(buildChapterPrompt(input)).toEqual(attemptRecord?.prompt);
						chapterAttemptHistory.set(outcome.chapterNumber, attempts + 1);

				if (outcome.finalStatus === 'failed') {
					throw new Error(attemptRecord?.error ?? 'legacy-failure');
				}

				if (!attemptRecord || !outcome.result) {
					throw new Error(`Missing success attempt data for chapter ${outcome.chapterNumber}`);
				}

				return {
					prompt: attemptRecord.prompt,
					chapterNumber: outcome.chapterNumber,
					content: buildChapterContent(outcome.result.wordCount, outcome.chapterNumber, outcome.result.contentExcerpt),
					tokens: attemptRecord.usage!,
					costInUsd: attemptRecord.cost!,
					raw: { model: 'gpt-4o' },
				};
			},
		});

		const engine = new NovelGenerationEngine({
			services: {
				client,
				emit: (event) => events.push(event),
				now: createDeterministicClock(),
				logger: SILENT_LOGGER,
			},
		});

		await expect(engine.run(createInitialContext(snapshot.job))).rejects.toThrow('Stage "chapter-stage" failed:');

		const failureSummary = summarizeFailureRun(events, {
			jobId: snapshot.job.jobId,
			outlineCost: outlineCall.cost,
			outlineTokens: outlineCall.usage.totalTokens,
			expectedChapters: snapshot.chapterOutcomes.map((outcome) => outcome.chapterNumber),
		});

		expect(failureSummary).toEqual(snapshot.summary);
	});
});
