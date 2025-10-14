import { useQuery } from '@tanstack/react-query';
import type { NovelJobMetricsResponse } from '@letswriteabook/shared-types';

import { jobsKeys } from '../api/job-keys';
import { getJobMetrics } from '../api/job-service';

import type { ApiResult } from '@/lib/api-client';

export const useJobMetricsQuery = (jobId?: string) =>
	useQuery<ApiResult<NovelJobMetricsResponse>>({
		queryKey: jobId ? jobsKeys.metrics(jobId) : [...jobsKeys.all, 'metrics', 'missing'],
		queryFn: () => getJobMetrics(jobId!),
		enabled: Boolean(jobId),
		staleTime: 15_000
	});
