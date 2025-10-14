"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NovelJobMetadataModel = exports.NovelJobMetadataEntity = exports.EnhancementEntity = exports.AiDecisionEntity = exports.ContinuityAlertEntity = exports.StoryBibleCharacterEntity = exports.StoryBibleRelationshipEntity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const typegoose_1 = require("@typegoose/typegoose");
let StoryBibleRelationshipEntity = class StoryBibleRelationshipEntity {
    characterId;
    description;
};
exports.StoryBibleRelationshipEntity = StoryBibleRelationshipEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], StoryBibleRelationshipEntity.prototype, "characterId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], StoryBibleRelationshipEntity.prototype, "description", void 0);
exports.StoryBibleRelationshipEntity = StoryBibleRelationshipEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: typegoose_1.Severity.ALLOW } })
], StoryBibleRelationshipEntity);
let StoryBibleCharacterEntity = class StoryBibleCharacterEntity {
    name;
    summary;
    traits;
    relationships;
    metadata;
};
exports.StoryBibleCharacterEntity = StoryBibleCharacterEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], StoryBibleCharacterEntity.prototype, "name", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], StoryBibleCharacterEntity.prototype, "summary", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [String], default: [] }),
    __metadata("design:type", Array)
], StoryBibleCharacterEntity.prototype, "traits", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [StoryBibleRelationshipEntity], default: [] }),
    __metadata("design:type", Array)
], StoryBibleCharacterEntity.prototype, "relationships", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], StoryBibleCharacterEntity.prototype, "metadata", void 0);
exports.StoryBibleCharacterEntity = StoryBibleCharacterEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: typegoose_1.Severity.ALLOW } })
], StoryBibleCharacterEntity);
let ContinuityAlertEntity = class ContinuityAlertEntity {
    alertId;
    title;
    message;
    severity;
    createdAt;
    resolved;
    resolvedAt;
    context;
};
exports.ContinuityAlertEntity = ContinuityAlertEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "alertId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "title", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "message", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true, enum: ['info', 'warning', 'critical'] }),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "severity", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: false }),
    __metadata("design:type", Boolean)
], ContinuityAlertEntity.prototype, "resolved", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], ContinuityAlertEntity.prototype, "resolvedAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], ContinuityAlertEntity.prototype, "context", void 0);
exports.ContinuityAlertEntity = ContinuityAlertEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: typegoose_1.Severity.ALLOW } })
], ContinuityAlertEntity);
let AiDecisionEntity = class AiDecisionEntity {
    decisionId;
    type;
    decidedAt;
    summary;
    confidence;
    impact;
    metadata;
};
exports.AiDecisionEntity = AiDecisionEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], AiDecisionEntity.prototype, "decisionId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], AiDecisionEntity.prototype, "type", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], AiDecisionEntity.prototype, "decidedAt", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], AiDecisionEntity.prototype, "summary", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", Number)
], AiDecisionEntity.prototype, "confidence", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], AiDecisionEntity.prototype, "impact", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], AiDecisionEntity.prototype, "metadata", void 0);
exports.AiDecisionEntity = AiDecisionEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: typegoose_1.Severity.ALLOW } })
], AiDecisionEntity);
let EnhancementEntity = class EnhancementEntity {
    enhancementId;
    createdAt;
    data;
};
exports.EnhancementEntity = EnhancementEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], EnhancementEntity.prototype, "enhancementId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], EnhancementEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], EnhancementEntity.prototype, "data", void 0);
exports.EnhancementEntity = EnhancementEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false }, options: { allowMixed: typegoose_1.Severity.ALLOW } })
], EnhancementEntity);
let NovelJobMetadataEntity = class NovelJobMetadataEntity extends typegoose_1.defaultClasses.TimeStamps {
    jobId;
    storyBibleCharacters;
    storyBibleMetadata;
    storyBibleLocations;
    storyBibleThemes;
    continuityAlerts;
    aiDecisions;
    enhancements;
    performance;
};
exports.NovelJobMetadataEntity = NovelJobMetadataEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], NovelJobMetadataEntity.prototype, "jobId", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed, default: () => ({}) }),
    __metadata("design:type", Object)
], NovelJobMetadataEntity.prototype, "storyBibleCharacters", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobMetadataEntity.prototype, "storyBibleMetadata", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobMetadataEntity.prototype, "storyBibleLocations", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [String], default: [] }),
    __metadata("design:type", Array)
], NovelJobMetadataEntity.prototype, "storyBibleThemes", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [ContinuityAlertEntity], default: [] }),
    __metadata("design:type", Array)
], NovelJobMetadataEntity.prototype, "continuityAlerts", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [AiDecisionEntity], default: [] }),
    __metadata("design:type", Array)
], NovelJobMetadataEntity.prototype, "aiDecisions", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [EnhancementEntity], default: [] }),
    __metadata("design:type", Array)
], NovelJobMetadataEntity.prototype, "enhancements", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobMetadataEntity.prototype, "performance", void 0);
exports.NovelJobMetadataEntity = NovelJobMetadataEntity = __decorate([
    (0, typegoose_1.modelOptions)({
        schemaOptions: { collection: 'novel_job_metadata', versionKey: false, timestamps: true },
        options: { allowMixed: typegoose_1.Severity.ALLOW },
    }),
    (0, typegoose_1.index)({ jobId: 1 }, { unique: true }),
    (0, typegoose_1.index)({ jobId: 1, 'continuityAlerts.resolved': 1 })
], NovelJobMetadataEntity);
exports.NovelJobMetadataModel = (0, typegoose_1.getModelForClass)(NovelJobMetadataEntity);
