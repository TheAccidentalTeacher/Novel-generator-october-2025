import { useQuery } from '@tanstack/react-query';
import type { ListNovelJobsResponse } from '@letswriteabook/shared-types';

import { jobsKeys } from '../api/job-keys';
import { getJobs } from '../api/job-service';

import type { ApiResult } from '@/lib/api-client';

export const useJobsQuery = () =>
	useQuery<ApiResult<ListNovelJobsResponse>>({
		queryKey: jobsKeys.list(),
		queryFn: () => getJobs(),
		staleTime: 30_000
	});
