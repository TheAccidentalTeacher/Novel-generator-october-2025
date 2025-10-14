import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { HarnessConfig, HarnessOptions } from './types.js';

const HarnessOptionsSchema = z
  .object({
    attempts: z.number().int().nonnegative().optional(),
    extras: z.number().int().nonnegative().optional(),
    jobCount: z.number().int().nonnegative().optional(),
    delayMs: z.number().int().nonnegative().optional(),
    settleMs: z.number().int().nonnegative().optional(),
    eventCount: z.number().int().positive().optional(),
    clientCount: z.number().int().positive().optional(),
    replayThresholdMs: z.number().int().positive().optional(),
    latencyThresholdMs: z.number().int().positive().optional(),
  redisResetSequence: z.number().int().nonnegative().optional(),
    redisResetDelayMs: z.number().int().nonnegative().optional(),
  })
  .partial();

const ConfigFileSchema = z.object({
  apiUrl: z.string().url().optional(),
  metricsPath: z.string().min(1).optional(),
  websocketPath: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
  alternateOrigin: z.string().min(1).optional(),
  connectTimeoutMs: z.number().int().positive().optional(),
  disconnectTimeoutMs: z.number().int().positive().optional(),
  verbose: z.boolean().optional(),
  redisUrl: z.string().min(1).optional(),
  mongoUri: z.string().min(1).optional(),
  options: HarnessOptionsSchema.optional(),
  scenarioOptions: z.record(z.string(), HarnessOptionsSchema).optional(),
});

export interface LoadedHarnessConfig {
  readonly config: Partial<HarnessConfig> & { readonly allowedOrigin?: string };
  readonly options: Partial<HarnessOptions>;
  readonly scenarioOptions: Record<string, Partial<HarnessOptions>>;
}

export async function loadHarnessConfig(configPath: string): Promise<LoadedHarnessConfig> {
  const resolved = resolve(configPath);
  const fileContents = await fs.readFile(resolved, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw new Error(`Failed to parse config file at ${resolved}: ${(error as Error).message}`);
  }

  const result = ConfigFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Config file validation failed: ${result.error.message}`);
  }

  const data = result.data;

  const config: Partial<HarnessConfig> & { allowedOrigin?: string } = {
    apiBaseUrl: data.apiUrl,
    metricsPath: data.metricsPath,
    websocketPath: data.websocketPath,
    allowedOrigin: data.origin,
    alternateOrigin: data.alternateOrigin,
    connectTimeoutMs: data.connectTimeoutMs,
    disconnectTimeoutMs: data.disconnectTimeoutMs,
    verbose: data.verbose,
    redisUrl: data.redisUrl,
    mongoUri: data.mongoUri,
  };

  return {
    config,
    options: data.options ?? {},
    scenarioOptions: data.scenarioOptions ?? {},
  };
}