import { createApiResult, getJson, type ApiResult } from '@/lib/api-client';

export type WorkerStatus = {
	readonly name: string;
	readonly status: 'online' | 'offline' | 'degraded';
	readonly concurrency: number;
	readonly activeJobs: number;
	readonly lastHeartbeat: string;
};

export type QueueGauge = {
	readonly name: string;
	readonly depth: number;
	readonly delayed: number;
	readonly waiting: number;
	readonly failed: number;
	readonly updatedAt: string;
};

export type DeploymentRecord = {
	readonly service: string;
	readonly version: string;
	readonly commit: string;
	readonly deployedAt: string;
};

export type MonitoringSnapshot = {
	readonly generatedAt: string;
	readonly region: string;
	readonly notes?: string;
	readonly workerStatuses: ReadonlyArray<WorkerStatus>;
	readonly queues: ReadonlyArray<QueueGauge>;
	readonly deployments: ReadonlyArray<DeploymentRecord>;
};

const MONITORING_SNAPSHOT_PATH = '/api/monitoring/snapshot';

export const fetchMonitoringSnapshot = async (): Promise<ApiResult<MonitoringSnapshot>> => {
	const response = await getJson<MonitoringSnapshot>(MONITORING_SNAPSHOT_PATH);
	return createApiResult(response, 'api');
};
