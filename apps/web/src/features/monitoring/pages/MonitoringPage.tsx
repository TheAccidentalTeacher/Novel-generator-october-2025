import { useMemo } from 'react';
import { Card, CardContent, CardHeader, StatusBadge } from '@letswriteabook/ui';

import { useMonitoringSnapshotQuery } from '@/features/monitoring/hooks/useMonitoringSnapshotQuery';
import type {
	DeploymentRecord,
	MonitoringSnapshot,
	QueueGauge,
	WorkerStatus
} from '@/features/monitoring/api/monitoring-api';

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

const WorkerList = ({ workers }: { readonly workers: ReadonlyArray<WorkerStatus> }): JSX.Element => (
	<ul className="grid gap-3">
		{workers.map((worker) => (
			<li key={worker.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
				<header className="flex items-center justify-between">
					<div className="flex flex-col">
						<span className="font-semibold text-slate-800">{worker.name}</span>
						<span className="text-xs text-slate-500">Last heartbeat · {formatDate(worker.lastHeartbeat)}</span>
					</div>
					<StatusBadge tone={worker.status === 'online' ? 'success' : worker.status === 'degraded' ? 'warning' : 'danger'}>
						{worker.status}
					</StatusBadge>
				</header>
				<dl className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-600">
					<div>
						<dt>Concurrency</dt>
						<dd>{worker.concurrency}</dd>
					</div>
					<div>
						<dt>Active jobs</dt>
						<dd>{worker.activeJobs}</dd>
					</div>
					<div>
						<dt>Utilisation</dt>
						<dd>
							{worker.concurrency === 0
								? '—'
								: `${Math.min(100, Math.round((worker.activeJobs / worker.concurrency) * 100))}%`}
						</dd>
					</div>
				</dl>
			</li>
		))}
	</ul>
);

const QueueTable = ({ queues }: { readonly queues: ReadonlyArray<QueueGauge> }): JSX.Element => (
	<table className="w-full table-auto text-sm text-slate-700">
		<thead className="text-left text-xs uppercase tracking-wide text-slate-500">
			<tr>
				<th className="pb-2">Queue</th>
				<th className="pb-2">Depth</th>
				<th className="pb-2">Waiting</th>
				<th className="pb-2">Delayed</th>
				<th className="pb-2">Failed</th>
				<th className="pb-2">Updated</th>
			</tr>
		</thead>
		<tbody>
			{queues.map((queue) => (
				<tr key={queue.name} className="border-t border-slate-100">
					<td className="py-2 font-medium text-slate-800">{queue.name}</td>
					<td className="py-2">{queue.depth}</td>
					<td className="py-2">{queue.waiting}</td>
					<td className="py-2">{queue.delayed}</td>
					<td className="py-2">{queue.failed}</td>
					<td className="py-2 text-slate-500">{formatDate(queue.updatedAt)}</td>
				</tr>
			))}
		</tbody>
	</table>
);

const DeploymentList = ({
	deployments
}: {
	readonly deployments: ReadonlyArray<DeploymentRecord>;
}): JSX.Element => (
	<ul className="grid gap-3">
		{deployments.map((deploy) => (
			<li
				key={`${deploy.service}-${deploy.version}`}
				className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
			>
				<div className="flex flex-col">
					<span className="font-semibold text-slate-800">{deploy.service}</span>
					<span className="text-xs text-slate-500">Commit {deploy.commit}</span>
				</div>
				<div className="flex items-center gap-3 text-sm text-slate-600">
					<span className="rounded-full bg-slate-900/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
						{deploy.version}
					</span>
					<span>{formatDate(deploy.deployedAt)}</span>
				</div>
			</li>
		))}
	</ul>
);

const PlaceholderNotice = ({ isPlaceholder }: { isPlaceholder: boolean }): JSX.Element | null =>
	isPlaceholder ? (
		<Card className="border border-dashed border-slate-300">
			<CardHeader
				title="Using placeholder telemetry"
				description="Boot the API service to replace this simulated snapshot with live monitoring data."
			/>
		</Card>
	) : null;

export const MonitoringPage = (): JSX.Element => {
	const {
		data: snapshotResult,
		isLoading,
		isError,
		error
	} = useMonitoringSnapshotQuery();

	const snapshot: MonitoringSnapshot | undefined = snapshotResult?.data;
	const headingDetail = useMemo(() => {
		if (!snapshot) {
			return 'Realtime gauges appear once telemetry is available.';
		}

		return `Snapshot generated ${formatDate(snapshot.generatedAt)} (${snapshot.region})`;
	}, [snapshot]);

	return (
		<section className="page">
			<header className="page__header">
				<h2>Platform monitoring</h2>
				<p>{headingDetail}</p>
			</header>
			<div className="page__content page__content--stacked">
				<PlaceholderNotice isPlaceholder={snapshotResult?.source === 'placeholder'} />
				{snapshot?.notes ? (
					<Card>
						<CardHeader title="Notes" />
						<CardContent>
							<p className="m-0 text-sm text-slate-600">{snapshot.notes}</p>
						</CardContent>
					</Card>
				) : null}
				{isLoading ? (
					<Card>
						<CardContent>
							<p className="m-0 animate-pulse rounded-xl bg-slate-900/10 px-3 py-2 text-sm text-slate-500">
								Loading telemetry…
							</p>
						</CardContent>
					</Card>
				) : snapshot ? (
					<>
						<Card>
							<CardHeader title="Worker health" description="Status across API and novel processing workers." />
							<CardContent>
								<WorkerList workers={snapshot.workerStatuses} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader title="Queue depth" description="Pending, delayed, and failed jobs per queue." />
							<CardContent>
								<QueueTable queues={snapshot.queues} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader title="Recent deployments" description="Last known releases across services." />
							<CardContent>
								<DeploymentList deployments={snapshot.deployments} />
							</CardContent>
						</Card>
					</>
				) : (
					<Card>
						<CardContent>
							<p className="empty-state">No telemetry captured yet.</p>
						</CardContent>
					</Card>
				)}
			</div>
			{isError ? (
				<p className="status-pill status-pill--error">
					{error instanceof Error ? error.message : 'Unable to load monitoring snapshot.'}
				</p>
			) : null}
		</section>
	);
};
