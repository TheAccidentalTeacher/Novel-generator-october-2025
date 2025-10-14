import { describe, expect, it } from 'vitest';

import {
	createJobDetailPlaceholder,
	createJobEventsPlaceholder,
	createJobMetadataPlaceholder,
	createJobMetricsPlaceholder
} from './job-placeholders';

const PLACEHOLDER_JOB_ID = 'demo-novel-job';

describe('job placeholder factories', () => {
	it('marks every placeholder response with the placeholder source flag', () => {
		const detail = createJobDetailPlaceholder();
		const metrics = createJobMetricsPlaceholder();
		const metadata = createJobMetadataPlaceholder();
		const events = createJobEventsPlaceholder();

		expect(detail.source).toBe('placeholder');
		expect(metrics.source).toBe('placeholder');
		expect(metadata.source).toBe('placeholder');
		expect(events.source).toBe('placeholder');
	});

	it('exposes stable story bible characters and continuity alerts', () => {
		const metadata = createJobMetadataPlaceholder(PLACEHOLDER_JOB_ID);
		const { storyBible, continuityAlerts, aiDecisions } = metadata.data;

		expect(Object.keys(storyBible.characters)).toContain('maraDelos');
		expect(storyBible.themes).toContain('Trust vs. Autonomy');
		expect(continuityAlerts).toHaveLength(1);
		expect(aiDecisions[0]?.type).toBe('outline-branch-selection');
	});

	it('provides non-zero cost and token totals for the metrics snapshot', () => {
		const metrics = createJobMetricsPlaceholder(PLACEHOLDER_JOB_ID).data;

		expect(metrics.cost.totalUsd).toBeGreaterThan(0);
		expect(metrics.tokens.total).toBeGreaterThan(metrics.tokens.analysis);
		expect(metrics.latencyMs.total).toBeGreaterThan(metrics.latencyMs.analysis);
	});

	it('returns sorted event history for the placeholder job id', () => {
		const { data } = createJobEventsPlaceholder(PLACEHOLDER_JOB_ID);

		expect(data.count).toBe(data.items.length);
		expect(data.items[0]?.jobId).toBe(PLACEHOLDER_JOB_ID);
		const timestamps = data.items.map((item) => item.emittedAt);
		expect(timestamps).toEqual([...timestamps].sort());
	});
});
