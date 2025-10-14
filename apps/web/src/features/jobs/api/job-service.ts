import {
	fetchJobDetail,
	fetchJobEvents,
	fetchJobMetadata,
	fetchJobMetrics,
	fetchJobs
} from './job-api';
import {
	createJobDetailPlaceholder,
	createJobEventsPlaceholder,
	createJobMetadataPlaceholder,
	createJobMetricsPlaceholder,
	createJobsPlaceholder
} from './job-placeholders';

import { isHttpError, type ApiResult } from '@/lib/api-client';

const logApiFailure = (scope: string, error: unknown) => {
	const baseMessage = `[jobs] Failed to fetch ${scope}`;
	if (isHttpError(error)) {
		console.warn(`${baseMessage}: HTTP ${error.status}`, error.body ?? error);
	} else {
		console.warn(baseMessage, error);
	}
};

const withPlaceholder = async <T>(
	operation: () => Promise<ApiResult<T>>,
	placeholder: ApiResult<T>,
	options?: { readonly scope: string; readonly rethrowStatuses?: ReadonlyArray<number> }
): Promise<ApiResult<T>> => {
	try {
		return await operation();
	} catch (error) {
		if (isHttpError(error) && options?.rethrowStatuses?.includes(error.status)) {
			throw error;
		}

		logApiFailure(options?.scope ?? 'resource', error);
		return placeholder;
	}
};

export const getJobs = async () =>
	withPlaceholder(() => fetchJobs(), createJobsPlaceholder(), {
		scope: 'job list'
	});

export const getJobDetail = async (jobId: string) =>
	withPlaceholder(
		() => fetchJobDetail(jobId),
		createJobDetailPlaceholder(jobId),
		{ scope: `job detail (${jobId})`, rethrowStatuses: [404] }
	);

export const getJobMetrics = async (jobId: string) =>
	withPlaceholder(() => fetchJobMetrics(jobId), createJobMetricsPlaceholder(jobId), {
		scope: `job metrics (${jobId})`
	});

export const getJobMetadata = async (jobId: string) =>
	withPlaceholder(() => fetchJobMetadata(jobId), createJobMetadataPlaceholder(jobId), {
		scope: `job metadata (${jobId})`
	});

export const getJobEvents = async (
	jobId: string,
	options?: { readonly limit?: number; readonly before?: string }
) =>
	withPlaceholder(
		() => fetchJobEvents(jobId, options),
		createJobEventsPlaceholder(jobId),
		{ scope: `job events (${jobId})` }
	);
