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
exports.NovelJobEventModel = exports.NovelJobEventEntity = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const typegoose_1 = require("@typegoose/typegoose");
let NovelJobEventEntity = class NovelJobEventEntity extends typegoose_1.defaultClasses.TimeStamps {
    jobId;
    kind;
    emittedAt;
    event;
    status;
    snapshot;
};
exports.NovelJobEventEntity = NovelJobEventEntity;
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobEventEntity.prototype, "jobId", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true, enum: ['generation', 'domain', 'job-status'] }),
    __metadata("design:type", String)
], NovelJobEventEntity.prototype, "kind", void 0);
__decorate([
    (0, typegoose_1.prop)({ required: true }),
    __metadata("design:type", String)
], NovelJobEventEntity.prototype, "emittedAt", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEventEntity.prototype, "event", void 0);
__decorate([
    (0, typegoose_1.prop)({ enum: ['queued', 'running', 'completed', 'failed'] }),
    __metadata("design:type", String)
], NovelJobEventEntity.prototype, "status", void 0);
__decorate([
    (0, typegoose_1.prop)({ type: () => mongoose_1.default.Schema.Types.Mixed }),
    __metadata("design:type", Object)
], NovelJobEventEntity.prototype, "snapshot", void 0);
exports.NovelJobEventEntity = NovelJobEventEntity = __decorate([
    (0, typegoose_1.modelOptions)({
        schemaOptions: { collection: 'novel_job_events', versionKey: false, timestamps: true },
        options: { allowMixed: typegoose_1.Severity.ALLOW },
    }),
    (0, typegoose_1.index)({ jobId: 1, emittedAt: -1 }),
    (0, typegoose_1.index)({ jobId: 1, kind: 1, emittedAt: -1 })
], NovelJobEventEntity);
exports.NovelJobEventModel = (0, typegoose_1.getModelForClass)(NovelJobEventEntity);
