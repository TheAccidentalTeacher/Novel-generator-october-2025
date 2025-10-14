import { z } from 'zod';
import type { NovelJobStatus } from '@letswriteabook/domain';
import type { SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';

export const NOVEL_REALTIME_CHANNEL = 'novel.realtime.events';
export const NOVEL_REALTIME_PROTOCOL_VERSION = 1 as const;

export type NovelRealtimeProtocolVersion = typeof NOVEL_REALTIME_PROTOCOL_VERSION;

const SerializedGenerationEventSchema = z
	.object({
		type: z.string().min(1),
		occurredAt: z.string().min(1),
	})
	.catchall(z.unknown());

const SerializedDomainEventSchema = z
	.object({
		type: z.string().min(1),
		occurredAt: z.string().min(1),
	})
	.catchall(z.unknown());

const NovelJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);

const NovelRealtimeEventBaseSchema = z.object({
	version: z
		.number()
		.int()
		.min(1)
		.default(NOVEL_REALTIME_PROTOCOL_VERSION),
	jobId: z.string().min(1),
});

const NovelGenerationRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
	kind: z.literal('generation'),
	event: SerializedGenerationEventSchema,
});

const NovelDomainRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
	kind: z.literal('domain'),
	event: SerializedDomainEventSchema,
});

const NovelJobStatusRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
	kind: z.literal('job-status'),
	status: NovelJobStatusSchema,
	snapshot: z.record(z.unknown()).optional(),
});

export const NovelRealtimeEventSchema = z.discriminatedUnion('kind', [
	NovelGenerationRealtimeEventSchema,
	NovelDomainRealtimeEventSchema,
	NovelJobStatusRealtimeEventSchema,
]);

export type NovelGenerationRealtimeEvent = z.infer<typeof NovelGenerationRealtimeEventSchema>;
export type NovelDomainRealtimeEvent = z.infer<typeof NovelDomainRealtimeEventSchema>;
export type NovelJobStatusRealtimeEvent = z.infer<typeof NovelJobStatusRealtimeEventSchema>;
export type NovelRealtimeEvent = z.infer<typeof NovelRealtimeEventSchema>;

export type NovelRealtimeEventKind = NovelRealtimeEvent['kind'];

export function createGenerationRealtimeEvent(
	jobId: string,
	event: SerializedGenerationEvent,
): NovelGenerationRealtimeEvent {
	return {
		version: NOVEL_REALTIME_PROTOCOL_VERSION,
		kind: 'generation',
		jobId,
		event,
	};
}

export function createDomainRealtimeEvent(jobId: string, event: SerializedDomainEvent): NovelDomainRealtimeEvent {
	return {
		version: NOVEL_REALTIME_PROTOCOL_VERSION,
		kind: 'domain',
		jobId,
		event,
	};
}

export function createJobStatusRealtimeEvent(
	jobId: string,
	status: NovelJobStatus,
	snapshot?: Record<string, unknown>,
): NovelJobStatusRealtimeEvent {
	return {
		version: NOVEL_REALTIME_PROTOCOL_VERSION,
		kind: 'job-status',
		jobId,
		status,
		...(snapshot ? { snapshot } : {}),
	};
}

export function encodeNovelRealtimeEvent(event: NovelRealtimeEvent): string {
	return JSON.stringify(event);
}

export function decodeNovelRealtimeEvent(payload: string): NovelRealtimeEvent {
	const json = JSON.parse(payload) as unknown;
	return NovelRealtimeEventSchema.parse(json);
}

export function isGenerationRealtimeEvent(event: NovelRealtimeEvent): event is NovelGenerationRealtimeEvent {
	return event.kind === 'generation';
}

export function isDomainRealtimeEvent(event: NovelRealtimeEvent): event is NovelDomainRealtimeEvent {
	return event.kind === 'domain';
}

export function isJobStatusRealtimeEvent(event: NovelRealtimeEvent): event is NovelJobStatusRealtimeEvent {
	return event.kind === 'job-status';
}
