import type {
	AiDecisionInput,
	AiDecisionRecord,
	ContinuityAlertInput,
	ContinuityAlertRecord,
	NovelJobMetadata,
	NovelJobMetadataRepository,
	NovelStoryBibleCharacter,
	NovelStoryBiblePatch,
} from '@letswriteabook/domain';
import {
	NovelJobMetadataModel,
	type NovelJobMetadataDocument,
	type NovelJobMetadataModelType,
} from '../models/novel-job-metadata';
import type { StoryBibleCharacterEntity } from '../models/novel-job-metadata';
import type { ClientSession } from 'mongoose';

const CONTINUITY_ALERT_LIMIT = 100;
const AI_DECISION_LIMIT = 100;

export class MongoNovelJobMetadataRepository implements NovelJobMetadataRepository {
	public constructor(
		private readonly model: NovelJobMetadataModelType = NovelJobMetadataModel,
		private readonly session?: ClientSession,
	) {}

	public withSession(session: ClientSession): MongoNovelJobMetadataRepository {
		return new MongoNovelJobMetadataRepository(this.model, session);
	}

	public async upsertStoryBible(jobId: string, patch: NovelStoryBiblePatch): Promise<NovelJobMetadata> {
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

	public async addContinuityAlert(jobId: string, alert: ContinuityAlertInput): Promise<NovelJobMetadata> {
		const createdAt = alert.createdAt ?? new Date().toISOString();
		const alertRecord: ContinuityAlertRecord = {
			...alert,
			createdAt,
			resolved: false,
		};

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
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
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to add continuity alert for job ${jobId}`);
		}

		return mapToMetadata(doc);
	}

	public async resolveContinuityAlert(jobId: string, alertId: string, resolvedAt?: string): Promise<NovelJobMetadata> {
		const resolvedTimestamp = resolvedAt ?? new Date().toISOString();

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId, 'continuityAlerts.alertId': alertId },
				{
					$set: {
						'continuityAlerts.$.resolved': true,
						'continuityAlerts.$.resolvedAt': resolvedTimestamp,
					},
				},
				this.buildQueryOptions({ new: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Continuity alert ${alertId} could not be resolved for job ${jobId}`);
		}

		return mapToMetadata(doc);
	}

	public async appendAiDecision(jobId: string, decision: AiDecisionInput): Promise<NovelJobMetadata> {
		const decidedAt = decision.decidedAt ?? new Date().toISOString();
		const decisionRecord: AiDecisionRecord = {
			...decision,
			decidedAt,
		};

		const doc = await this.model
			.findOneAndUpdate(
				{ jobId },
				{
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
				},
				this.buildQueryOptions({ upsert: true, new: true, setDefaultsOnInsert: true }),
			)
			.exec();

		if (!doc) {
			throw new Error(`Failed to append AI decision for job ${jobId}`);
		}

		return mapToMetadata(doc);
	}

	public async getMetadata(jobId: string): Promise<NovelJobMetadata | null> {
		const query = this.model.findOne({ jobId }).lean();
		if (this.session) {
			query.session(this.session);
		}

		const doc = await query.exec();
		return doc ? mapLeanToMetadata(doc) : null;
	}

	private async findOrCreate(jobId: string): Promise<NovelJobMetadataDocument> {
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

	private buildQueryOptions<T extends Record<string, unknown>>(options: T): T & { session?: ClientSession } {
		return this.session ? { ...options, session: this.session } : options;
	}
}

function sanitizeCharacter(character: NovelStoryBibleCharacter): StoryBibleCharacterEntity {
	return {
		name: character.name,
		summary: character.summary,
		traits: character.traits ? [...character.traits] : [],
		relationships: character.relationships
			? character.relationships.map((rel) => ({ characterId: rel.characterId, description: rel.description }))
			: [],
		metadata: character.metadata ? sanitizeUnknown(character.metadata) : undefined,
	} satisfies StoryBibleCharacterEntity;
}

function sanitizeUnknown<T extends Record<string, unknown>>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function mapToMetadata(doc: NovelJobMetadataDocument): NovelJobMetadata {
	return mapLeanToMetadata(doc.toObject());
}

function mapLeanToMetadata(doc: Record<string, unknown>): NovelJobMetadata {
	const typedDoc = doc as {
		readonly jobId: string;
		readonly storyBibleCharacters?: Record<string, NovelStoryBibleCharacter>;
		readonly storyBibleMetadata?: Record<string, unknown>;
		readonly storyBibleLocations?: Record<string, unknown>;
		readonly storyBibleThemes?: string[];
		readonly continuityAlerts?: ReadonlyArray<ContinuityAlertRecord>;
		readonly aiDecisions?: ReadonlyArray<AiDecisionRecord>;
		readonly enhancements?: ReadonlyArray<Record<string, unknown>>;
		readonly performance?: Record<string, unknown>;
		readonly updatedAt?: Date | string;
	};

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
		updatedAt:
			typedDoc.updatedAt instanceof Date
				? typedDoc.updatedAt.toISOString()
				: typeof typedDoc.updatedAt === 'string'
					? typedDoc.updatedAt
					: new Date().toISOString(),
	};
}
