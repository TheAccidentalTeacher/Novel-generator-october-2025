import type {
	CreateGenerationJobRequest,
	CreateGenerationJobResponse
} from '@letswriteabook/shared-types';

import { createApiResult, postJson, type ApiResult } from '@/lib/api-client';

const GENERATION_REQUEST_PATH = '/api/jobs';

export const submitGenerationRequest = async (
	payload: CreateGenerationJobRequest
): Promise<ApiResult<CreateGenerationJobResponse>> => {
	const response = await postJson<CreateGenerationJobRequest, CreateGenerationJobResponse>(
		GENERATION_REQUEST_PATH,
		payload
	);

	return createApiResult(response, 'api');
};
