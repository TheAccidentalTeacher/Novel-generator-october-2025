import { useQuery } from '@tanstack/react-query';
import type { NovelJobDetailResponse } from '@letswriteabook/shared-types';

import { jobsKeys } from '../api/job-keys';
import { getJobDetail } from '../api/job-service';

import type { ApiResult } from '@/lib/api-client';

export const useJobDetailQuery = (jobId?: string) =>
	useQuery<ApiResult<NovelJobDetailResponse>>({
		queryKey: jobId ? jobsKeys.detail(jobId) : [...jobsKeys.all, 'detail', 'missing'],
		queryFn: () => getJobDetail(jobId!),
		enabled: Boolean(jobId),
		staleTime: 15_000
	});
