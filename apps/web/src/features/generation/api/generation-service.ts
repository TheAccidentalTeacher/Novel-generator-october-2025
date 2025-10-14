import type {
	CreateGenerationJobRequest,
	CreateGenerationJobResponse
} from '@letswriteabook/shared-types';

import { submitGenerationRequest } from './generation-api';
import { createGenerationRequestPlaceholder } from './generation-placeholders';

import type { ApiResult } from '@/lib/api-client';
import { isHttpError } from '@/lib/api-client';

const logGenerationFailure = (error: unknown) => {
	if (isHttpError(error)) {
		console.warn('[generation] Failed to submit job: HTTP %s', error.status, error.body ?? error);
	} else {
		console.warn('[generation] Failed to submit job', error);
	}
};

export const createGenerationJob = async (
	payload: CreateGenerationJobRequest
): Promise<ApiResult<CreateGenerationJobResponse>> => {
	try {
		return await submitGenerationRequest(payload);
	} catch (error) {
		logGenerationFailure(error);
		return createGenerationRequestPlaceholder(payload);
	}
};
