import type { MonitoringSnapshot } from './monitoring-api';

import { createApiResult, type ApiResult } from '@/lib/api-client';

const now = () => new Date().toISOString();

const placeholderSnapshot: MonitoringSnapshot = {
	generatedAt: now(),
	region: 'railway-us-east-1',
	notes:
		'Live telemetry is not connected yet. Values below are simulated to demonstrate layout and thresholds.',
	workerStatuses: [
		{
			name: 'api-gateway',
			status: 'online',
			concurrency: 25,
			activeJobs: 4,
			lastHeartbeat: now()
		},
		{
			name: 'novel-worker-1',
			status: 'degraded',
			concurrency: 5,
			activeJobs: 5,
			lastHeartbeat: now()
		},
		{
			name: 'novel-worker-2',
			status: 'offline',
			concurrency: 5,
			activeJobs: 0,
			lastHeartbeat: new Date(Date.now() - 1000 * 60 * 18).toISOString()
		}
	],
	queues: [
		{
			name: 'novel-generation',
			depth: 12,
			delayed: 2,
			waiting: 10,
			failed: 1,
			updatedAt: now()
		},
		{
			name: 'post-processing',
			depth: 3,
			delayed: 0,
			waiting: 3,
			failed: 0,
			updatedAt: now()
		}
	],
	deployments: [
		{
			service: 'api',
			version: '2025.10.07.1',
			commit: '8ab12cd',
			deployedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
		},
		{
			service: 'worker',
			version: '2025.10.06.3',
			commit: '54e67ff',
			deployedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
		}
	]
};

export const createMonitoringSnapshotPlaceholder = (): ApiResult<MonitoringSnapshot> =>
	createApiResult(placeholderSnapshot, 'placeholder');
