import type {
  NovelJobAggregate,
  NovelJobEventRecord,
  NovelJobMetadata,
  NovelJobMetrics,
  NovelJobStatus,
} from '@letswriteabook/domain';
import type { NovelGenerationJobData } from '@letswriteabook/shared-types';

interface NovelJobBaseResponse {
  readonly jobId: string;
  readonly status: NovelJobStatus;
  readonly queue: string;
  readonly payload: NovelGenerationJobData['payload'];
  readonly requestedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly progress: NovelJobAggregate['snapshot']['progress'] | null;
  readonly summary: NovelJobAggregate['snapshot']['summary'] | null;
  readonly engine: NovelJobAggregate['snapshot']['engine'] | null;
}

export interface NovelJobSummaryResponse extends NovelJobBaseResponse {}

export interface NovelJobDetailResponse extends NovelJobBaseResponse {
  readonly outline: ReadonlyArray<NonNullable<NovelJobAggregate['outline']>[number]>;
  readonly chapters: NovelJobAggregate['chapters'];
  readonly events: NovelJobAggregate['snapshot']['events'];
  readonly domainEvents: NovelJobAggregate['snapshot']['domainEvents'];
  readonly context: NovelJobAggregate['snapshot']['context'] | null;
  readonly failures: NovelJobAggregate['failures'];
}

function toIsoString(date: Date): string {
  return date.toISOString();
}

function baseResponse(job: NovelJobAggregate): NovelJobBaseResponse {
  return {
    jobId: job.id,
    status: job.status,
    queue: job.queue,
    payload: job.payload,
    requestedAt: job.requestedAt ?? null,
    createdAt: toIsoString(job.createdAt),
    updatedAt: toIsoString(job.updatedAt),
    progress: job.snapshot.progress ?? null,
    summary: job.snapshot.summary ?? null,
    engine: job.snapshot.engine ?? null,
  } satisfies NovelJobBaseResponse;
}

export function presentNovelJobSummary(job: NovelJobAggregate): NovelJobSummaryResponse {
  return baseResponse(job);
}

export function presentNovelJobDetail(job: NovelJobAggregate): NovelJobDetailResponse {
  const base = baseResponse(job);
  return {
    ...base,
    outline: job.outline ?? [],
    chapters: job.chapters,
    events: job.snapshot.events,
    domainEvents: job.snapshot.domainEvents,
    context: job.snapshot.context ?? null,
    failures: job.failures,
  } satisfies NovelJobDetailResponse;
}

export function presentNovelJobSummaries(jobs: ReadonlyArray<NovelJobAggregate>): NovelJobSummaryResponse[] {
  return jobs.map(presentNovelJobSummary);
}

export type NovelJobEventResponse =
  | {
      readonly kind: 'generation';
      readonly jobId: string;
      readonly emittedAt: string;
      readonly event: NovelJobAggregate['snapshot']['events'][number];
    }
  | {
      readonly kind: 'domain';
      readonly jobId: string;
      readonly emittedAt: string;
      readonly event: NovelJobAggregate['snapshot']['domainEvents'][number];
    }
  | {
      readonly kind: 'job-status';
      readonly jobId: string;
      readonly emittedAt: string;
      readonly status: NovelJobStatus;
      readonly snapshot: Record<string, unknown> | null;
    };

export interface NovelJobEventsResponse {
  readonly count: number;
  readonly items: ReadonlyArray<NovelJobEventResponse>;
}

export interface NovelJobMetricsResponse {
  readonly jobId: string;
  readonly cost: {
    readonly totalUsd: number;
    readonly analysisUsd: number;
    readonly outlineUsd: number;
    readonly chaptersUsd: number;
    readonly [segment: string]: number;
  };
  readonly tokens: {
    readonly total: number;
    readonly analysis: number;
    readonly outline: number;
    readonly chapters: number;
    readonly [segment: string]: number;
  };
  readonly latencyMs: Record<string, number>;
  readonly updatedAt: string | null;
}

export interface NovelJobMetadataResponse {
  readonly jobId: string;
  readonly storyBible: {
    readonly characters: NovelJobMetadata['storyBible']['characters'];
    readonly metadata: Record<string, unknown> | null;
    readonly locations: Record<string, unknown> | null;
    readonly themes: ReadonlyArray<string>;
  };
  readonly continuityAlerts: NovelJobMetadata['continuityAlerts'];
  readonly aiDecisions: NovelJobMetadata['aiDecisions'];
  readonly enhancements: ReadonlyArray<Record<string, unknown>>;
  readonly performance: Record<string, unknown> | null;
  readonly updatedAt: string | null;
}

export function presentNovelJobEvents(events: ReadonlyArray<NovelJobEventRecord>): NovelJobEventsResponse {
  const items: NovelJobEventResponse[] = events.map((event) => {
    if (event.kind === 'job-status') {
      return {
        kind: 'job-status',
        jobId: event.jobId,
        emittedAt: event.emittedAt,
        status: event.status,
        snapshot: event.snapshot ?? null,
      } satisfies NovelJobEventResponse;
    }

    if (event.kind === 'generation') {
      return {
        kind: 'generation',
        jobId: event.jobId,
        emittedAt: event.emittedAt,
        event: event.event,
      } satisfies NovelJobEventResponse;
    }

    return {
      kind: 'domain',
      jobId: event.jobId,
      emittedAt: event.emittedAt,
      event: event.event,
    } satisfies NovelJobEventResponse;
  });

  return {
    count: items.length,
    items,
  } satisfies NovelJobEventsResponse;
}

export function presentNovelJobMetrics(jobId: string, metrics: NovelJobMetrics | null): NovelJobMetricsResponse {
  const numericCost = pickNumericEntries(metrics?.cost ?? {});
  const numericTokens = pickNumericEntries(metrics?.tokens ?? {});
  const latency = pickNumericEntries(metrics?.latencyMs ?? {});

  const {
    totalUsd = 0,
    analysisUsd = 0,
    outlineUsd = 0,
    chaptersUsd = 0,
    ...costSegments
  } = numericCost;

  const {
    total = 0,
    analysis = 0,
    outline = 0,
    chapters = 0,
    ...tokenSegments
  } = numericTokens;

  return {
    jobId,
    cost: {
      totalUsd,
      analysisUsd,
      outlineUsd,
      chaptersUsd,
      ...costSegments,
    },
    tokens: {
      total,
      analysis,
      outline,
      chapters,
      ...tokenSegments,
    },
    latencyMs: latency,
    updatedAt: metrics?.updatedAt ?? null,
  } satisfies NovelJobMetricsResponse;
}

export function presentNovelJobMetadata(jobId: string, metadata: NovelJobMetadata | null): NovelJobMetadataResponse {
  const storyBible = metadata?.storyBible;

  return {
    jobId,
    storyBible: {
      characters: storyBible?.characters ?? {},
      metadata: storyBible?.metadata ?? null,
      locations: storyBible?.locations ?? null,
      themes: storyBible?.themes ?? [],
    },
    continuityAlerts: metadata?.continuityAlerts ?? [],
    aiDecisions: metadata?.aiDecisions ?? [],
    enhancements: metadata?.enhancements ?? [],
    performance: metadata?.performance ?? null,
    updatedAt: metadata?.updatedAt ?? null,
  } satisfies NovelJobMetadataResponse;
}

function pickNumericEntries(source: Record<string, unknown>): Record<string, number> {
  return Object.entries(source).reduce<Record<string, number>>((acc, [key, value]) => {
    if (typeof value === 'number') {
      acc[key] = value;
    }

    return acc;
  }, {});
}
