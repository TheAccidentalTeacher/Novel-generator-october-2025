import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationFormValues } from '@/features/generation/validators/generation-schema';
import { GenerationPage } from './GenerationPage';
import { createApiResult } from '@/lib/api-client';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const mockMutation = {
  mutateAsync: vi.fn(),
  isPending: false
};

vi.mock('@/features/generation/hooks/useCreateGenerationJobMutation', () => ({
  useCreateGenerationJobMutation: () => mockMutation
}));

let submitHandler: ((values: GenerationFormValues) => Promise<void> | void) | undefined;

vi.mock('@/features/generation/components/GenerationForm', () => {
  const Mock = ({ onSubmit }: { readonly onSubmit: (values: GenerationFormValues) => Promise<void> | void; readonly isSubmitting?: boolean }) => {
    submitHandler = onSubmit;
    return (
      <div>
        <button onClick={() => onSubmit(validValues)}>Submit Form</button>
      </div>
    );
  };
  return { GenerationForm: Mock };
});

const validValues: GenerationFormValues = {
  title: 'Aurora Drift',
  premise: 'A linguist decodes an alien language that rewrites memories across a starship crew.',
  genre: 'science-fiction',
  subgenre: 'First contact',
  targetWordCount: 90000,
  targetChapters: 20,
  humanLikeWriting: true
};

describe('GenerationPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockMutation.mutateAsync.mockReset();
    mockMutation.isPending = false;
    submitHandler = undefined;
  });

  it('navigates to the job detail page when the API accepts the request', async () => {
    mockMutation.mutateAsync.mockResolvedValueOnce(
      createApiResult({
        jobId: 'job-123',
        status: 'queued',
        queue: 'novel-generation',
        createdAt: '2025-10-08T12:00:00.000Z'
      })
    );

    render(<GenerationPage />);

    expect(submitHandler).toBeDefined();

    await act(async () => {
      await submitHandler?.(validValues);
    });

    expect(mockMutation.mutateAsync).toHaveBeenCalledWith(validValues);
    expect(mockNavigate).toHaveBeenCalledWith('/jobs/job-123');
    expect(screen.queryByText(/placeholder mode/i)).not.toBeInTheDocument();
  });

  it('surfaces placeholder mode messaging when the API is offline', async () => {
    mockMutation.mutateAsync.mockResolvedValueOnce(
      createApiResult(
        {
          jobId: 'job-placeholder',
          status: 'queued',
          queue: 'novel-generation',
          createdAt: '2025-10-08T12:05:00.000Z'
        },
        'placeholder'
      )
    );

    render(<GenerationPage />);

    await act(async () => {
      await submitHandler?.(validValues);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByText(/placeholder job id/i)).toBeInTheDocument();
    expect(screen.getByText(/job-placeholder/i)).toBeInTheDocument();
  });

  it('lets submission errors bubble so the form can display them', async () => {
    const error = new Error('We\'re receiving too many requests right now. Please wait a moment and try again.');
    mockMutation.mutateAsync.mockRejectedValueOnce(error);

    render(<GenerationPage />);

    await expect(submitHandler?.(validValues)).rejects.toBe(error);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText(/placeholder job id/i)).not.toBeInTheDocument();
  });
});
