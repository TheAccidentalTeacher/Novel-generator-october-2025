import { useQuery } from '@tanstack/react-query';

import { getMonitoringSnapshot } from '../api/monitoring-service';

import type { MonitoringSnapshot } from '@/features/monitoring/api/monitoring-api';
import type { ApiResult } from '@/lib/api-client';

const monitoringKeys = {
	snapshot: ['monitoring', 'snapshot'] as const
};

export const useMonitoringSnapshotQuery = () =>
	useQuery<ApiResult<MonitoringSnapshot>>({
		queryKey: monitoringKeys.snapshot,
		queryFn: () => getMonitoringSnapshot(),
		staleTime: 30_000
	});
