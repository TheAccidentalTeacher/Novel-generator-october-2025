import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ListNovelJobsResponse, NovelJobSummaryResponse } from '@letswriteabook/shared-types';

import { JobListPage } from './JobListPage';
import { createApiResult } from '@/lib/api-client';
import { useJobsQuery } from '@/features/jobs/hooks/useJobsQuery';

vi.mock('@/features/jobs/hooks/useJobsQuery', () => ({
	useJobsQuery: vi.fn()
}));

const mockUseJobsQuery = vi.mocked(useJobsQuery);

describe('JobListPage', () => {
	beforeEach(() => {
		mockUseJobsQuery.mockReset();
	});

	it('renders loading state while jobs are fetching', () => {
		mockUseJobsQuery.mockReturnValue(
			{
				data: undefined,
				isLoading: true,
				isError: false,
				error: null
			} as ReturnType<typeof useJobsQuery>
		);

		renderWithRouter(<JobListPage />);

		expect(screen.getByText(/loading jobs/i)).toBeInTheDocument();
	});

	it('shows placeholder notice and renders jobs sorted by most recent activity', () => {
		const jobs = createJobsResponse([
			createJob({
				jobId: 'job-1',
				updatedAt: '2025-10-07T10:15:00.000Z',
				status: 'running',
				payload: {
					...basePayload,
					title: 'The Silent Orbit'
				},
				progress: {
					outlineComplete: false,
					chaptersCompleted: 2,
					chaptersFailed: 0,
					totalChapters: 12,
					hasFailures: false
				}
			}),
			createJob({
				jobId: 'job-2',
				updatedAt: '2025-10-07T11:45:00.000Z',
				status: 'completed',
				summary: {
					chaptersGenerated: 12,
					totalChaptersPlanned: 12,
					totalWordCount: 95_000
				},
				payload: {
					...basePayload,
					title: 'Nebula Wake'
				}
			})
		]);

		mockUseJobsQuery.mockReturnValue(
			{
				data: createApiResult(jobs, 'placeholder'),
				isLoading: false,
				isError: false,
				error: null
			} as ReturnType<typeof useJobsQuery>
		);

		renderWithRouter(<JobListPage />);

		expect(screen.getByText(/using placeholder data/i)).toBeInTheDocument();

		const jobEntries = screen.getAllByRole('listitem');
		expect(jobEntries[0]).toHaveTextContent('Nebula Wake');
		expect(jobEntries[1]).toHaveTextContent('The Silent Orbit');

		const links = screen.getAllByRole('link', { name: /view timeline/i });
		expect(links[0]).toHaveAttribute('href', '/jobs/job-2');
	});

	it('renders empty state when the list is empty', () => {
		mockUseJobsQuery.mockReturnValue(
			{
				data: createApiResult(createJobsResponse([]), 'api'),
				isLoading: false,
				isError: false,
				error: null
			} as ReturnType<typeof useJobsQuery>
		);

		renderWithRouter(<JobListPage />);

		expect(
			screen.getByText(/no jobs found yet\. trigger a generation run to populate this list\./i)
		).toBeInTheDocument();
	});

	it('surfaces error messages when the request fails', () => {
		const error = new Error('Network unreachable');

		mockUseJobsQuery.mockReturnValue(
			{
				data: undefined,
				isLoading: false,
				isError: true,
				error
			} as ReturnType<typeof useJobsQuery>
		);

		renderWithRouter(<JobListPage />);

		expect(screen.getByText('Network unreachable')).toBeInTheDocument();
	});
});

const renderWithRouter = (ui: JSX.Element) =>
	render(<MemoryRouter>{ui}</MemoryRouter>);

const basePayload: NovelJobSummaryResponse['payload'] = {
	title: 'Untitled Novel',
	premise: 'An example payload used for UI state tests.',
	genre: 'science-fiction',
	subgenre: 'Space opera',
	targetWordCount: 90_000,
	targetChapters: 18,
	humanLikeWriting: true
};

const createJob = (overrides: Partial<NovelJobSummaryResponse>): NovelJobSummaryResponse => ({
	jobId: 'job-0',
	status: 'queued',
	queue: 'default',
	payload: basePayload,
	requestedAt: '2025-10-07T09:00:00.000Z',
	createdAt: '2025-10-07T09:00:00.000Z',
	updatedAt: '2025-10-07T09:00:00.000Z',
	progress: null,
	summary: null,
	engine: null,
	...overrides
});

const createJobsResponse = (
	items: ReadonlyArray<NovelJobSummaryResponse>
): ListNovelJobsResponse => ({
	items,
	count: items.length
});
