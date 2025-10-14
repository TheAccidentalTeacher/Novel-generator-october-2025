import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardFooter, CardHeader, StatusBadge } from '@letswriteabook/ui';
import type { ListNovelJobsResponse, NovelJobSummaryResponse } from '@letswriteabook/shared-types';

import { useJobsQuery } from '@/features/jobs/hooks/useJobsQuery';

const formatDate = (value?: string | null): string => {
	if (!value) {
		return '—';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatNumber = (value?: number | null, options?: Intl.NumberFormatOptions): string => {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return '—';
	}

	return new Intl.NumberFormat(undefined, options).format(value);
};

const JobPlaceholderNotice = ({
	isPlaceholder
}: {
	isPlaceholder: boolean;
}): JSX.Element | null =>
	isPlaceholder ? (
		<Card className="border border-dashed border-slate-300">
			<CardHeader
				title="Using placeholder data"
				description="Run the backend API locally to replace this demo list with live jobs and realtime updates."
			/>
		</Card>
	) : null;

const statusToneMap: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
	queued: 'neutral',
	running: 'info',
	completed: 'success',
	failed: 'danger'
};

const JobList = ({ items }: { readonly items: ListNovelJobsResponse['items'] }): JSX.Element => (
	<ul className="grid gap-4">
		{items.map((job: NovelJobSummaryResponse) => {
			const tone = statusToneMap[job.status] ?? 'neutral';
			return (
				<li key={job.jobId}>
					<Card>
						<CardHeader
							title={job.payload.title ?? job.jobId}
							description={`Queue: ${job.queue}`}
							actions={<StatusBadge tone={tone}>{job.status}</StatusBadge>}
						/>
						<CardContent>
							<dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
								<div>
									<dt>Requested</dt>
									<dd>{formatDate(job.requestedAt)}</dd>
								</div>
								<div>
									<dt>Last update</dt>
									<dd>{formatDate(job.updatedAt)}</dd>
								</div>
								<div>
									<dt>Chapters completed</dt>
									<dd>
										{job.progress
												? `${job.progress.chaptersCompleted} / ${job.progress.totalChapters}`
											: '—'}
									</dd>
								</div>
								<div>
									<dt>Total words</dt>
									<dd>{formatNumber(job.summary?.totalWordCount)}</dd>
								</div>
							</dl>
						</CardContent>
						<CardFooter className="flex justify-end">
							<Link to={`/jobs/${encodeURIComponent(job.jobId)}`}>
								<Button variant="secondary">View timeline</Button>
							</Link>
						</CardFooter>
					</Card>
				</li>
			);
		})}
	</ul>
);

export const JobListPage = (): JSX.Element => {
	const {
		data: jobsResult,
		isLoading,
		isError,
		error
	} = useJobsQuery();

	const sortedJobs = useMemo(() => {
		const items = jobsResult?.data.items ?? [];
		const toTimestamp = (value?: string | null) => {
			if (!value) return 0;
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? 0 : date.getTime();
		};

		return [...items].sort((a, b) => {
			const aTime = toTimestamp(a.updatedAt) || toTimestamp(a.requestedAt);
			const bTime = toTimestamp(b.updatedAt) || toTimestamp(b.requestedAt);
			return bTime - aTime;
		});
	}, [jobsResult?.data?.items]);
	const isPlaceholder = jobsResult?.source === 'placeholder';

	return (
		<section className="page">
			<header className="page__header">
				<h2>Novel generation jobs</h2>
				<p>Review recent runs and drill down into realtime timelines for each job.</p>
			</header>
			<div className="page__content page__content--stacked">
				<JobPlaceholderNotice isPlaceholder={Boolean(isPlaceholder)} />
				{isLoading ? (
					<Card>
						<CardContent>
							<p className="m-0 animate-pulse rounded-xl bg-slate-900/10 px-3 py-2 text-sm text-slate-500">
								Loading jobs…
							</p>
						</CardContent>
					</Card>
				) : sortedJobs.length > 0 ? (
					<JobList items={sortedJobs} />
				) : (
					<Card>
						<CardContent>
							<p className="empty-state">No jobs found yet. Trigger a generation run to populate this list.</p>
						</CardContent>
					</Card>
				)}
			</div>
			{isError ? (
				<p className="status-pill status-pill--error">
					{error instanceof Error ? error.message : 'Unable to load jobs.'}
				</p>
			) : null}
		</section>
	);
};
