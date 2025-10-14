import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { once } from 'node:events';
import type { Socket } from 'socket.io-client';
import {
  NOVEL_REALTIME_CHANNEL,
  createGenerationRealtimeEvent,
  encodeNovelRealtimeEvent,
} from '@letswriteabook/messaging';
import type { SerializedGenerationEvent } from '@letswriteabook/shared-types';
import type { Redis as RedisClient } from 'ioredis';
import { fetchGatewayMetrics } from '../metrics.js';
import type { HarnessConfig, HarnessOptions, ScenarioDefinition, ScenarioResult } from '../types.js';
import { logInfo, logWarn } from '../utils/log.js';
import { performConnectionAttempts, teardownConnections } from '../utils/connections.js';
import { createRedisPublisher, closeRedisPublisher } from '../utils/redis.js';
import { attemptSubscription, cleanupSubscriptions } from '../utils/subscriptions.js';
import { sleep } from '../utils/sleep.js';
import { average, percentile } from '../utils/statistics.js';

const GENERATION_EVENT = 'novel.generation-event';
const ERROR_EVENT = 'novel.error';

interface BroadcastResultDetail {
  readonly socketId: string;
  readonly latencies: number[];
}

interface BroadcastAttemptSummary {
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly totalDeliveries: number;
  readonly expectedDeliveries: number;
}

export const broadcastBurstScenario: ScenarioDefinition = {
  name: 'broadcast-burst',
  description:
    'Opens a swarm of websocket clients, publishes realtime events via Redis, and validates broadcast latency within the configured budget.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    if (!config.redisUrl) {
      return {
        scenario: this.name,
        success: false,
        summary: 'Redis URL is required for broadcast validation.',
        details: {},
        errors: ['redis-url option must be provided for broadcast-burst'],
      };
    }

    const clientCount = options.clientCount > 0 ? options.clientCount : 200;
    const eventCount = options.eventCount > 0 ? options.eventCount : 50;
    const latencyThreshold = options.latencyThresholdMs > 0 ? options.latencyThresholdMs : 500;
    const jobId = `load-test-broadcast-${randomUUID()}`;

    const metricsBefore = await fetchGatewayMetrics(config);

    const publisher = await createRedisPublisher(config.redisUrl);
    const { details: connectionDetails, sockets } = await performConnectionAttempts(config, options, clientCount);

    if (sockets.length < clientCount) {
      await teardownConnections(sockets, config.disconnectTimeoutMs);
      await closeRedisPublisher(publisher);

      return {
        scenario: this.name,
        success: false,
        summary: `Only ${sockets.length}/${clientCount} clients connected successfully; expected full swarm before broadcasting.`,
        details: {
          clientCount,
          connectionDetails,
          metricsBefore,
        },
        errors: ['Insufficient clients connected to evaluate broadcast latency.'],
      };
    }

    logInfo(`Connected ${sockets.length} clients. Subscribing to synthetic job ${jobId}.`);

    const subscriptionResults = await Promise.all(
      sockets.map((socket) => attemptSubscription(socket, jobId, config.connectTimeoutMs, config.verbose)),
    );

    const failedSubscriptions = subscriptionResults.filter((result) => !result.success);
    if (failedSubscriptions.length > 0) {
      await cleanupAllSubscriptions(sockets, jobId, config);
      await teardownConnections(sockets, config.disconnectTimeoutMs);
      await closeRedisPublisher(publisher);

      return {
        scenario: this.name,
        success: false,
        summary: `Failed to subscribe ${failedSubscriptions.length} clients; broadcast not executed.`,
        details: {
          clientCount,
          subscriptionResults,
          metricsBefore,
        },
        errors: failedSubscriptions.map((result) => result.message ?? 'Subscription rejected'),
      };
    }

    logInfo(`Publishing ${eventCount} realtime events to ${sockets.length} subscribed clients.`);

    const broadcastDetail = await executeBroadcastBurst({
      sockets,
      publisher,
      jobId,
      eventCount,
      latencyThreshold,
      delayMs: Math.max(0, options.delayMs),
      redisResetSequence: options.redisResetSequence,
      redisResetDelayMs: options.redisResetDelayMs,
    });

    const metricsAfter = await fetchGatewayMetrics(config);

    await cleanupAllSubscriptions(sockets, jobId, config);
    await teardownConnections(sockets, config.disconnectTimeoutMs);
    await closeRedisPublisher(publisher);

    const success =
      broadcastDetail.summary.totalDeliveries === broadcastDetail.summary.expectedDeliveries &&
      broadcastDetail.summary.p95LatencyMs > 0 &&
      broadcastDetail.summary.p95LatencyMs <= latencyThreshold &&
      broadcastDetail.errors.length === 0;

    if (!success) {
      logWarn('Broadcast burst scenario missed latency expectations. Inspect details for specifics.');
    } else {
      logInfo(
        `Broadcast delivered ${broadcastDetail.summary.totalDeliveries}/${broadcastDetail.summary.expectedDeliveries} messages with p95 latency ${broadcastDetail.summary.p95LatencyMs.toFixed(2)}ms (threshold ${latencyThreshold}ms).`,
      );
    }

    const details = {
      jobId,
      clientCount,
      eventCount,
      latencyThresholdMs: latencyThreshold,
      connectionDetails,
      subscriptionResults,
      metricsBefore,
      metricsAfter,
      broadcastSummary: broadcastDetail.summary,
      perSocketLatencies: broadcastDetail.perSocket,
      errorMessages: broadcastDetail.errors,
    } satisfies Record<string, unknown>;

    return {
      scenario: this.name,
      success,
      summary: success
        ? `Broadcast burst p95 latency ${broadcastDetail.summary.p95LatencyMs.toFixed(2)}ms (<= ${latencyThreshold}ms).`
        : 'Broadcast burst failed or exceeded latency threshold.',
      details,
      errors: success ? [] : broadcastDetail.errors,
    };
  },
};

interface BroadcastExecutionOptions {
  readonly sockets: readonly Socket[];
  readonly publisher: RedisClient;
  readonly jobId: string;
  readonly eventCount: number;
  readonly latencyThreshold: number;
  readonly delayMs: number;
  readonly redisResetSequence?: number;
  readonly redisResetDelayMs?: number;
}

interface BroadcastExecutionResult {
  readonly summary: BroadcastAttemptSummary;
  readonly perSocket: BroadcastResultDetail[];
  readonly errors: string[];
}

async function executeBroadcastBurst(options: BroadcastExecutionOptions): Promise<BroadcastExecutionResult> {
  const { sockets, publisher, jobId, eventCount, latencyThreshold, delayMs, redisResetSequence, redisResetDelayMs } = options;
  const sendTimes = new Map<number, number>();
  const seenDeliveries = new Set<string>();
  const perSocketLatencies = new Map<string, number[]>();
  const latencies: number[] = [];
  const errorMessages: string[] = [];

  const expectedDeliveries = eventCount * sockets.length;
  let totalDeliveries = 0;

  let completionResolve: (() => void) | undefined;
  let completionReject: ((reason: Error) => void) | undefined;

  const completionPromise = new Promise<void>((resolve, reject) => {
    completionResolve = resolve;
    completionReject = reject;
  });

  const completionTimeoutMs = Math.max(10000, latencyThreshold * 10);
  const timeoutHandle = setTimeout(() => {
    completionReject?.(new Error('Broadcast delivery timed out.'));
  }, completionTimeoutMs);

  const listenerTeardowns: Array<() => void> = [];

  let socketIndex = 0;
  for (const socket of sockets) {
    const socketId = typeof socket.id === 'string' && socket.id.length > 0 ? socket.id : `socket-${socketIndex}`;
    socketIndex += 1;

    perSocketLatencies.set(socketId, []);

    const onGeneration = (payload: { jobId?: string; event?: { sequence?: number } } & Record<string, unknown>): void => {
      if (payload?.jobId !== jobId) {
        return;
      }

      const sequence = typeof payload.event?.sequence === 'number' ? payload.event.sequence : undefined;
      if (typeof sequence !== 'number') {
        return;
      }

      const key = `${socketId}:${sequence}`;
      if (seenDeliveries.has(key)) {
        return;
      }

      const sentAt = sendTimes.get(sequence);
      if (typeof sentAt !== 'number') {
        return;
      }

      seenDeliveries.add(key);
      const latency = performance.now() - sentAt;
      latencies.push(latency);
      perSocketLatencies.get(socketId)?.push(latency);
      totalDeliveries += 1;

      if (totalDeliveries >= expectedDeliveries) {
        completionResolve?.();
      }
    };

    const onError = (payload: { message?: string } | undefined): void => {
      if (payload?.message) {
        errorMessages.push(payload.message);
      }
    };

    socket.on(GENERATION_EVENT, onGeneration);
    socket.on(ERROR_EVENT, onError);

    listenerTeardowns.push(() => {
      socket.off(GENERATION_EVENT, onGeneration);
      socket.off(ERROR_EVENT, onError);
    });
  }

  let resetPerformed = false;

  try {
    for (let idx = 0; idx < eventCount; idx += 1) {
      const sequence = idx + 1;
      const eventPayload: SerializedGenerationEvent & { sequence: number } = {
        type: 'load-test.broadcast',
        occurredAt: new Date().toISOString(),
        sequence,
      };

      const realtimeEvent = createGenerationRealtimeEvent(jobId, eventPayload);
      const encoded = encodeNovelRealtimeEvent(realtimeEvent);

      if (!resetPerformed && typeof redisResetSequence === 'number' && redisResetSequence > 0 && sequence >= redisResetSequence) {
        resetPerformed = true;
        const delay = typeof redisResetDelayMs === 'number' && redisResetDelayMs >= 0 ? redisResetDelayMs : 1000;
        logWarn(`Simulating Redis reset before publishing sequence ${sequence} (delay ${delay}ms).`);
        await simulateRedisReset(publisher, delay);
        logInfo('Redis connection restored after simulated reset.');
      }

      sendTimes.set(sequence, performance.now());
      try {
        await publisher.publish(NOVEL_REALTIME_CHANNEL, encoded);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logWarn(`Redis publish failed for sequence ${sequence}: ${message}`);
        errorMessages.push(message);

        // attempt recovery once more per sequence after reconnection
        await waitForRedisReady(publisher, 2000);
        await publisher.publish(NOVEL_REALTIME_CHANNEL, encoded);
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    await completionPromise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorMessages.push(message);
  } finally {
    clearTimeout(timeoutHandle);
    for (const teardown of listenerTeardowns) {
      teardown();
    }
  }

  const summary: BroadcastAttemptSummary = {
    averageLatencyMs: average(latencies),
    p95LatencyMs: percentile(latencies, 95),
    totalDeliveries,
    expectedDeliveries,
  };

  const perSocket: BroadcastResultDetail[] = Array.from(perSocketLatencies.entries()).map(([socketId, measurements]) => ({
    socketId,
    latencies: measurements,
  }));

  return {
    summary,
    perSocket,
    errors: errorMessages,
  };
}

async function simulateRedisReset(publisher: RedisClient, delayMs: number): Promise<void> {
  publisher.disconnect();
  await Promise.race([
    once(publisher, 'end'),
    once(publisher, 'close'),
    sleep(200),
  ]).catch(() => undefined);

  if (delayMs > 0) {
    await sleep(delayMs);
  }

  await publisher.connect();
  await waitForRedisReady(publisher, 5000);
}

async function waitForRedisReady(publisher: RedisClient, timeoutMs: number): Promise<void> {
  if (publisher.status === 'ready') {
    return;
  }

  const timeout = sleep(timeoutMs).then(() => {
    throw new Error('Timed out waiting for Redis to become ready.');
  });

  await Promise.race([
    once(publisher, 'ready'),
    timeout,
  ]);
}

async function cleanupAllSubscriptions(sockets: readonly Socket[], jobId: string, config: HarnessConfig): Promise<void> {
  for (const socket of sockets) {
    await cleanupSubscriptions(socket, [jobId], config.connectTimeoutMs, config.verbose);
  }
}
