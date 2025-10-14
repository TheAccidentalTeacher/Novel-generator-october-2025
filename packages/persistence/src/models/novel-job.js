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
exports.NovelJobModel = exports.NovelJobEntity = exports.NovelJobFailureEntity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const typegoose_1 = require("@typegoose/typegoose");
let NovelJobFailureEntity = class NovelJobFailureEntity {
    occurredAt;
    reason;
    stage;
    metadata;
};
exports.NovelJobFailureEntity = NovelJobFailureEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobFailureEntity.prototype, "occurredAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobFailureEntity.prototype, "reason", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], NovelJobFailureEntity.prototype, "stage", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobFailureEntity.prototype, "metadata", void 0);
exports.NovelJobFailureEntity = NovelJobFailureEntity = __decorate([
    (0, typegoose_1.modelOptions)({
        schemaOptions: { _id: false, versionKey: false },
        options: { allowMixed: typegoose_1.Severity.ALLOW },
    })
], NovelJobFailureEntity);
let NovelJobEntity = class NovelJobEntity extends typegoose_1.defaultClasses.TimeStamps {
    jobId;
    queue;
    status;
    payload;
    requestedAt;
    receivedAt;
    startedAt;
    completedAt;
    durationMs;
    analysis;
    outline;
    chapters;
    context;
    summary;
    engine;
    events;
    domainEvents;
    failures;
};
exports.NovelJobEntity = NovelJobEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "jobId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "queue", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true, enum: ['queued', 'running', 'completed', 'failed'] }),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "status", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "payload", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "requestedAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "receivedAt", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "startedAt", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", String)
], NovelJobEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typegoose_1.prop)(),
    __metadata("design:type", Number)
], NovelJobEntity.prototype, "durationMs", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "analysis", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [mongoose_1.default.Schema.Types.Mixed], default: [] }),
    __metadata("design:type", Array)
], NovelJobEntity.prototype, "outline", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [mongoose_1.default.Schema.Types.Mixed], default: [] }),
    __metadata("design:type", Array)
], NovelJobEntity.prototype, "chapters", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "context", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "summary", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEntity.prototype, "engine", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [mongoose_1.default.Schema.Types.Mixed], default: [] }),
    __metadata("design:type", Array)
], NovelJobEntity.prototype, "events", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [mongoose_1.default.Schema.Types.Mixed], default: [] }),
    __metadata("design:type", Array)
], NovelJobEntity.prototype, "domainEvents", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => [NovelJobFailureEntity], default: [] }),
    __metadata("design:type", Array)
], NovelJobEntity.prototype, "failures", void 0);
exports.NovelJobEntity = NovelJobEntity = __decorate([
    (0, typegoose_1.modelOptions)({
        schemaOptions: { collection: 'novel_jobs', timestamps: true, versionKey: false },
        options: { allowMixed: typegoose_1.Severity.ALLOW },
    }),
    (0, typegoose_1.index)({ jobId: 1 }, { unique: true }),
    (0, typegoose_1.index)({ status: 1, createdAt: -1 })
], NovelJobEntity);
exports.NovelJobModel = (0, typegoose_1.getModelForClass)(NovelJobEntity);
