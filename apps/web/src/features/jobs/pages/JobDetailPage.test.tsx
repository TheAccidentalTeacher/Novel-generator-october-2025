import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	NovelJobDetailResponse,
	NovelJobMetadataResponse,
	NovelJobMetricsResponse,
	NovelJobSummaryResponse
} from '@letswriteabook/shared-types';

import { JobDetailPage } from './JobDetailPage';
import { createApiResult } from '@/lib/api-client';
import { useJobDetailQuery } from '@/features/jobs/hooks/useJobDetailQuery';
import { useJobMetadataQuery } from '@/features/jobs/hooks/useJobMetadataQuery';
import { useJobMetricsQuery } from '@/features/jobs/hooks/useJobMetricsQuery';
import { useRealtimeJobEvents } from '@/features/jobs/hooks/useRealtimeJobEvents';

vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
	return {
		...actual,
		useParams: vi.fn()
	};
});

vi.mock('@/features/jobs/hooks/useJobDetailQuery', () => ({
  useJobDetailQuery: vi.fn()
}));

vi.mock('@/features/jobs/hooks/useJobMetricsQuery', () => ({
  useJobMetricsQuery: vi.fn()
}));

vi.mock('@/features/jobs/hooks/useJobMetadataQuery', () => ({
  useJobMetadataQuery: vi.fn()
}));

vi.mock('@/features/jobs/hooks/useRealtimeJobEvents', () => ({
  useRealtimeJobEvents: vi.fn()
}));

import { useParams } from 'react-router-dom';

const mockUseParams = vi.mocked(useParams);
const mockUseJobDetailQuery = vi.mocked(useJobDetailQuery);
const mockUseJobMetricsQuery = vi.mocked(useJobMetricsQuery);
const mockUseJobMetadataQuery = vi.mocked(useJobMetadataQuery);
const mockUseRealtimeJobEvents = vi.mocked(useRealtimeJobEvents);

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts to select a job when no jobId is provided', () => {
  mockUseParams.mockReturnValue({});
  mockUseJobDetailQuery.mockReturnValue(buildDetailQueryState());
  mockUseJobMetricsQuery.mockReturnValue(buildMetricsQueryState());
  mockUseJobMetadataQuery.mockReturnValue(buildMetadataQueryState());
  mockUseRealtimeJobEvents.mockReturnValue(buildRealtimeState());

    render(<JobDetailPage />);

    expect(screen.getByText(/select a job from the dashboard/i)).toBeInTheDocument();
  });

  it('renders job detail, metrics, metadata and realtime events with placeholder notice', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-123' });

    const jobDetail = createJobDetail({
      jobId: 'job-123',
      payload: {
        ...createJobSummary().payload,
        title: 'Nebula Wake'
      },
      status: 'running',
      queue: 'priority',
      progress: {
        outlineComplete: true,
        chaptersCompleted: 5,
        chaptersFailed: 0,
        totalChapters: 12,
        hasFailures: false
      }
    });

    const metrics = createJobMetrics({
      cost: { totalUsd: 25.5, analysisUsd: 5, outlineUsd: 3, chaptersUsd: 17.5 },
      tokens: { total: 120_000, analysis: 20_000, outline: 15_000, chapters: 85_000 }
    });

    const metadata = createJobMetadata({
      storyBible: {
        themes: ['Perseverance'],
        characters: {
          protagonist: { name: 'Lyra Chen', summary: 'Botanist-turned-diplomat' }
        }
      }
    });

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({
        data: createApiResult(jobDetail, 'placeholder')
      })
    );
    mockUseJobMetricsQuery.mockReturnValue(
      buildMetricsQueryState({
        data: createApiResult(metrics, 'placeholder')
      })
    );
    mockUseJobMetadataQuery.mockReturnValue(
      buildMetadataQueryState({
        data: createApiResult(metadata, 'placeholder')
      })
    );

    mockUseRealtimeJobEvents.mockReturnValue({
      status: 'connected',
      events: [
        {
          id: 'evt-1',
          type: 'job.completed-outline',
          timestamp: '2025-10-07T10:00:00.000Z',
          payload: { chapters: 12 }
        }
      ],
      error: 'Gateway unavailable'
    });

    render(<JobDetailPage />);

    expect(screen.getByText(/using placeholder data/i)).toBeInTheDocument();
    expect(screen.getByText('Nebula Wake')).toBeInTheDocument();
    expect(screen.getByText(/queue: priority/i)).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('5 / 12')).toBeInTheDocument();
    expect(screen.getByText('$25.50')).toBeInTheDocument();
    expect(screen.getByText(/lyra chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Realtime: connected/i)).toBeInTheDocument();
    expect(screen.getByText(/Gateway unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/job.completed-outline/i)).toBeInTheDocument();
  });

  it('shows empty realtime state and story bible fallback when metadata lacks highlights', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-456' });

    const jobDetail = createJobDetail({
      jobId: 'job-456',
      payload: {
        ...createJobSummary().payload,
        title: 'Silent Orbit'
      },
      progress: null
    });

    const metrics = createJobMetrics({
      cost: { totalUsd: 1.25 }
    });

    const metadata = createJobMetadata({
      storyBible: {
        themes: [],
        characters: {}
      }
    });

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({
        data: createApiResult(jobDetail)
      })
    );
    mockUseJobMetricsQuery.mockReturnValue(
      buildMetricsQueryState({
        data: createApiResult(metrics)
      })
    );
    mockUseJobMetadataQuery.mockReturnValue(
      buildMetadataQueryState({
        data: createApiResult(metadata)
      })
    );
    mockUseRealtimeJobEvents.mockReturnValue(buildRealtimeState());

    render(<JobDetailPage />);

    expect(screen.getByText('Silent Orbit')).toBeInTheDocument();
    expect(screen.getByText(/No events received yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Not captured yet\./i)).toBeInTheDocument();
    expect(screen.getByText(/No characters documented yet\./i)).toBeInTheDocument();
  });

  it('surfaces realtime errors and applies danger tone for failed jobs', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-789' });

    const jobDetail = createJobDetail({
      jobId: 'job-789',
      status: 'failed',
      queue: 'priority'
    });
    const metrics = createJobMetrics();
    const metadata = createJobMetadata();

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({
        data: createApiResult(jobDetail)
      })
    );
    mockUseJobMetricsQuery.mockReturnValue(
      buildMetricsQueryState({
        data: createApiResult(metrics)
      })
    );
    mockUseJobMetadataQuery.mockReturnValue(
      buildMetadataQueryState({
        data: createApiResult(metadata)
      })
    );
    mockUseRealtimeJobEvents.mockReturnValue(
      buildRealtimeState({
        status: 'error',
        error: 'Socket offline',
        events: []
      })
    );

    render(<JobDetailPage />);

    const statusBadge = screen.getByText(/failed/i).parentElement;
    expect(statusBadge).not.toBeNull();
    expect(statusBadge).toHaveClass('bg-[var(--badge-danger-bg)]');
    expect(screen.getByText(/Realtime: error/i)).toBeInTheDocument();
    expect(screen.getByText(/Socket offline/i)).toBeInTheDocument();
  });

  it('recovers from realtime errors and replays buffered events on reconnect', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-321' });

    const jobDetail = createJobDetail({
      jobId: 'job-321',
      status: 'running',
      queue: 'priority',
      payload: {
        ...createJobSummary().payload,
        title: 'Reconnected Novel'
      }
    });
    const metrics = createJobMetrics();
    const metadata = createJobMetadata();

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({
        data: createApiResult(jobDetail)
      })
    );
    mockUseJobMetricsQuery.mockReturnValue(
      buildMetricsQueryState({
        data: createApiResult(metrics)
      })
    );
    mockUseJobMetadataQuery.mockReturnValue(
      buildMetadataQueryState({
        data: createApiResult(metadata)
      })
    );

    mockUseRealtimeJobEvents
      .mockReturnValueOnce(
        buildRealtimeState({
          status: 'error',
          error: 'Socket offline',
          events: []
        })
      )
      .mockReturnValue(
        buildRealtimeState({
          status: 'connected',
          events: [
            {
              id: 'evt-2',
              type: 'job.progress',
              timestamp: '2025-10-08T09:00:00.000Z',
              payload: { message: 'Recovered and streaming' }
            }
          ]
        })
      );

    const { rerender } = render(<JobDetailPage />);

    expect(screen.getByText(/Realtime: error/i)).toBeInTheDocument();
    expect(screen.getByText(/Socket offline/i)).toBeInTheDocument();

    rerender(<JobDetailPage />);

    expect(screen.getByText(/Realtime: connected/i)).toBeInTheDocument();
    expect(screen.queryByText(/Socket offline/i)).not.toBeInTheDocument();
    expect(screen.getByText('job.progress')).toBeInTheDocument();

    const statusBadge = screen.getByText(/running/i).parentElement;
    expect(statusBadge).not.toBeNull();
    expect(statusBadge).toHaveClass('bg-[var(--badge-info-bg)]');
  });

  it('shows loading placeholders while queries resolve', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-loading' });

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({ isLoading: true, status: 'pending', fetchStatus: 'fetching' })
    );
    mockUseJobMetricsQuery.mockReturnValue(
      buildMetricsQueryState({ isLoading: true, status: 'pending', fetchStatus: 'fetching' })
    );
    mockUseJobMetadataQuery.mockReturnValue(
      buildMetadataQueryState({ isLoading: true, status: 'pending', fetchStatus: 'fetching' })
    );
    mockUseRealtimeJobEvents.mockReturnValue(buildRealtimeState({ status: 'connecting' }));

    render(<JobDetailPage />);

    expect(screen.getByText(/loading progress/i)).toBeInTheDocument();
    expect(screen.getByText(/loading cost metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/loading story bible/i)).toBeInTheDocument();
  });

  it('renders error status when detail query fails', () => {
    mockUseParams.mockReturnValue({ jobId: 'job-error' });

    mockUseJobDetailQuery.mockReturnValue(
      buildDetailQueryState({
        isError: true,
        error: new Error('Unable to reach API')
      })
    );
    mockUseJobMetricsQuery.mockReturnValue(buildMetricsQueryState());
    mockUseJobMetadataQuery.mockReturnValue(buildMetadataQueryState());
    mockUseRealtimeJobEvents.mockReturnValue(buildRealtimeState());

    render(<JobDetailPage />);

    expect(screen.getByText(/unable to reach api/i)).toBeInTheDocument();
  });
});

const buildDetailQueryState = (
  overrides: Partial<ReturnType<typeof useJobDetailQuery>> = {}
): ReturnType<typeof useJobDetailQuery> => ({
  data: undefined,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: Boolean(overrides.data),
  status: overrides.status ?? 'success',
  fetchStatus: overrides.fetchStatus ?? 'idle',
  ...overrides
} as ReturnType<typeof useJobDetailQuery>);

const buildMetricsQueryState = (
  overrides: Partial<ReturnType<typeof useJobMetricsQuery>> = {}
): ReturnType<typeof useJobMetricsQuery> => ({
  data: undefined,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: Boolean(overrides.data),
  status: overrides.status ?? 'success',
  fetchStatus: overrides.fetchStatus ?? 'idle',
  ...overrides
} as ReturnType<typeof useJobMetricsQuery>);

const buildMetadataQueryState = (
  overrides: Partial<ReturnType<typeof useJobMetadataQuery>> = {}
): ReturnType<typeof useJobMetadataQuery> => ({
  data: undefined,
  error: null,
  isError: false,
  isLoading: false,
  isSuccess: Boolean(overrides.data),
  status: overrides.status ?? 'success',
  fetchStatus: overrides.fetchStatus ?? 'idle',
  ...overrides
} as ReturnType<typeof useJobMetadataQuery>);

const buildRealtimeState = (
  overrides: Partial<ReturnType<typeof useRealtimeJobEvents>> = {}
): ReturnType<typeof useRealtimeJobEvents> => ({
  status: 'idle',
  events: [],
  error: undefined,
  ...overrides
});

const createJobSummary = (
  overrides: Partial<NovelJobSummaryResponse> = {}
): NovelJobSummaryResponse => ({
  jobId: overrides.jobId ?? 'job-0',
  status: overrides.status ?? 'queued',
  queue: overrides.queue ?? 'default',
  payload: {
    title: 'Untitled Novel',
    premise: 'Soaring space opera.',
    genre: 'science-fiction',
    subgenre: 'Space opera',
    targetWordCount: 90_000,
    targetChapters: 18,
    humanLikeWriting: true,
    ...(overrides.payload ?? {})
  },
  requestedAt: overrides.requestedAt ?? '2025-10-07T08:00:00.000Z',
  createdAt: overrides.createdAt ?? '2025-10-07T08:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2025-10-07T08:00:00.000Z',
  progress: overrides.progress ?? null,
  summary: overrides.summary ?? null,
  engine: overrides.engine ?? null
});

const createJobDetail = (
  overrides: Partial<NovelJobDetailResponse> = {}
): NovelJobDetailResponse => ({
  ...createJobSummary(overrides),
  outline: overrides.outline ?? [],
  chapters: overrides.chapters ?? [],
  events: overrides.events ?? [],
  domainEvents: overrides.domainEvents ?? [],
  context: overrides.context ?? null,
  failures: overrides.failures ?? []
});

const createJobMetrics = (
  overrides: Partial<NovelJobMetricsResponse> = {}
): NovelJobMetricsResponse => {
  const costOverrides = overrides.cost ?? {};
  const tokenOverrides = overrides.tokens ?? {};
  const latencyOverrides = overrides.latencyMs ?? {};

  return {
    jobId: overrides.jobId ?? 'job-0',
    cost: {
      totalUsd: 0,
      analysisUsd: 0,
      outlineUsd: 0,
      chaptersUsd: 0,
      ...costOverrides
    },
    tokens: {
      total: 0,
      analysis: 0,
      outline: 0,
      chapters: 0,
      ...tokenOverrides
    },
    latencyMs: {
      analysis: 0,
      outline: 0,
      chapters: 0,
      ...latencyOverrides
    },
    updatedAt: overrides.updatedAt ?? '2025-10-07T08:00:00.000Z'
  };
};

const createJobMetadata = (
  overrides: Partial<NovelJobMetadataResponse> = {}
): NovelJobMetadataResponse => {
  const storyBibleOverrides =
    overrides.storyBible ?? ({} as Partial<NovelJobMetadataResponse['storyBible']>);

  return {
    jobId: overrides.jobId ?? 'job-0',
    storyBible: {
      characters: storyBibleOverrides.characters ?? {},
      metadata: storyBibleOverrides.metadata ?? null,
      locations: storyBibleOverrides.locations ?? null,
      themes: storyBibleOverrides.themes ?? []
    },
    continuityAlerts: overrides.continuityAlerts ?? [],
    aiDecisions: overrides.aiDecisions ?? [],
    enhancements: overrides.enhancements ?? [],
    performance: overrides.performance ?? null,
    updatedAt: overrides.updatedAt ?? '2025-10-07T08:00:00.000Z'
  };
};
