import { z } from 'zod';
import type { NovelJobStatus } from '@letswriteabook/domain';
import type { SerializedDomainEvent, SerializedGenerationEvent } from '@letswriteabook/shared-types';
export declare const NOVEL_REALTIME_CHANNEL = "novel.realtime.events";
export declare const NOVEL_REALTIME_PROTOCOL_VERSION: 1;
export type NovelRealtimeProtocolVersion = typeof NOVEL_REALTIME_PROTOCOL_VERSION;
declare const NovelGenerationRealtimeEventSchema: z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"generation">;
    event: z.ZodObject<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, "strip", z.ZodUnknown, z.objectOutputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    kind: "generation";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version: number;
}, {
    jobId: string;
    kind: "generation";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version?: number | undefined;
}>;
declare const NovelDomainRealtimeEventSchema: z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"domain">;
    event: z.ZodObject<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, "strip", z.ZodUnknown, z.objectOutputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    kind: "domain";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version: number;
}, {
    jobId: string;
    kind: "domain";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version?: number | undefined;
}>;
declare const NovelJobStatusRealtimeEventSchema: z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"job-status">;
    status: z.ZodEnum<["queued", "running", "completed", "failed"]>;
    snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    status: "completed" | "failed" | "queued" | "running";
    kind: "job-status";
    version: number;
    snapshot?: Record<string, unknown> | undefined;
}, {
    jobId: string;
    status: "completed" | "failed" | "queued" | "running";
    kind: "job-status";
    snapshot?: Record<string, unknown> | undefined;
    version?: number | undefined;
}>;
export declare const NovelRealtimeEventSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"generation">;
    event: z.ZodObject<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, "strip", z.ZodUnknown, z.objectOutputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    kind: "generation";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version: number;
}, {
    jobId: string;
    kind: "generation";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version?: number | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"domain">;
    event: z.ZodObject<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, "strip", z.ZodUnknown, z.objectOutputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">, z.objectInputType<{
        type: z.ZodString;
        occurredAt: z.ZodString;
    }, z.ZodUnknown, "strip">>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    kind: "domain";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version: number;
}, {
    jobId: string;
    kind: "domain";
    event: {
        type: string;
        occurredAt: string;
    } & {
        [k: string]: unknown;
    };
    version?: number | undefined;
}>, z.ZodObject<z.objectUtil.extendShape<{
    version: z.ZodDefault<z.ZodNumber>;
    jobId: z.ZodString;
}, {
    kind: z.ZodLiteral<"job-status">;
    status: z.ZodEnum<["queued", "running", "completed", "failed"]>;
    snapshot: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}>, "strip", z.ZodTypeAny, {
    jobId: string;
    status: "completed" | "failed" | "queued" | "running";
    kind: "job-status";
    version: number;
    snapshot?: Record<string, unknown> | undefined;
}, {
    jobId: string;
    status: "completed" | "failed" | "queued" | "running";
    kind: "job-status";
    snapshot?: Record<string, unknown> | undefined;
    version?: number | undefined;
}>]>;
export type NovelGenerationRealtimeEvent = z.infer<typeof NovelGenerationRealtimeEventSchema>;
export type NovelDomainRealtimeEvent = z.infer<typeof NovelDomainRealtimeEventSchema>;
export type NovelJobStatusRealtimeEvent = z.infer<typeof NovelJobStatusRealtimeEventSchema>;
export type NovelRealtimeEvent = z.infer<typeof NovelRealtimeEventSchema>;
export type NovelRealtimeEventKind = NovelRealtimeEvent['kind'];
export declare function createGenerationRealtimeEvent(jobId: string, event: SerializedGenerationEvent): NovelGenerationRealtimeEvent;
export declare function createDomainRealtimeEvent(jobId: string, event: SerializedDomainEvent): NovelDomainRealtimeEvent;
export declare function createJobStatusRealtimeEvent(jobId: string, status: NovelJobStatus, snapshot?: Record<string, unknown>): NovelJobStatusRealtimeEvent;
export declare function encodeNovelRealtimeEvent(event: NovelRealtimeEvent): string;
export declare function decodeNovelRealtimeEvent(payload: string): NovelRealtimeEvent;
export declare function isGenerationRealtimeEvent(event: NovelRealtimeEvent): event is NovelGenerationRealtimeEvent;
export declare function isDomainRealtimeEvent(event: NovelRealtimeEvent): event is NovelDomainRealtimeEvent;
export declare function isJobStatusRealtimeEvent(event: NovelRealtimeEvent): event is NovelJobStatusRealtimeEvent;
export {};
