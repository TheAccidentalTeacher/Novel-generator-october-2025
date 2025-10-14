import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

import type { MonitoringSnapshot } from '../api/monitoring-api';
import * as monitoringService from '../api/monitoring-service';
import { MonitoringPage } from './MonitoringPage';

import { createApiResult, type ApiResult } from '@/lib/api-client';
import { renderWithQueryClient } from '@/test/test-utils';

vi.mock('../api/monitoring-service');

type GetMonitoringSnapshotMock = MockedFunction<typeof monitoringService.getMonitoringSnapshot>;

const createSnapshot = (overrides: Partial<MonitoringSnapshot> = {}): MonitoringSnapshot => ({
	generatedAt: '2025-10-07T12:00:00.000Z',
	region: 'demo-region',
	notes: 'The API is not wired up yet, showing placeholders.',
	workerStatuses: [
		{
			name: 'api-gateway',
			status: 'online',
			concurrency: 10,
			activeJobs: 5,
			lastHeartbeat: '2025-10-07T11:59:00.000Z'
		}
	],
	queues: [
		{
			name: 'novel-generation',
			depth: 5,
			delayed: 1,
			waiting: 4,
			failed: 0,
			updatedAt: '2025-10-07T11:58:00.000Z'
		}
	],
	deployments: [
		{
			service: 'api',
			version: '2025.10.07.1',
			commit: 'abc123',
			deployedAt: '2025-10-07T11:30:00.000Z'
		}
	],
	...overrides
});

describe('MonitoringPage', () => {
	let getMonitoringSnapshotMock: GetMonitoringSnapshotMock;

	beforeEach(() => {
		getMonitoringSnapshotMock = vi.mocked(monitoringService.getMonitoringSnapshot);
		vi.clearAllMocks();
	});

	it('renders a loading skeleton while the telemetry snapshot resolves', async () => {
		let resolveSnapshot!: (value: ApiResult<MonitoringSnapshot>) => void;
		const deferred = new Promise<ApiResult<MonitoringSnapshot>>((resolve) => {
			resolveSnapshot = resolve;
		});
		getMonitoringSnapshotMock.mockReturnValueOnce(deferred);

		renderWithQueryClient(<MonitoringPage />);

		expect(screen.getByText(/Loading telemetry/i)).toBeInTheDocument();

		resolveSnapshot(createApiResult(createSnapshot(), 'placeholder'));

		await waitFor(() => expect(screen.getByText(/Worker health/i)).toBeInTheDocument());
	});

	it('displays the placeholder notice and snapshot content when placeholder data is returned', async () => {
		const placeholderSnapshot = createSnapshot();
		getMonitoringSnapshotMock.mockResolvedValueOnce(createApiResult(placeholderSnapshot, 'placeholder'));

		renderWithQueryClient(<MonitoringPage />);

		expect(await screen.findByText(/Using placeholder telemetry/i)).toBeInTheDocument();
		expect(screen.getByText(/Platform monitoring/i)).toBeInTheDocument();
		expect(screen.getByText(/Worker health/i)).toBeInTheDocument();
		expect(screen.getByText(/novel-generation/i)).toBeInTheDocument();
	});

	it('surfaces an error pill when the monitoring service rejects', async () => {
		const error = new Error('monitoring endpoint unavailable');
		getMonitoringSnapshotMock.mockRejectedValueOnce(error);

		renderWithQueryClient(<MonitoringPage />);

		expect(await screen.findByText(error.message)).toBeInTheDocument();
	});

	it('refetches telemetry when the query is invalidated', async () => {
		getMonitoringSnapshotMock.mockResolvedValueOnce(createApiResult(createSnapshot(), 'api'));
		const { queryClient } = renderWithQueryClient(<MonitoringPage />);

		await screen.findByText(/Worker health/i);

		getMonitoringSnapshotMock.mockResolvedValueOnce(
			createApiResult(createSnapshot({ region: 'eu-west-1' }), 'api')
		);

		await queryClient.invalidateQueries({ queryKey: ['monitoring', 'snapshot'] });

		await waitFor(() => expect(getMonitoringSnapshotMock).toHaveBeenCalledTimes(2));
	});
});
