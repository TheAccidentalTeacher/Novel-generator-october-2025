import type {
	ListNovelJobEventsResponse,
	ListNovelJobsResponse,
	NovelJobDetailResponse,
	NovelJobMetadataResponse,
	NovelJobMetricsResponse
} from '@letswriteabook/shared-types';

import { createApiResult, getJson, type ApiResult } from '@/lib/api-client';

const JOBS_BASE_PATH = '/api/novel';

const buildJobPath = (jobId: string, suffix = ''): string => `${JOBS_BASE_PATH}/${encodeURIComponent(jobId)}${suffix}`;

export const fetchJobs = async (): Promise<ApiResult<ListNovelJobsResponse>> => {
	const response = await getJson<ListNovelJobsResponse>(JOBS_BASE_PATH);
	return createApiResult(response, 'api');
};

export const fetchJobDetail = async (jobId: string): Promise<ApiResult<NovelJobDetailResponse>> => {
	const response = await getJson<NovelJobDetailResponse>(buildJobPath(jobId));
	return createApiResult(response, 'api');
};

export const fetchJobMetrics = async (jobId: string): Promise<ApiResult<NovelJobMetricsResponse>> => {
	const response = await getJson<NovelJobMetricsResponse>(buildJobPath(jobId, '/metrics'));
	return createApiResult(response, 'api');
};

export const fetchJobMetadata = async (jobId: string): Promise<ApiResult<NovelJobMetadataResponse>> => {
	const response = await getJson<NovelJobMetadataResponse>(buildJobPath(jobId, '/metadata'));
	return createApiResult(response, 'api');
};

export const fetchJobEvents = async (
	jobId: string,
	options?: { readonly limit?: number; readonly before?: string }
): Promise<ApiResult<ListNovelJobEventsResponse>> => {
	const params = new URLSearchParams();
	if (typeof options?.limit === 'number') {
		params.set('limit', String(options.limit));
	}
	if (options?.before) {
		params.set('before', options.before);
	}

	const suffix = params.toString() ? `/events?${params.toString()}` : '/events';
	const response = await getJson<ListNovelJobEventsResponse>(buildJobPath(jobId, suffix));
	return createApiResult(response, 'api');
};
