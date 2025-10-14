import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardFooter, CardHeader, StatusBadge } from '@letswriteabook/ui';
import type { NovelStoryBibleCharacterSnapshot } from '@letswriteabook/shared-types';

import { useJobDetailQuery } from '@/features/jobs/hooks/useJobDetailQuery';
import { useJobMetadataQuery } from '@/features/jobs/hooks/useJobMetadataQuery';
import { useJobMetricsQuery } from '@/features/jobs/hooks/useJobMetricsQuery';
import { useRealtimeJobEvents } from '@/features/jobs/hooks/useRealtimeJobEvents';

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

const formatCurrency = (value?: number | null): string =>
	formatNumber(value, { style: 'currency', currency: 'USD' });

const JobPlaceholderNotice = ({
	isPlaceholder
}: {
	isPlaceholder: boolean;
}): JSX.Element | null =>
	isPlaceholder ? (
		<Card className="border border-dashed border-slate-300">
			<CardHeader
				title="Using placeholder data"
				description="Run the backend API locally to replace this demo snapshot with live data."
		/>
		</Card>
	) : null;

const StoryHighlights = ({
	themes,
	characters
}: {
	themes: readonly string[];
	characters: ReadonlyArray<{ readonly name: string; readonly summary?: string }>;
}): JSX.Element => (
	<ul className="grid gap-3 text-sm text-slate-700">
		<li className="flex flex-col gap-1">
			<span className="font-semibold text-slate-500">Themes</span>
			<span>{themes.length > 0 ? themes.join(', ') : 'Not captured yet.'}</span>
		</li>
		<li className="flex flex-col gap-1">
			<span className="font-semibold text-slate-500">Key characters</span>
			<span>
				{characters.length > 0
					? characters
							.map(({ name, summary }) => (summary ? `${name} — ${summary}` : name))
							.join('; ')
					: 'No characters documented yet.'}
			</span>
		</li>
	</ul>
);

export const JobDetailPage = (): JSX.Element => {
	const { jobId } = useParams();
	const {
		data: jobDetailResult,
		isLoading: isDetailLoading,
		isError: isDetailError,
		error: detailError
	} = useJobDetailQuery(jobId);
	const { data: jobMetricsResult, isLoading: isMetricsLoading } = useJobMetricsQuery(jobId);
	const { data: jobMetadataResult, isLoading: isMetadataLoading } = useJobMetadataQuery(jobId);
	const { events, status: realtimeStatus, error: realtimeError } = useRealtimeJobEvents(jobId);

	const subtitle = useMemo(() => {
		if (!jobId) {
			return 'Select a job to inspect the realtime event timeline.';
		}

		return `Subscribed to job: ${jobId}`;
	}, [jobId]);

	const jobDetail = jobDetailResult?.data;
	const jobMetrics = jobMetricsResult?.data;
	const jobMetadata = jobMetadataResult?.data;

	const isPlaceholder =
		jobDetailResult?.source === 'placeholder' ||
		jobMetricsResult?.source === 'placeholder' ||
		jobMetadataResult?.source === 'placeholder';

	const activeStatus = jobDetail?.status;
	const statusToneMap: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
		queued: 'neutral',
		running: 'info',
		completed: 'success',
		failed: 'danger'
	};
	const statusTone = activeStatus ? statusToneMap[activeStatus] ?? 'neutral' : 'neutral';

	const storyCharacters = useMemo(() => {
		if (!jobMetadata) {
			return [] as ReadonlyArray<{
				readonly name: string;
				readonly summary?: string;
			}>;
		}

		const charactersRecord = jobMetadata.storyBible.characters as Record<string, NovelStoryBibleCharacterSnapshot>;
		return Object.values(charactersRecord).map((character) => ({
			name: character.name,
			summary: character.summary
		}));
	}, [jobMetadata]);

	return (
		<section className="page">
			<header className="page__header">
				<h2>Job timeline</h2>
				<p>{subtitle}</p>
				<div className="flex flex-wrap items-center gap-3">
					{activeStatus ? <StatusBadge tone={statusTone}>{activeStatus}</StatusBadge> : null}
					<div className={`status-pill status-pill--${realtimeStatus}`}>Realtime: {realtimeStatus}</div>
				</div>
				{realtimeError ? <p className="status-pill status-pill--error">{realtimeError}</p> : null}
			</header>
			<div className="page__content page__content--stacked">
					{jobId ? (
					<>
						<JobPlaceholderNotice isPlaceholder={isPlaceholder} />
						<div className="grid gap-5 lg:grid-cols-2">
							<Card>
								<CardHeader
									title={jobDetail?.payload.title ?? 'Unknown job'}
									description={`Queue: ${jobDetail?.queue ?? 'unknown'}`}
								/>
								<CardContent>
									<dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
										<div>
											<dt>Genre</dt>
											<dd>{jobDetail?.payload.genre ?? '—'}</dd>
										</div>
										<div>
											<dt>Subgenre</dt>
											<dd>{jobDetail?.payload.subgenre ?? '—'}</dd>
										</div>
										<div>
											<dt>Target word count</dt>
											<dd>{formatNumber(jobDetail?.payload.targetWordCount)}</dd>
										</div>
										<div>
											<dt>Requested at</dt>
											<dd>{formatDate(jobDetail?.requestedAt)}</dd>
										</div>
										<div>
											<dt>Created at</dt>
											<dd>{formatDate(jobDetail?.createdAt)}</dd>
										</div>
										<div>
											<dt>Last updated</dt>
											<dd>{formatDate(jobDetail?.updatedAt)}</dd>
										</div>
									</dl>
								</CardContent>
							</Card>
							<Card>
								<CardHeader title="Progress" description="Snapshot of outline and chapter completion." />
								<CardContent>
									{isDetailLoading ? (
										<p className="m-0 animate-pulse rounded-xl bg-slate-900/10 px-3 py-2 text-sm text-slate-500">
											Loading progress…
										</p>
									) : jobDetail?.progress ? (
										<dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
											<div>
												<dt>Outline ready</dt>
												<dd>{jobDetail.progress.outlineComplete ? 'Yes' : 'No'}</dd>
											</div>
											<div>
												<dt>Chapters completed</dt>
												<dd>
													{jobDetail.progress.chaptersCompleted} / {jobDetail.progress.totalChapters}
												</dd>
											</div>
											<div>
												<dt>Failures</dt>
												<dd>{jobDetail.progress.hasFailures ? 'Detected' : 'None'}</dd>
											</div>
										</dl>
									) : (
										<p>No progress metrics available yet.</p>
									)}
								</CardContent>
							</Card>
							<Card>
								<CardHeader
									title="Cost & tokens"
									description="Live totals from the metrics API"
								/>
								<CardContent>
									{isMetricsLoading ? (
										<p className="m-0 animate-pulse rounded-xl bg-slate-900/10 px-3 py-2 text-sm text-slate-500">
											Loading cost metrics…
										</p>
									) : jobMetrics ? (
										<ul className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
											<li>
												<span>Total cost</span>
												<strong>{formatCurrency(jobMetrics.cost.totalUsd)}</strong>
											</li>
											<li>
												<span>Total tokens</span>
												<strong>{formatNumber(jobMetrics.tokens.total)}</strong>
											</li>
											<li>
												<span>Last update</span>
												<strong>{formatDate(jobMetrics.updatedAt)}</strong>
											</li>
										</ul>
									) : (
										<p>No metrics reported yet.</p>
									)}
								</CardContent>
							</Card>
							<Card>
								<CardHeader title="Story bible" description="Themes and character highlights captured so far." />
								<CardContent>
									{isMetadataLoading ? (
										<p className="m-0 animate-pulse rounded-xl bg-slate-900/10 px-3 py-2 text-sm text-slate-500">
											Loading story bible…
										</p>
									) : jobMetadata ? (
										<StoryHighlights themes={jobMetadata.storyBible.themes} characters={storyCharacters} />
									) : (
										<p>No story bible entries yet.</p>
									)}
								</CardContent>
								<CardFooter className="flex justify-end">
										<Button variant="ghost">
										Export outline
									</Button>
								</CardFooter>
							</Card>
						</div>
						<section className="flex flex-col gap-4">
							<header className="flex flex-col gap-1">
								<h3 className="m-0 text-lg font-semibold">Realtime events</h3>
								<p className="m-0 text-sm text-slate-600">Fresh gateway events appear here as the job progresses.</p>
							</header>
							{events.length === 0 ? (
								<p className="empty-state">
									No events received yet. Trigger a synthesis run to populate this feed.
								</p>
							) : (
								<ol className="timeline" aria-live="polite">
									{events.map((event) => (
										<li key={event.id} className="timeline__item">
											<header className="timeline__item-header">
												<span className="timeline__item-type">{event.type}</span>
												<time dateTime={event.timestamp}>
													{new Date(event.timestamp).toLocaleTimeString()}
												</time>
											</header>
											<pre className="timeline__item-payload">{JSON.stringify(event.payload, null, 2)}</pre>
										</li>
									))}
								</ol>
							)}
						</section>
					</>
				) : (
					<p className="empty-state">Select a job from the dashboard to view progress.</p>
				)}
			</div>
			{isDetailError ? (
				<p className="status-pill status-pill--error">
					{detailError instanceof Error ? detailError.message : 'Unable to load job details.'}
				</p>
			) : null}
		</section>
	);
};
