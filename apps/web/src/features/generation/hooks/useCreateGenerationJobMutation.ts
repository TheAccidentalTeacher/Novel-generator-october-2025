import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	CreateGenerationJobRequest,
	CreateGenerationJobResponse
} from '@letswriteabook/shared-types';

import { generationKeys } from '../api/generation-keys';
import { createGenerationJob } from '../api/generation-service';

import { jobsKeys } from '@/features/jobs/api/job-keys';
import type { ApiResult } from '@/lib/api-client';
import { isHttpError } from '@/lib/api-client';

const mapSubmissionErrorToUserMessage = (error: unknown): Error => {
	if (isHttpError(error)) {
		switch (error.status) {
			case 400:
				return new Error('We couldn\'t process that request. Try lowering the target word count or chapters and check for missing required fields.', { cause: error });
			case 413:
				return new Error('Your request is too large to process. Reduce the target word count or split into fewer words per chapter.', { cause: error });
			case 429:
				return new Error('We\'re receiving too many requests right now. Please wait a moment and try again.', { cause: error });
			default:
				// For other HTTP errors, keep the original but wrap with a readable fallback.
				return new Error('The server returned an error. Please try again shortly.', { cause: error });
		}
	}
	// Non-HTTP errors: propagate as-is
	return error instanceof Error ? error : new Error('Unexpected error submitting request.');
};

export const useCreateGenerationJobMutation = () => {
	const queryClient = useQueryClient();

	return useMutation<ApiResult<CreateGenerationJobResponse>, unknown, CreateGenerationJobRequest>({
		mutationKey: generationKeys.create(),
		mutationFn: async (payload) => {
			try {
				return await createGenerationJob(payload);
			} catch (error) {
				throw mapSubmissionErrorToUserMessage(error);
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: jobsKeys.list() });
		}
	});
};
