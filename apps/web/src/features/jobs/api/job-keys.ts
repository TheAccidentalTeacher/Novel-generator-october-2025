export const jobsKeys = {
	all: ['jobs'] as const,
	list: () => [...jobsKeys.all, 'list'] as const,
	detail: (jobId: string) => [...jobsKeys.all, 'detail', jobId] as const,
	metrics: (jobId: string) => [...jobsKeys.all, 'metrics', jobId] as const,
	metadata: (jobId: string) => [...jobsKeys.all, 'metadata', jobId] as const,
	events: (jobId: string) => [...jobsKeys.all, 'events', jobId] as const
};
