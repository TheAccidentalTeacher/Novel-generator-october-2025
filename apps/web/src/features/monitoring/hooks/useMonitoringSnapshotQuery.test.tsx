import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

import type { MonitoringSnapshot } from '../api/monitoring-api';
import * as monitoringService from '../api/monitoring-service';
import { useMonitoringSnapshotQuery } from './useMonitoringSnapshotQuery';

import { createApiResult } from '@/lib/api-client';
import { createTestQueryClient } from '@/test/test-utils';

vi.mock('../api/monitoring-service');

type GetMonitoringSnapshotMock = MockedFunction<typeof monitoringService.getMonitoringSnapshot>;

const createSnapshot = (overrides: Partial<MonitoringSnapshot> = {}): MonitoringSnapshot => ({
	generatedAt: '2025-10-07T12:00:00.000Z',
	region: 'test-region',
	workerStatuses: [],
	queues: [],
	deployments: [],
	...overrides
});

describe('useMonitoringSnapshotQuery', () => {
	let getMonitoringSnapshotMock: GetMonitoringSnapshotMock;

	beforeEach(() => {
		getMonitoringSnapshotMock = vi.mocked(monitoringService.getMonitoringSnapshot);
		vi.clearAllMocks();
	});

	it('resolves monitoring snapshot data', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const snapshot = createSnapshot({ region: 'production' });
		getMonitoringSnapshotMock.mockResolvedValueOnce(createApiResult(snapshot, 'api'));

		const { result } = renderHook(() => useMonitoringSnapshotQuery(), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data?.data).toEqual(snapshot);
		expect(result.current.data?.source).toBe('api');
	});

	it('surfaces errors from the monitoring service', async () => {
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const error = new Error('telemetry down');
		getMonitoringSnapshotMock.mockRejectedValueOnce(error);

		const { result } = renderHook(() => useMonitoringSnapshotQuery(), { wrapper });

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBe(error);
	});
});
