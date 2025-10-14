import { renderHook } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import type {
	CreateGenerationJobRequest,
	CreateGenerationJobResponse
} from '@letswriteabook/shared-types';

import * as generationService from '../api/generation-service';
import { useCreateGenerationJobMutation } from './useCreateGenerationJobMutation';

import { jobsKeys } from '@/features/jobs/api/job-keys';
import { createApiResult, HttpError, type ApiResult } from '@/lib/api-client';
import { createTestQueryClient } from '@/test/test-utils';

vi.mock('../api/generation-service');

type CreateGenerationJobMock = MockedFunction<typeof generationService.createGenerationJob>;

const createRequest = (overrides: Partial<CreateGenerationJobRequest> = {}): CreateGenerationJobRequest => ({
	title: 'Voyage of the Aurora',
	premise: 'A linguist decodes an alien language that rewrites the crew\'s memories.',
	genre: 'science-fiction',
	subgenre: 'First contact',
	targetWordCount: 90_000,
	targetChapters: 22,
	humanLikeWriting: true,
	...overrides
});

const createResponse = (
	overrides: Partial<CreateGenerationJobResponse> = {}
): ApiResult<CreateGenerationJobResponse> =>
	createApiResult({
		jobId: 'job-123',
		status: 'queued',
		queue: 'novel-generation',
		createdAt: '2025-10-07T12:00:00.000Z',
		...overrides
	});

describe('useCreateGenerationJobMutation', () => {
	let createGenerationJobMock: CreateGenerationJobMock;

	beforeEach(() => {
		createGenerationJobMock = vi.mocked(generationService.createGenerationJob);
		vi.clearAllMocks();
	});

	it('submits the job and returns the service result', async () => {
		const queryClient = createTestQueryClient();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
		const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const request = createRequest();
		const apiResult = createResponse();
		createGenerationJobMock.mockResolvedValueOnce(apiResult);

		const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

		await expect(result.current.mutateAsync(request)).resolves.toEqual(apiResult);

		expect(createGenerationJobMock).toHaveBeenCalledWith(request);
		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: jobsKeys.list() });
	});

	it('propagates errors from the generation service', async () => {
		const queryClient = createTestQueryClient();
		const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
		const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		const request = createRequest();
		const error = new Error('service unavailable');
		createGenerationJobMock.mockRejectedValueOnce(error);

		const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

		await expect(result.current.mutateAsync(request)).rejects.toBe(error);

		expect(invalidateSpy).not.toHaveBeenCalled();
	});

	it('maps HTTP 400 errors to friendly copy', async () => {
	const queryClient = createTestQueryClient();
	const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const request = createRequest();
	const httpError = new HttpError(400, 'Bad Request', { code: 'VALIDATION_ERROR' });
	createGenerationJobMock.mockRejectedValueOnce(httpError);

	const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

	await expect(result.current.mutateAsync(request)).rejects.toThrow(
		/couldn't process that request/i
	);
});

	it('maps HTTP 413 errors to friendly copy', async () => {
	const queryClient = createTestQueryClient();
	const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const request = createRequest();
	const httpError = new HttpError(413, 'Payload Too Large');
	createGenerationJobMock.mockRejectedValueOnce(httpError);

	const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

	await expect(result.current.mutateAsync(request)).rejects.toThrow(
		/too large to process/i
	);
});

	it('maps HTTP 429 errors to friendly copy', async () => {
	const queryClient = createTestQueryClient();
	const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const request = createRequest();
	const httpError = new HttpError(429, 'Too Many Requests');
	createGenerationJobMock.mockRejectedValueOnce(httpError);

	const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

	await expect(result.current.mutateAsync(request)).rejects.toThrow(
		/too many requests/i
	);
});

	it('maps other HTTP errors to generic friendly copy', async () => {
	const queryClient = createTestQueryClient();
	const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const request = createRequest();
	const httpError = new HttpError(500, 'Internal Server Error');
	createGenerationJobMock.mockRejectedValueOnce(httpError);

	const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

	await expect(result.current.mutateAsync(request)).rejects.toThrow(
		/server returned an error/i
	);
});

	it('leaves non-HTTP errors unchanged', async () => {
	const queryClient = createTestQueryClient();
	const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	const request = createRequest();
	const err = new Error('socket hang up');
	createGenerationJobMock.mockRejectedValueOnce(err);

	const { result } = renderHook(() => useCreateGenerationJobMutation(), { wrapper });

	await expect(result.current.mutateAsync(request)).rejects.toBe(err);
});
});
