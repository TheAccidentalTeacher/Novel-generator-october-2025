import { config as loadEnvConfig } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const MONOREPO_ROOT = path.resolve(__dirname, '../../..');
const DEFAULTS_FILE = path.resolve(__dirname, '../.env.defaults');
const ENV_VALUES = ['development', 'staging', 'production'] as const;
const DEFAULT_API_LOG_LEVELS: readonly ApiLogLevel[] = ['log', 'error', 'warn'];
const DEFAULT_WORKER_LOG_LEVELS: readonly WorkerLogLevel[] = ['info', 'warn', 'error'];

type EnvName = (typeof ENV_VALUES)[number];
type Service = 'api' | 'worker';

const API_LOG_LEVEL_VALUES = ['log', 'error', 'warn', 'debug', 'verbose'] as const;
type ApiLogLevel = (typeof API_LOG_LEVEL_VALUES)[number];

const WORKER_LOG_LEVEL_VALUES = ['info', 'warn', 'error', 'debug'] as const;
type WorkerLogLevel = (typeof WORKER_LOG_LEVEL_VALUES)[number];

interface InitializeOptions {
  readonly service?: Service;
  readonly rootDir?: string;
  readonly additionalEnvFiles?: readonly string[];
  readonly override?: boolean;
}

interface ApiConfig {
  readonly nodeEnv: EnvName;
  readonly port: number;
  readonly mongoUri?: string;
  readonly redisUrl?: string;
  readonly openAiApiKey?: string;
  readonly socketClientOrigin: string;
  readonly sentryDsn?: string;
  readonly novelQueueName: string;
  readonly socketMaxConnections: number;
  readonly socketMaxConnectionsPerOrigin: number;
  readonly socketMaxSubscriptionsPerClient: number;
  readonly socketIdleTimeoutMs: number;
  readonly loggerLevels: readonly ApiLogLevel[];
}

interface WorkerConfig {
  readonly nodeEnv: EnvName;
  readonly mongoUri?: string;
  readonly redisUrl?: string;
  readonly openAiApiKey?: string;
  readonly modelOverrides?: Record<string, string>;
  readonly sentryDsn?: string;
  readonly novelQueueName: string;
  readonly loggerLevels: readonly WorkerLogLevel[];
}

const ApiEnvSchema = z
  .object({
    NODE_ENV: z.enum(ENV_VALUES).default('development'),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
    MONGODB_URI: z.string().trim().min(1).optional(),
    REDIS_URL: z.string().trim().min(1).optional(),
    OPENAI_API_KEY: z.string().trim().min(1).optional(),
    SOCKET_CLIENT_ORIGIN: z
      .union([
        z.literal('*'),
        z.string().trim().url({ message: 'SOCKET_CLIENT_ORIGIN must be a valid URL or *.' }),
      ])
      .default('http://localhost:5173'),
    SOCKET_MAX_CONNECTIONS: z.coerce.number().int().min(0).default(0),
    SOCKET_MAX_CONNECTIONS_PER_ORIGIN: z.coerce.number().int().min(0).default(0),
    SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT: z.coerce.number().int().min(1).default(20),
    SOCKET_IDLE_TIMEOUT_MS: z.coerce.number().int().min(0).default(5 * 60 * 1000),
    SENTRY_DSN: z
      .string()
      .trim()
      .url({ message: 'SENTRY_DSN must be a valid URL.' })
      .optional(),
    API_LOG_LEVELS: z.string().trim().optional(),
  })
  .strict();

const WorkerEnvSchema = z
  .object({
    NODE_ENV: z.enum(ENV_VALUES).default('development'),
    MONGODB_URI: z.string().trim().min(1).optional(),
    REDIS_URL: z.string().trim().min(1).optional(),
    OPENAI_API_KEY: z.string().trim().min(1).optional(),
    AI_MODEL_OVERRIDES: z
      .string()
      .transform((value, ctx) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return undefined;
        }

        try {
          const parsed = JSON.parse(trimmed);
          const recordResult = z.record(z.string()).safeParse(parsed);
          if (!recordResult.success) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'AI_MODEL_OVERRIDES must be a JSON object with string values.',
            });
            return z.NEVER;
          }

          return recordResult.data;
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `AI_MODEL_OVERRIDES must be valid JSON (${(error as Error).message}).`,
          });
          return z.NEVER;
        }
      })
      .optional(),
    SENTRY_DSN: z
      .string()
      .trim()
      .url({ message: 'SENTRY_DSN must be a valid URL.' })
      .optional(),
    WORKER_LOG_LEVELS: z.string().trim().optional(),
  })
  .strict();

export const NOVEL_QUEUE_NAME = 'novel-generation';

const API_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'REDIS_URL',
  'OPENAI_API_KEY',
  'SOCKET_CLIENT_ORIGIN',
  'SOCKET_MAX_CONNECTIONS',
  'SOCKET_MAX_CONNECTIONS_PER_ORIGIN',
  'SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT',
  'SOCKET_IDLE_TIMEOUT_MS',
  'SENTRY_DSN',
  'API_LOG_LEVELS',
] as const;

type ApiEnvKey = (typeof API_ENV_KEYS)[number];

const WORKER_ENV_KEYS = [
  'NODE_ENV',
  'MONGODB_URI',
  'REDIS_URL',
  'OPENAI_API_KEY',
  'AI_MODEL_OVERRIDES',
  'SENTRY_DSN',
  'WORKER_LOG_LEVELS',
] as const;

type WorkerEnvKey = (typeof WORKER_ENV_KEYS)[number];

export interface RedisConnectionOptions {
  readonly host: string;
  readonly port: number;
  readonly username?: string;
  readonly password?: string;
  readonly db?: number;
  readonly tls?: import('tls').TlsOptions;
}

export function parseRedisUrl(connectionString: string): RedisConnectionOptions {
  const url = new URL(connectionString);

  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`Unsupported Redis protocol "${url.protocol}". Expected redis:// or rediss://`);
  }

  return {
    host: url.hostname,
    port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'rediss:' ? 6380 : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname.length > 1 ? Number.parseInt(url.pathname.slice(1), 10) : undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  } satisfies RedisConnectionOptions;
}
const loadedEnvFiles = new Set<string>();

function loadEnvFile(pathToFile: string, override: boolean): void {
  if (loadedEnvFiles.has(pathToFile)) {
    return;
  }

  if (!fs.existsSync(pathToFile)) {
    return;
  }

  loadEnvConfig({ path: pathToFile, override });
  loadedEnvFiles.add(pathToFile);
}

export function initializeConfig(options: InitializeOptions = {}): void {
  const { service = 'api', rootDir = MONOREPO_ROOT, additionalEnvFiles = [], override = false } = options;

  loadEnvFile(DEFAULTS_FILE, override);

  const rootEnvPath = path.resolve(rootDir, '.env');
  loadEnvFile(rootEnvPath, override);

  let envName = process.env.NODE_ENV?.trim();
  if (envName) {
    const rootEnvVariantPath = path.resolve(rootDir, `.env.${envName}`);
    loadEnvFile(rootEnvVariantPath, true);
  }

  const serviceEnvPath = path.resolve(rootDir, `apps/${service}/.env`);
  loadEnvFile(serviceEnvPath, override);

  // If NODE_ENV is set, also attempt to load a service-level variant like apps/{service}/.env.staging
  envName = process.env.NODE_ENV?.trim() ?? envName;
  if (envName) {
    const serviceEnvVariantPath = path.resolve(rootDir, `apps/${service}/.env.${envName}`);
    loadEnvFile(serviceEnvVariantPath, true);
  }

  for (const envPath of additionalEnvFiles) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(rootDir, envPath);
    loadEnvFile(resolved, override);
  }
}

function formatErrors(errors: z.ZodError): string {
  return errors.issues
    .map((issue) => `${issue.path.join('.') || 'CONFIG'}: ${issue.message}`)
    .join('; ');
}

function parseLoggerLevels<T extends string>(
  raw: string | undefined,
  allowedValues: readonly T[],
  fallback: readonly T[],
  label: string,
): readonly T[] {
  if (!raw) {
    return fallback;
  }

  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0) as T[];

  if (parsed.length === 0) {
    return fallback;
  }

  const invalid = parsed.filter((value) => !allowedValues.includes(value));
  if (invalid.length > 0) {
    throw new Error(`${label} contains invalid values: ${invalid.join(', ')}`);
  }

  return Array.from(new Set(parsed));
}

export function loadApiConfig(options?: InitializeOptions): ApiConfig {
  initializeConfig({ service: 'api', ...options });

  const envInput = Object.fromEntries(
    API_ENV_KEYS.map((key) => [key, process.env[key] ?? undefined]),
  ) as Record<ApiEnvKey, string | undefined>;

  const parsed = ApiEnvSchema.safeParse(envInput);
  if (!parsed.success) {
    throw new Error(`Invalid API configuration: ${formatErrors(parsed.error)}`);
  }

  const env = parsed.data;
  let loggerLevels: readonly ApiLogLevel[];
  try {
    loggerLevels = parseLoggerLevels(env.API_LOG_LEVELS, API_LOG_LEVEL_VALUES, DEFAULT_API_LOG_LEVELS, 'API_LOG_LEVELS');
  } catch (error) {
    throw new Error(`Invalid API configuration: ${(error as Error).message}`);
  }

  return Object.freeze({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    mongoUri: env.MONGODB_URI || undefined,
    redisUrl: env.REDIS_URL || undefined,
    openAiApiKey: env.OPENAI_API_KEY || undefined,
    socketClientOrigin: env.SOCKET_CLIENT_ORIGIN,
    sentryDsn: env.SENTRY_DSN || undefined,
    novelQueueName: NOVEL_QUEUE_NAME,
    socketMaxConnections: env.SOCKET_MAX_CONNECTIONS,
    socketMaxConnectionsPerOrigin: env.SOCKET_MAX_CONNECTIONS_PER_ORIGIN,
    socketMaxSubscriptionsPerClient: env.SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT,
    socketIdleTimeoutMs: env.SOCKET_IDLE_TIMEOUT_MS,
    loggerLevels,
  });
}

export function loadWorkerConfig(options?: InitializeOptions): WorkerConfig {
  initializeConfig({ service: 'worker', ...options });

  const envInput = Object.fromEntries(
    WORKER_ENV_KEYS.map((key) => [key, process.env[key] ?? undefined]),
  ) as Record<WorkerEnvKey, string | undefined>;

  const parsed = WorkerEnvSchema.safeParse(envInput);
  if (!parsed.success) {
    throw new Error(`Invalid worker configuration: ${formatErrors(parsed.error)}`);
  }

  const env = parsed.data;
  let loggerLevels: readonly WorkerLogLevel[];
  try {
    loggerLevels = parseLoggerLevels(
      env.WORKER_LOG_LEVELS,
      WORKER_LOG_LEVEL_VALUES,
      DEFAULT_WORKER_LOG_LEVELS,
      'WORKER_LOG_LEVELS',
    );
  } catch (error) {
    throw new Error(`Invalid worker configuration: ${(error as Error).message}`);
  }

  return Object.freeze({
    nodeEnv: env.NODE_ENV,
    mongoUri: env.MONGODB_URI || undefined,
    redisUrl: env.REDIS_URL || undefined,
    openAiApiKey: env.OPENAI_API_KEY || undefined,
    modelOverrides: env.AI_MODEL_OVERRIDES,
    sentryDsn: env.SENTRY_DSN || undefined,
    novelQueueName: NOVEL_QUEUE_NAME,
    loggerLevels,
  });
}

export type { ApiConfig, WorkerConfig };
