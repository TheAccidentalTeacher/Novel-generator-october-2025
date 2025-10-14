import type {
	ListNovelJobEventsResponse,
	ListNovelJobsResponse,
	NovelAiDecisionSnapshot,
	NovelContinuityAlertSnapshot,
	NovelJobDetailResponse,
	NovelJobFailureSnapshot,
	NovelJobMetadataResponse,
	NovelJobMetricsResponse,
	NovelJobSummaryResponse,
	NovelJobProgressSnapshot,
	NovelStoryBibleCharacterSnapshot,
	NovelStoryBibleSnapshot,
	SerializedDomainEvent,
	SerializedGenerationEvent
} from '@letswriteabook/shared-types';

import { createApiResult, type ApiResult } from '@/lib/api-client';

const PLACEHOLDER_JOB_ID = 'demo-novel-job';
const PLACEHOLDER_CREATED_AT = '2025-10-07T10:15:00.000Z';
const PLACEHOLDER_UPDATED_AT = '2025-10-07T10:47:00.000Z';
const PLACEHOLDER_QUEUE = 'novel-generation';

const payload = {
	title: 'Demo: The Starlit Voyage',
	premise: 'An AI co-author helps a captain navigate political intrigue across the Andara system.',
	genre: 'Science Fiction',
	subgenre: 'Space Opera',
	targetWordCount: 90_000,
	targetChapters: 18,
	humanLikeWriting: true
};

const progress: NovelJobProgressSnapshot = {
	outlineComplete: true,
	chaptersCompleted: 4,
	chaptersFailed: 0,
	totalChapters: 18,
	hasFailures: false
};

const summary = {
	chaptersGenerated: 4,
	totalChaptersPlanned: 18,
	totalWordCount: 21_400
};

const engine = {
	clientType: 'mock' as const,
	modelOverrides: {
		outline: 'gpt-4.1-preview',
		chapters: 'gpt-4o'
	}
};

const outline = [
	{
		chapterNumber: 1,
		title: 'Launch Day',
		summary: 'Captain Mara Delos departs Luna with an unconventional crew.',
		keyEvents: ['Crew briefing', 'Unexpected stowaway', 'Boost to slipspace'],
		wordTarget: 5_000,
		humanLikeElements: { spotlightCharacter: 'Mara Delos' }
	},
	{
		chapterNumber: 2,
		title: 'Echoes of Andara',
		summary: 'Rumours of an impending coup unsettle the capital world.',
		keyEvents: ['Docking at Andara Prime', 'Coup whispers', 'Alliance envoy request'],
		wordTarget: 5_000
	}
];

const chapterAttempts = [
	{
		attemptNumber: 1,
		createdAt: '2025-10-07T10:25:00.000Z',
		prompt: 'chapter-1 attempt prompt',
		content: 'The launch thrusters roared as Mara gripped the command rail...',
		tokens: {
			promptTokens: 1_260,
			completionTokens: 830,
			totalTokens: 2_090
		},
		costInUsd: 0.48
	}
];

const chapters = [
	{
		chapterNumber: 1,
		title: 'Launch Day',
		status: 'completed' as const,
		wordCount: 4_980,
		content: 'Captain Mara Delos trusted the AI to steady the slipstream corridor...',
		model: 'gpt-4o',
		costInUsd: 0.48,
		attempts: chapterAttempts
	},
	{
		chapterNumber: 2,
		title: 'Echoes of Andara',
		status: 'in-progress' as const,
		attempts: []
	}
];

const generationEvents: SerializedGenerationEvent[] = [
	{
		type: 'job.created',
		occurredAt: '2025-10-07T10:15:00.000Z',
		payload: { jobId: PLACEHOLDER_JOB_ID }
	},
	{
		type: 'chapter.completed',
		occurredAt: '2025-10-07T10:33:00.000Z',
		chapterNumber: 1,
		wordCount: 4_980
	}
];

const domainEvents: SerializedDomainEvent[] = [
	{
		type: 'novel.progress',
		occurredAt: '2025-10-07T10:40:00.000Z',
		progress: {
			chaptersCompleted: 4,
			chaptersFailed: 0,
			totalChapters: 18
		}
	}
];

const failures: NovelJobFailureSnapshot[] = [];

const storyBibleCharacters: Record<string, NovelStoryBibleCharacterSnapshot> = {
	maraDelos: {
		name: 'Captain Mara Delos',
		summary: 'Veteran slipstream pilot balancing duty and instinct.',
		traits: ['Resolute', 'Strategic', 'Empathetic'],
		relationships: [
			{
				characterId: 'fn-947',
				description: 'Co-pilot and confidant'
			}
		]
	}
};

const storyBible: NovelStoryBibleSnapshot = {
	characters: storyBibleCharacters,
	locations: {
		andaraPrime: {
			description: 'Capital world with concentric orbital gardens.',
			keywords: ['diplomacy', 'tension', 'opulence']
		}
	},
	themes: ['Trust vs. Autonomy', 'Empire in Transition'],
	metadata: { aiCompanion: 'Lyris' }
};

const continuityAlerts: NovelContinuityAlertSnapshot[] = [
	{
		alertId: 'alert-001',
		title: 'Check bridge crew roster',
		message: 'Ensure navigator Tamsin appears in chapter 3 to maintain continuity.',
		severity: 'warning',
		createdAt: '2025-10-07T10:42:00.000Z',
		context: { chapter: 3 },
		resolved: false
	}
];

const aiDecisions: NovelAiDecisionSnapshot[] = [
	{
		decisionId: 'decision-001',
		decidedAt: '2025-10-07T10:20:00.000Z',
		type: 'outline-branch-selection',
		summary: 'Selected political intrigue branch for Act II.',
		confidence: 0.82,
		impact: 'Sets up mid-season twist'
	}
];

const metadata = (jobId: string): NovelJobMetadataResponse => ({
	jobId,
	storyBible: {
		characters: storyBibleCharacters,
		metadata: storyBible.metadata ?? null,
		locations: (storyBible.locations as Record<string, unknown>) ?? null,
		themes: storyBible.themes ?? []
	},
	continuityAlerts,
	aiDecisions,
	enhancements: [
		{
			name: 'Show, don’t tell polish',
			runAt: '2025-10-07T10:38:00.000Z'
		}
	],
	performance: {
		averageLatencyMs: 12_500,
		costUsd: 2.74
	},
	updatedAt: PLACEHOLDER_UPDATED_AT
});

const metrics = (jobId: string): NovelJobMetricsResponse => ({
	jobId,
	cost: {
		totalUsd: 12.34,
		analysisUsd: 3.1,
		outlineUsd: 2.4,
		chaptersUsd: 6.84
	},
	tokens: {
		total: 34_200,
		analysis: 9_000,
		outline: 6_400,
		chapters: 18_800
	},
	latencyMs: {
		total: 180_000,
		analysis: 45_000,
		outline: 30_000,
		chapters: 105_000
	},
	updatedAt: PLACEHOLDER_UPDATED_AT
});

const events = (jobId: string): ListNovelJobEventsResponse => ({
	count: 3,
	items: [
		{
			kind: 'generation',
			jobId,
			emittedAt: '2025-10-07T10:25:00.000Z',
			event: generationEvents[0]
		},
		{
			kind: 'generation',
			jobId,
			emittedAt: '2025-10-07T10:33:00.000Z',
			event: generationEvents[1]
		},
		{
			kind: 'job-status',
			jobId,
			emittedAt: '2025-10-07T10:45:00.000Z',
			status: 'running',
			snapshot: {
				chaptersCompleted: progress.chaptersCompleted,
				totalChapters: progress.totalChapters
			}
		}
	]
});

const detail = (jobId: string): NovelJobDetailResponse => ({
	jobId,
	status: 'running',
	queue: PLACEHOLDER_QUEUE,
	payload,
	requestedAt: PLACEHOLDER_CREATED_AT,
	createdAt: PLACEHOLDER_CREATED_AT,
	updatedAt: PLACEHOLDER_UPDATED_AT,
	progress,
	summary,
	engine,
	outline,
	chapters,
	events: generationEvents,
	domainEvents,
	context: null,
	failures
});

const summaryResponse = (jobId: string): NovelJobSummaryResponse => ({
	jobId,
	status: 'running',
	queue: PLACEHOLDER_QUEUE,
	payload,
	requestedAt: PLACEHOLDER_CREATED_AT,
	createdAt: PLACEHOLDER_CREATED_AT,
	updatedAt: PLACEHOLDER_UPDATED_AT,
	progress,
	summary,
	engine
});

export const createJobsPlaceholder = (jobId: string = PLACEHOLDER_JOB_ID): ApiResult<ListNovelJobsResponse> => {
	const jobSummary = summaryResponse(jobId);
	return createApiResult({ items: [jobSummary], count: 1 }, 'placeholder');
};

export const createJobDetailPlaceholder = (
	jobId: string = PLACEHOLDER_JOB_ID
): ApiResult<NovelJobDetailResponse> => createApiResult(detail(jobId), 'placeholder');

export const createJobMetricsPlaceholder = (
	jobId: string = PLACEHOLDER_JOB_ID
): ApiResult<NovelJobMetricsResponse> => createApiResult(metrics(jobId), 'placeholder');

export const createJobMetadataPlaceholder = (
	jobId: string = PLACEHOLDER_JOB_ID
): ApiResult<NovelJobMetadataResponse> => createApiResult(metadata(jobId), 'placeholder');

export const createJobEventsPlaceholder = (
	jobId: string = PLACEHOLDER_JOB_ID
): ApiResult<ListNovelJobEventsResponse> => createApiResult(events(jobId), 'placeholder');
