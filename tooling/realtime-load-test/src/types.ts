export interface HarnessConfig {
  readonly apiBaseUrl: string;
  readonly websocketPath: string;
  readonly metricsPath: string;
  readonly allowedOrigin: string;
  readonly alternateOrigin?: string;
  readonly connectTimeoutMs: number;
  readonly disconnectTimeoutMs: number;
  readonly verbose: boolean;
  readonly redisUrl?: string;
  readonly mongoUri?: string;
}

export interface HarnessOptions {
  readonly attempts: number;
  readonly extras: number;
  readonly jobCount: number;
  readonly delayMs: number;
  readonly settleMs: number;
  readonly eventCount: number;
  readonly clientCount: number;
  readonly replayThresholdMs: number;
  readonly latencyThresholdMs: number;
  readonly redisResetSequence?: number;
  readonly redisResetDelayMs?: number;
}

export interface ScenarioResult {
  readonly scenario: string;
  readonly success: boolean;
  readonly summary: string;
  readonly details: Record<string, unknown>;
  readonly errors: string[];
}

export interface ScenarioDefinition {
  readonly name: string;
  readonly description: string;
  run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult>;
}

export interface GatewayCatchUpMetrics {
  readonly jobId: string;
  readonly replayedEvents: number;
  readonly replaySource: 'events' | 'aggregate' | 'none';
  readonly replayDurationMs: number;
  readonly recordedAt: string;
}

export interface GatewayMetrics {
  readonly totalConnections: number;
  readonly totalSubscriptions: number;
  readonly connectionsPerOrigin: Record<string, number>;
  readonly subscribersPerJob: Record<string, number>;
  readonly idleClients: number;
  readonly maxConnections: number;
  readonly maxConnectionsPerOrigin: number;
  readonly maxSubscriptionsPerClient: number;
  readonly idleTimeoutMs: number;
  readonly lastCatchUp: Record<string, GatewayCatchUpMetrics>;
}
