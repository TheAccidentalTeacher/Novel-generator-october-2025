"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoNovelJobMetadataRepository = void 0;
const novel_job_metadata_1 = require("../models/novel-job-metadata");
const CONTINUITY_ALERT_LIMIT = 100;
const AI_DECISION_LIMIT = 100;
class MongoNovelJobMetadataRepository {
    model;
    session;
    constructor(model = novel_job_metadata_1.NovelJobMetadataModel, session) {
        this.model = model;
        this.session = session;
    }
    withSession(session) {
        return new MongoNovelJobMetadataRepository(this.model, session);
    }
    async upsertStoryBible(jobId, patch) {
        const document = await this.findOrCreate(jobId);
        document.storyBibleCharacters = document.storyBibleCharacters ?? {};
        if (patch.characters) {
            for (const [characterId, character] of Object.entries(patch.characters)) {
                document.storyBibleCharacters[characterId] = sanitizeCharacter(character);
            }
        }
        if (patch.removeCharacters) {
            for (const characterId of patch.removeCharacters) {
                delete document.storyBibleCharacters[characterId];
            }
        }
        if (patch.metadata) {
            document.storyBibleMetadata = {
                ...(document.storyBibleMetadata ?? {}),
                ...sanitizeUnknown(patch.metadata),
            };
        }
        if (patch.locations) {
            document.storyBibleLocations = {
                ...(document.storyBibleLocations ?? {}),
                ...sanitizeUnknown(patch.locations),
            };
        }
        if (patch.themes) {
            const existingThemes = new Set(document.storyBibleThemes ?? []);
            for (const theme of patch.themes) {
                existingThemes.add(theme);
            }
            document.storyBibleThemes = Array.from(existingThemes);
        }
        document.markModified('storyBibleCharacters');
        if (patch.metadata) {
            document.markModified('storyBibleMetadata');
        }
        if (patch.locations) {
            document.markModified('storyBibleLocations');
        }
        if (patch.themes) {
            document.markModified('storyBibleThemes');
        }
        if (this.session) {
            document.$session(this.session);
        }
        await document.save(this.session ? { session: this.session } : undefined);
        return mapToMetadata(document);
    }
    async addContinuityAlert(jobId, alert) {
        const createdAt = alert.createdAt ?? new Date().toISOString();
        const alertRecord = {
            ...alert,
            createdAt,
            resolved: false,
        };
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $push: {
                continuityAlerts: {
                    $each: [alertRecord],
                    $position: 0,
                    $slice: CONTINUITY_ALERT_LIMIT,
                },
            },
            $setOnInsert: {
                jobId,
                storyBibleCharacters: {},
                storyBibleThemes: [],
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to add continuity alert for job ${jobId}`);
        }
        return mapToMetadata(doc);
    }
    async resolveContinuityAlert(jobId, alertId, resolvedAt) {
        const resolvedTimestamp = resolvedAt ?? new Date().toISOString();
        const doc = await this.model
            .findOneAndUpdate({ jobId, 'continuityAlerts.alertId': alertId }, {
            $set: {
                'continuityAlerts.$.resolved': true,
                'continuityAlerts.$.resolvedAt': resolvedTimestamp,
            },
        }, this.buildQueryOptions({ new: true }))
            .exec();
        if (!doc) {
            throw new Error(`Continuity alert ${alertId} could not be resolved for job ${jobId}`);
        }
        return mapToMetadata(doc);
    }
    async appendAiDecision(jobId, decision) {
        const decidedAt = decision.decidedAt ?? new Date().toISOString();
        const decisionRecord = {
            ...decision,
            decidedAt,
        };
        const doc = await this.model
            .findOneAndUpdate({ jobId }, {
            $push: {
                aiDecisions: {
                    $each: [decisionRecord],
                    $position: 0,
                    $slice: AI_DECISION_LIMIT,
                },
            },
            $setOnInsert: {
                jobId,
                storyBibleCharacters: {},
                storyBibleThemes: [],
            },
        }, this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }))
            .exec();
        if (!doc) {
            throw new Error(`Failed to append AI decision for job ${jobId}`);
        }
        return mapToMetadata(doc);
    }
    async getMetadata(jobId) {
        const query = this.model.findOne({ jobId }).lean();
        if (this.session) {
            query.session(this.session);
        }
        const doc = await query.exec();
        return doc ? mapLeanToMetadata(doc) : null;
    }
    async findOrCreate(jobId) {
        const findQuery = this.model.findOne({ jobId });
        if (this.session) {
            findQuery.session(this.session);
        }
        const existing = await findQuery.exec();
        if (existing) {
            return existing;
        }
        const [created] = await this.model.create([
            {
                jobId,
                storyBibleCharacters: {},
                storyBibleThemes: [],
            },
        ], this.session ? { session: this.session } : undefined);
        return created;
    }
    buildQueryOptions(options) {
        return this.session ? { ...options, session: this.session } : options;
    }
}
exports.MongoNovelJobMetadataRepository = MongoNovelJobMetadataRepository;
function sanitizeCharacter(character) {
    return {
        name: character.name,
        summary: character.summary,
        traits: character.traits ? [...character.traits] : [],
        relationships: character.relationships
            ? character.relationships.map((rel) => ({ characterId: rel.characterId, description: rel.description }))
            : [],
        metadata: character.metadata ? sanitizeUnknown(character.metadata) : undefined,
    };
}
function sanitizeUnknown(value) {
    return JSON.parse(JSON.stringify(value));
}
function mapToMetadata(doc) {
    return mapLeanToMetadata(doc.toObject());
}
function mapLeanToMetadata(doc) {
    const typedDoc = doc;
    return {
        jobId: typedDoc.jobId,
        storyBible: {
            characters: sanitizeUnknown(typedDoc.storyBibleCharacters ?? {}),
            metadata: typedDoc.storyBibleMetadata ? sanitizeUnknown(typedDoc.storyBibleMetadata) : undefined,
            locations: typedDoc.storyBibleLocations ? sanitizeUnknown(typedDoc.storyBibleLocations) : undefined,
            themes: typedDoc.storyBibleThemes ? [...typedDoc.storyBibleThemes] : undefined,
        },
        continuityAlerts: (typedDoc.continuityAlerts ?? []).map((alert) => ({
            ...alert,
            context: alert.context ? sanitizeUnknown(alert.context) : undefined,
        })),
        aiDecisions: (typedDoc.aiDecisions ?? []).map((decision) => ({
            ...decision,
            metadata: decision.metadata ? sanitizeUnknown(decision.metadata) : undefined,
        })),
        enhancements: typedDoc.enhancements ? typedDoc.enhancements.map((enhancement) => sanitizeUnknown(enhancement)) : undefined,
        performance: typedDoc.performance ? sanitizeUnknown(typedDoc.performance) : undefined,
        updatedAt: typedDoc.updatedAt instanceof Date
            ? typedDoc.updatedAt.toISOString()
            : typeof typedDoc.updatedAt === 'string'
                ? typedDoc.updatedAt
                : new Date().toISOString(),
    };
}
