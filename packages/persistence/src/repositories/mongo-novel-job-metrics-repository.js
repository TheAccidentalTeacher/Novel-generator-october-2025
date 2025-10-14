"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoNovelJobMetricsRepository = void 0;
const novel_job_metrics_1 = require("../models/novel-job-metrics");
class MongoNovelJobMetricsRepository {
    model;
    session;
    constructor(model = novel_job_metrics_1.NovelJobMetricsModel, session) {
        this.model = model;
        this.session = session;
    }
    withSession(session) {
        return new MongoNovelJobMetricsRepository(this.model, session);
    }
    async incrementCosts(jobId, delta) {
        const inc = buildIncrementPayload('cost', delta);
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $inc: inc,
            $setOnInsert: {
                jobId,
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to increment cost metrics for job ${jobId}`);
        }
        return mapToMetrics(doc);
    }
    async incrementTokens(jobId, delta) {
        const inc = buildIncrementPayload('tokens', delta);
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $inc: inc,
            $setOnInsert: {
                jobId,
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to increment token metrics for job ${jobId}`);
        }
        return mapToMetrics(doc);
    }
    async updateLatency(jobId, delta) {
        const inc = buildIncrementPayload('latencyMs', delta);
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $inc: inc,
            $setOnInsert: {
                jobId,
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to update latency metrics for job ${jobId}`);
        }
        return mapToMetrics(doc);
    }
    async reset(jobId) {
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $set: {
                cost: { totalUsd: 0, analysisUsd: 0, outlineUsd: 0, chaptersUsd: 0 },
                tokens: { total: 0, analysis: 0, outline: 0, chapters: 0 },
                latencyMs: {},
            },
            $setOnInsert: {
                jobId,
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to reset metrics for job ${jobId}`);
        }
        return mapToMetrics(doc);
    }
    async getMetrics(jobId) {
        const query = this.model.findOne({ jobId }).lean();
        if (this.session) {
            query.session(this.session);
        }
        const doc = await query.exec();
        return doc ? mapLeanToMetrics(doc) : null;
    }
    buildQueryOptions(options) {
        return this.session ? { ...options, session: this.session } : options;
    }
}
exports.MongoNovelJobMetricsRepository = MongoNovelJobMetricsRepository;
function buildIncrementPayload(prefix, delta) {
    return Object.entries(delta).reduce((acc, [key, value]) => {
        if (value === undefined || value === 0) {
            return acc;
        }
        acc[`${prefix}.${key}`] = value;
        return acc;
    }, {});
}
function mapToMetrics(doc) {
    return {
        jobId: doc.jobId,
        cost: sanitizeUnknownBreakdown(doc.cost),
        tokens: sanitizeUnknownBreakdown(doc.tokens),
        latencyMs: sanitizeUnknownBreakdown(doc.latencyMs),
        updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
}
function mapLeanToMetrics(doc) {
    const typedDoc = doc;
    return {
        jobId: typedDoc.jobId,
        cost: sanitizeUnknownBreakdown(typedDoc.cost),
        tokens: sanitizeUnknownBreakdown(typedDoc.tokens),
        latencyMs: sanitizeUnknownBreakdown(typedDoc.latencyMs),
        updatedAt: typedDoc.updatedAt instanceof Date
            ? typedDoc.updatedAt.toISOString()
            : typeof typedDoc.updatedAt === 'string'
                ? typedDoc.updatedAt
                : new Date().toISOString(),
    };
}
function sanitizeUnknownBreakdown(value) {
    const sanitized = JSON.parse(JSON.stringify(value ?? {}));
    return Object.entries(sanitized).reduce((acc, [key, entry]) => {
        if (typeof entry === 'number') {
            acc[key] = entry;
        }
        return acc;
    }, {});
}
