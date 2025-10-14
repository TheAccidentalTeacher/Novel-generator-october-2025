"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovelRealtimeEventSchema = exports.NOVEL_REALTIME_PROTOCOL_VERSION = exports.NOVEL_REALTIME_CHANNEL = void 0;
exports.createGenerationRealtimeEvent = createGenerationRealtimeEvent;
exports.createDomainRealtimeEvent = createDomainRealtimeEvent;
exports.createJobStatusRealtimeEvent = createJobStatusRealtimeEvent;
exports.encodeNovelRealtimeEvent = encodeNovelRealtimeEvent;
exports.decodeNovelRealtimeEvent = decodeNovelRealtimeEvent;
exports.isGenerationRealtimeEvent = isGenerationRealtimeEvent;
exports.isDomainRealtimeEvent = isDomainRealtimeEvent;
exports.isJobStatusRealtimeEvent = isJobStatusRealtimeEvent;
const zod_1 = require("zod");
exports.NOVEL_REALTIME_CHANNEL = 'novel.realtime.events';
exports.NOVEL_REALTIME_PROTOCOL_VERSION = 1;
const SerializedGenerationEventSchema = zod_1.z
    .object({
    type: zod_1.z.string().min(1),
    occurredAt: zod_1.z.string().min(1),
})
    .catchall(zod_1.z.unknown());
const SerializedDomainEventSchema = zod_1.z
    .object({
    type: zod_1.z.string().min(1),
    occurredAt: zod_1.z.string().min(1),
})
    .catchall(zod_1.z.unknown());
const NovelJobStatusSchema = zod_1.z.enum(['queued', 'running', 'completed', 'failed']);
const NovelRealtimeEventBaseSchema = zod_1.z.object({
    version: zod_1.z
        .number()
        .int()
        .min(1)
        .default(exports.NOVEL_REALTIME_PROTOCOL_VERSION),
    jobId: zod_1.z.string().min(1),
});
const NovelGenerationRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
    kind: zod_1.z.literal('generation'),
    event: SerializedGenerationEventSchema,
});
const NovelDomainRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
    kind: zod_1.z.literal('domain'),
    event: SerializedDomainEventSchema,
});
const NovelJobStatusRealtimeEventSchema = NovelRealtimeEventBaseSchema.extend({
    kind: zod_1.z.literal('job-status'),
    status: NovelJobStatusSchema,
    snapshot: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.NovelRealtimeEventSchema = zod_1.z.discriminatedUnion('kind', [
    NovelGenerationRealtimeEventSchema,
    NovelDomainRealtimeEventSchema,
    NovelJobStatusRealtimeEventSchema,
]);
function createGenerationRealtimeEvent(jobId, event) {
    return {
        version: exports.NOVEL_REALTIME_PROTOCOL_VERSION,
        kind: 'generation',
        jobId,
        event,
    };
}
function createDomainRealtimeEvent(jobId, event) {
    return {
        version: exports.NOVEL_REALTIME_PROTOCOL_VERSION,
        kind: 'domain',
        jobId,
        event,
    };
}
function createJobStatusRealtimeEvent(jobId, status, snapshot) {
    return {
        version: exports.NOVEL_REALTIME_PROTOCOL_VERSION,
        kind: 'job-status',
        jobId,
        status,
        ...(snapshot ? { snapshot } : {}),
    };
}
function encodeNovelRealtimeEvent(event) {
    return JSON.stringify(event);
}
function decodeNovelRealtimeEvent(payload) {
    const json = JSON.parse(payload);
    return exports.NovelRealtimeEventSchema.parse(json);
}
function isGenerationRealtimeEvent(event) {
    return event.kind === 'generation';
}
function isDomainRealtimeEvent(event) {
    return event.kind === 'domain';
}
function isJobStatusRealtimeEvent(event) {
    return event.kind === 'job-status';
}
