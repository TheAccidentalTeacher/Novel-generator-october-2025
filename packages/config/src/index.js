"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeConfig = initializeConfig;
exports.loadApiConfig = loadApiConfig;
exports.loadWorkerConfig = loadWorkerConfig;
const dotenv_1 = require("dotenv");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const MONOREPO_ROOT = node_path_1.default.resolve(__dirname, '../../..');
const DEFAULTS_FILE = node_path_1.default.resolve(__dirname, '../.env.defaults');
const ENV_VALUES = ['development', 'staging', 'production'];
const ApiEnvSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(ENV_VALUES).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1024).max(65535).default(3001),
    MONGODB_URI: zod_1.z.string().trim().min(1).optional(),
    REDIS_URL: zod_1.z.string().trim().min(1).optional(),
    OPENAI_API_KEY: zod_1.z.string().trim().min(1).optional(),
    SOCKET_CLIENT_ORIGIN: zod_1.z.string().trim().url().default('http://localhost:5173'),
    SENTRY_DSN: zod_1.z
        .string()
        .trim()
        .url({ message: 'SENTRY_DSN must be a valid URL.' })
        .optional(),
})
    .strict();
const WorkerEnvSchema = zod_1.z
    .object({
    NODE_ENV: zod_1.z.enum(ENV_VALUES).default('development'),
    MONGODB_URI: zod_1.z.string().trim().min(1).optional(),
    REDIS_URL: zod_1.z.string().trim().min(1).optional(),
    OPENAI_API_KEY: zod_1.z.string().trim().min(1).optional(),
    AI_MODEL_OVERRIDES: zod_1.z
        .string()
        .transform((value, ctx) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        try {
            const parsed = JSON.parse(trimmed);
            const recordResult = zod_1.z.record(zod_1.z.string()).safeParse(parsed);
            if (!recordResult.success) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: 'AI_MODEL_OVERRIDES must be a JSON object with string values.',
                });
                return zod_1.z.NEVER;
            }
            return recordResult.data;
        }
        catch (error) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `AI_MODEL_OVERRIDES must be valid JSON (${error.message}).`,
            });
            return zod_1.z.NEVER;
        }
    })
        .optional(),
    SENTRY_DSN: zod_1.z
        .string()
        .trim()
        .url({ message: 'SENTRY_DSN must be a valid URL.' })
        .optional(),
})
    .strict();
const NOVEL_QUEUE_NAME = 'novel-generation';
const loadedEnvFiles = new Set();
function loadEnvFile(pathToFile, override) {
    if (loadedEnvFiles.has(pathToFile)) {
        return;
    }
    if (!node_fs_1.default.existsSync(pathToFile)) {
        return;
    }
    (0, dotenv_1.config)({ path: pathToFile, override });
    loadedEnvFiles.add(pathToFile);
}
function initializeConfig(options = {}) {
    const { service = 'api', rootDir = MONOREPO_ROOT, additionalEnvFiles = [], override = false } = options;
    loadEnvFile(DEFAULTS_FILE, override);
    const rootEnvPath = node_path_1.default.resolve(rootDir, '.env');
    loadEnvFile(rootEnvPath, override);
    const serviceEnvPath = node_path_1.default.resolve(rootDir, `apps/${service}/.env`);
    loadEnvFile(serviceEnvPath, override);
    for (const envPath of additionalEnvFiles) {
        const resolved = node_path_1.default.isAbsolute(envPath) ? envPath : node_path_1.default.resolve(rootDir, envPath);
        loadEnvFile(resolved, override);
    }
}
function formatErrors(errors) {
    return errors.issues
        .map((issue) => `${issue.path.join('.') || 'CONFIG'}: ${issue.message}`)
        .join('; ');
}
function loadApiConfig(options) {
    initializeConfig({ service: 'api', ...options });
    const parsed = ApiEnvSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid API configuration: ${formatErrors(parsed.error)}`);
    }
    const env = parsed.data;
    return Object.freeze({
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        mongoUri: env.MONGODB_URI || undefined,
        redisUrl: env.REDIS_URL || undefined,
        openAiApiKey: env.OPENAI_API_KEY || undefined,
        socketClientOrigin: env.SOCKET_CLIENT_ORIGIN,
        sentryDsn: env.SENTRY_DSN || undefined,
    });
}
function loadWorkerConfig(options) {
    initializeConfig({ service: 'worker', ...options });
    const parsed = WorkerEnvSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid worker configuration: ${formatErrors(parsed.error)}`);
    }
    const env = parsed.data;
    return Object.freeze({
        nodeEnv: env.NODE_ENV,
        mongoUri: env.MONGODB_URI || undefined,
        redisUrl: env.REDIS_URL || undefined,
        openAiApiKey: env.OPENAI_API_KEY || undefined,
        modelOverrides: env.AI_MODEL_OVERRIDES,
        sentryDsn: env.SENTRY_DSN || undefined,
        novelQueueName: NOVEL_QUEUE_NAME,
    });
}
