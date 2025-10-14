import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

import type { MonitoringSnapshot } from './monitoring-api';
import { fetchMonitoringSnapshot } from './monitoring-api';
import * as placeholders from './monitoring-placeholders';
import { getMonitoringSnapshot } from './monitoring-service';

import { createApiResult } from '@/lib/api-client';

vi.mock('./monitoring-api');

type FetchMonitoringSnapshotMock = MockedFunction<typeof fetchMonitoringSnapshot>;

const createSnapshot = (overrides: Partial<MonitoringSnapshot> = {}): MonitoringSnapshot => ({
	generatedAt: '2025-10-07T12:00:00.000Z',
	region: 'test-region',
	notes: 'test notes',
	workerStatuses: [],
	queues: [],
	deployments: [],
	...overrides
});

describe('getMonitoringSnapshot', () => {
	let fetchSnapshotMock: FetchMonitoringSnapshotMock;

	beforeEach(() => {
		fetchSnapshotMock = vi.mocked(fetchMonitoringSnapshot);
		vi.clearAllMocks();
	});

	it('returns API snapshot when the monitoring endpoint succeeds', async () => {
		const apiSnapshot = createSnapshot({ region: 'production' });
		fetchSnapshotMock.mockResolvedValueOnce(createApiResult(apiSnapshot, 'api'));

		const result = await getMonitoringSnapshot();

		expect(fetchSnapshotMock).toHaveBeenCalledTimes(1);
		expect(result).toEqual(createApiResult(apiSnapshot, 'api'));
	});

	it('falls back to the placeholder snapshot and logs the failure when the API throws', async () => {
		const placeholderResult = createApiResult(createSnapshot({ region: 'placeholder-region' }), 'placeholder');
		const placeholderSpy = vi
			.spyOn(placeholders, 'createMonitoringSnapshotPlaceholder')
			.mockReturnValueOnce(placeholderResult);
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		fetchSnapshotMock.mockRejectedValueOnce(new Error('network offline'));

		const result = await getMonitoringSnapshot();

		expect(fetchSnapshotMock).toHaveBeenCalledTimes(1);
		expect(placeholderSpy).toHaveBeenCalledTimes(1);
		expect(result).toEqual(placeholderResult);
		expect(consoleSpy).toHaveBeenCalledWith(
			'[monitoring] Failed to fetch monitoring snapshot',
			expect.any(Error)
		);

		consoleSpy.mockRestore();
	});
});
