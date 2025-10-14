import type {
	CreateGenerationJobRequest,
	CreateGenerationJobResponse
} from '@letswriteabook/shared-types';

import { createApiResult, type ApiResult } from '@/lib/api-client';

const createJobId = () =>
	(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `job-${Date.now()}`) as string;

export const createGenerationRequestPlaceholder = (
	payload: CreateGenerationJobRequest
): ApiResult<CreateGenerationJobResponse> => {
	void payload;
	const jobId = createJobId();

	return createApiResult(
		{
			jobId,
			status: 'queued',
			queue: 'novel-generation',
			createdAt: new Date().toISOString(),
			placeholder: true
		},
		'placeholder'
	);
};
