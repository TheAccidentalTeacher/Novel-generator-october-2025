"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoNovelJobEventRepository = void 0;
const novel_job_event_1 = require("../models/novel-job-event");
class MongoNovelJobEventRepository {
    model;
    session;
    constructor(model = novel_job_event_1.NovelJobEventModel, session) {
        this.model = model;
        this.session = session;
    }
    withSession(session) {
        return new MongoNovelJobEventRepository(this.model, session);
    }
    async append(event) {
        const emittedAt = event.emittedAt ?? new Date().toISOString();
        await this.model.create([
            {
                jobId: event.jobId,
                kind: event.kind,
                emittedAt,
                event: event.kind === 'job-status' ? undefined : event.event,
                status: event.kind === 'job-status' ? event.status : undefined,
                snapshot: event.kind === 'job-status' ? event.snapshot ?? undefined : undefined,
            },
        ], this.session ? { session: this.session } : undefined);
    }
    async list(jobId, options = {}) {
        const limit = Math.max(1, options.limit ?? 50);
        const filter = { jobId };
        if (options.before) {
            filter.emittedAt = { $lt: options.before };
        }
        const query = this.model.find(filter).sort({ emittedAt: -1 }).limit(limit).lean();
        if (this.session) {
            query.session(this.session);
        }
        const docs = await query.exec();
        return docs.map((doc) => mapToRecord(doc));
    }
}
exports.MongoNovelJobEventRepository = MongoNovelJobEventRepository;
function mapToRecord(doc) {
    if (doc.kind === 'generation') {
        return {
            kind: 'generation',
            jobId: doc.jobId,
            emittedAt: doc.emittedAt,
            event: doc.event,
        };
    }
    if (doc.kind === 'domain') {
        return {
            kind: 'domain',
            jobId: doc.jobId,
            emittedAt: doc.emittedAt,
            event: doc.event,
        };
    }
    return {
        kind: 'job-status',
        jobId: doc.jobId,
        emittedAt: doc.emittedAt,
        status: (doc.status ?? 'queued'),
        snapshot: sanitizeSnapshot(doc.snapshot),
    };
}
function sanitizeSnapshot(snapshot) {
    if (!snapshot) {
        return undefined;
    }
    return JSON.parse(JSON.stringify(snapshot));
}
