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
exports.NovelJobMetricsModel = exports.NovelJobMetricsEntity = exports.NovelJobLatencyBreakdownEntity = exports.NovelJobTokenBreakdownEntity = exports.NovelJobCostBreakdownEntity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const typegoose_1 = require("@typegoose/typegoose");
let NovelJobCostBreakdownEntity = class NovelJobCostBreakdownEntity {
    totalUsd;
    analysisUsd;
    outlineUsd;
    chaptersUsd;
    extra;
};
exports.NovelJobCostBreakdownEntity = NovelJobCostBreakdownEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], NovelJobCostBreakdownEntity.prototype, "totalUsd", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobCostBreakdownEntity.prototype, "analysisUsd", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobCostBreakdownEntity.prototype, "outlineUsd", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobCostBreakdownEntity.prototype, "chaptersUsd", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobCostBreakdownEntity.prototype, "extra", void 0);
exports.NovelJobCostBreakdownEntity = NovelJobCostBreakdownEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false } })
], NovelJobCostBreakdownEntity);
let NovelJobTokenBreakdownEntity = class NovelJobTokenBreakdownEntity {
    total;
    analysis;
    outline;
    chapters;
    extra;
};
exports.NovelJobTokenBreakdownEntity = NovelJobTokenBreakdownEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], NovelJobTokenBreakdownEntity.prototype, "total", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobTokenBreakdownEntity.prototype, "analysis", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobTokenBreakdownEntity.prototype, "outline", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobTokenBreakdownEntity.prototype, "chapters", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobTokenBreakdownEntity.prototype, "extra", void 0);
exports.NovelJobTokenBreakdownEntity = NovelJobTokenBreakdownEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false } })
], NovelJobTokenBreakdownEntity);
let NovelJobLatencyBreakdownEntity = class NovelJobLatencyBreakdownEntity {
    analysis;
    outline;
    chapters;
    total;
    extra;
};
exports.NovelJobLatencyBreakdownEntity = NovelJobLatencyBreakdownEntity;
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobLatencyBreakdownEntity.prototype, "analysis", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobLatencyBreakdownEntity.prototype, "outline", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobLatencyBreakdownEntity.prototype, "chapters", void 0);
__decorate([
    (0, typegoose_1.prop)({ default: 0 }),
    __metadata("design:type", Number)
], NovelJobLatencyBreakdownEntity.prototype, "total", void 0);
__decorate([
    (0, typegoose_1.prop)({ allowMixed: typegoose_1.Severity.ALLOW, type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobLatencyBreakdownEntity.prototype, "extra", void 0);
exports.NovelJobLatencyBreakdownEntity = NovelJobLatencyBreakdownEntity = __decorate([
    (0, typegoose_1.modelOptions)({ schemaOptions: { _id: false, versionKey: false } })
], NovelJobLatencyBreakdownEntity);
let NovelJobMetricsEntity = class NovelJobMetricsEntity extends typegoose_1.defaultClasses.TimeStamps {
    jobId;
    cost;
    tokens;
    latencyMs;
};
exports.NovelJobMetricsEntity = NovelJobMetricsEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], NovelJobMetricsEntity.prototype, "jobId", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => NovelJobCostBreakdownEntity, _id: false, default: () => ({ totalUsd: 0 }) }),
    __metadata("design:type", NovelJobCostBreakdownEntity)
], NovelJobMetricsEntity.prototype, "cost", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => NovelJobTokenBreakdownEntity, _id: false, default: () => ({ total: 0 }) }),
    __metadata("design:type", NovelJobTokenBreakdownEntity)
], NovelJobMetricsEntity.prototype, "tokens", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => NovelJobLatencyBreakdownEntity, _id: false, default: () => ({}) }),
    __metadata("design:type", NovelJobLatencyBreakdownEntity)
], NovelJobMetricsEntity.prototype, "latencyMs", void 0);
exports.NovelJobMetricsEntity = NovelJobMetricsEntity = __decorate([
    (0, typegoose_1.modelOptions)({
        schemaOptions: { collection: 'novel_job_metrics', versionKey: false, timestamps: true },
        options: { allowMixed: typegoose_1.Severity.ALLOW },
    }),
    (0, typegoose_1.index)({ jobId: 1 }, { unique: true }),
    (0, typegoose_1.index)({ updatedAt: -1 })
], NovelJobMetricsEntity);
exports.NovelJobMetricsModel = (0, typegoose_1.getModelForClass)(NovelJobMetricsEntity);
