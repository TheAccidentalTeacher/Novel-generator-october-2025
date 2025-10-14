import { useQuery } from '@tanstack/react-query';
import type { NovelJobMetadataResponse } from '@letswriteabook/shared-types';

import { jobsKeys } from '../api/job-keys';
import { getJobMetadata } from '../api/job-service';

import type { ApiResult } from '@/lib/api-client';

export const useJobMetadataQuery = (jobId?: string) =>
	useQuery<ApiResult<NovelJobMetadataResponse>>({
		queryKey: jobId ? jobsKeys.metadata(jobId) : [...jobsKeys.all, 'metadata', 'missing'],
		queryFn: () => getJobMetadata(jobId!),
		enabled: Boolean(jobId),
		staleTime: 30_000
	});
