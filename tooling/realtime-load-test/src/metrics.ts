import { z } from 'zod';
import type { GatewayMetrics, HarnessConfig } from './types.js';

const CatchUpMetricsSchema = z.object({
  jobId: z.string(),
  replayedEvents: z.number().int().nonnegative(),
  replaySource: z.enum(['events', 'aggregate', 'none']),
  replayDurationMs: z.number().int().nonnegative(),
  recordedAt: z.string(),
});

const GatewayMetricsSchema = z.object({
  totalConnections: z.number().int().min(0),
  totalSubscriptions: z.number().int().min(0),
  connectionsPerOrigin: z.record(z.number().int().min(0)),
  subscribersPerJob: z.record(z.number().int().min(0)),
  idleClients: z.number().int().min(0),
  maxConnections: z.number().int().min(0),
  maxConnectionsPerOrigin: z.number().int().min(0),
  maxSubscriptionsPerClient: z.number().int().min(0),
  idleTimeoutMs: z.number().int().min(0),
  lastCatchUp: z.record(CatchUpMetricsSchema).default({}),
});

export class MetricsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetricsUnavailableError';
  }
}

export async function fetchGatewayMetrics(config: HarnessConfig): Promise<GatewayMetrics> {
  const metricsUrl = new URL(config.metricsPath, config.apiBaseUrl);
  const response = await fetch(metricsUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new MetricsUnavailableError(`Failed to fetch metrics (${response.status} ${response.statusText})`);
  }

  const json = (await response.json()) as unknown;
  return GatewayMetricsSchema.parse(json);
}
