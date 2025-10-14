import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Socket } from 'socket.io-client';
import type { NovelJobEventRecord } from '@letswriteabook/domain';
import type { SerializedGenerationEvent } from '@letswriteabook/shared-types';
import { fetchGatewayMetrics } from '../metrics.js';
import type {
  GatewayCatchUpMetrics,
  GatewayMetrics,
  HarnessConfig,
  HarnessOptions,
  ScenarioDefinition,
  ScenarioResult,
} from '../types.js';
import { logInfo, logWarn, logVerbose } from '../utils/log.js';
import { openMongoConnection, closeMongoConnection, cleanupJobArtifacts, seedJobEvents } from '../utils/mongo.js';
import { sleep } from '../utils/sleep.js';
import { attemptConnection, disconnectSocket } from '../utils/socket.js';
import { attemptSubscription, cleanupSubscriptions } from '../utils/subscriptions.js';

interface CatchUpDetail {
  readonly sequence: number;
  readonly latencyMs: number;
}

const GENERATION_EVENT = 'novel.generation-event';
const ERROR_EVENT = 'novel.error';

export const catchUpBurstScenario: ScenarioDefinition = {
  name: 'catch-up-burst',
  description:
    'Seeds persisted events for a synthetic job and verifies that the gateway catch-up replay completes within the configured budget.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    if (!config.mongoUri) {
      return {
        scenario: this.name,
        success: false,
        summary: 'Mongo URI is required for catch-up validation.',
        details: {},
        errors: ['mongo-uri option must be provided for catch-up-burst'],
      };
    }

    const eventCount = options.eventCount > 0 ? options.eventCount : 50;
    const replayThreshold = options.replayThresholdMs > 0 ? options.replayThresholdMs : 1000;
    const jobId = `load-test-catchup-${randomUUID()}`;

    const metricsBefore = await fetchGatewayMetrics(config);

    await openMongoConnection(config.mongoUri);

    const events = buildCatchUpEvents(jobId, eventCount);
    await cleanupJobArtifacts(jobId);
    await seedJobEvents(events);

    const connectionOutcome = await attemptConnection({
      baseUrl: config.apiBaseUrl,
      path: config.websocketPath,
      origin: config.allowedOrigin,
      connectTimeoutMs: config.connectTimeoutMs,
      verbose: config.verbose,
    });

    if (!connectionOutcome.accepted || !connectionOutcome.socket) {
      await cleanupJobArtifacts(jobId);
      await closeMongoConnection();

      return {
        scenario: this.name,
        success: false,
        summary: 'Failed to establish websocket connection for catch-up validation.',
        details: { connectionOutcome },
        errors: connectionOutcome.rejectionMessages.length > 0
          ? connectionOutcome.rejectionMessages
          : ['Unknown connection failure'],
      };
    }

    const socket = connectionOutcome.socket;
    const catchUpDetails: CatchUpDetail[] = [];
    const errorMessages: string[] = [];
    let subscribedAt: number | undefined;
    let receivedEvents = 0;

    const catchUpPromise = new Promise<void>((resolve, reject) => {
      const onGeneration = (payload: { jobId?: string } & Record<string, unknown>): void => {
        if (payload?.jobId !== jobId) {
          return;
        }

        const now = performance.now();
        if (typeof subscribedAt !== 'number') {
          subscribedAt = now;
        }

        receivedEvents += 1;
        catchUpDetails.push({
          sequence: receivedEvents,
          latencyMs: now - subscribedAt,
        });

        if (receivedEvents >= eventCount) {
          clearTimeout(timeout);
          cleanupListeners();
          resolve();
        }
      };

      const onError = (payload: { message?: string } | undefined): void => {
        if (payload?.message) {
          errorMessages.push(payload.message);
        }
      };

      const cleanupListeners = (): void => {
        socket.off(GENERATION_EVENT, onGeneration);
        socket.off(ERROR_EVENT, onError);
      };

      const timeout = setTimeout(() => {
        cleanupListeners();
        reject(new Error('Catch-up replay timed out.'));
      }, replayThreshold + 1000);

      socket.on(GENERATION_EVENT, onGeneration);
      socket.on(ERROR_EVENT, onError);
    });

    const subscriptionResult = await attemptSubscription(socket, jobId, config.connectTimeoutMs, config.verbose);

    if (!subscriptionResult.success) {
      await cleanupSubscriptions(socket, [jobId], config.connectTimeoutMs, config.verbose);
      await disconnectSocket(socket, config.disconnectTimeoutMs);
      await cleanupJobArtifacts(jobId);
      await closeMongoConnection();

      return {
        scenario: this.name,
        success: false,
        summary: 'Subscription to synthetic job failed; catch-up replay was not triggered.',
        details: { subscriptionResult },
        errors: subscriptionResult.message ? [subscriptionResult.message] : ['Subscription rejected'],
      };
    }

    subscribedAt = performance.now();

    let replayDurationMs = 0;

    try {
      await catchUpPromise;
      if (catchUpDetails.length > 0) {
        replayDurationMs = Math.max(...catchUpDetails.map((detail) => detail.latencyMs));
      }
    } catch (error) {
      errorMessages.push(error instanceof Error ? error.message : String(error));
    }

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsAfter = await fetchGatewayMetrics(config);
    const catchUpMetrics = metricsAfter.lastCatchUp?.[jobId];

    await cleanupSubscriptions(socket, [jobId], config.connectTimeoutMs, config.verbose);
    await disconnectSocket(socket, config.disconnectTimeoutMs);
    await cleanupJobArtifacts(jobId);
    await closeMongoConnection();

    const success =
      receivedEvents === eventCount &&
      errorMessages.length === 0 &&
      replayDurationMs > 0 &&
      replayDurationMs <= replayThreshold;

    if (!success) {
      logWarn('Catch-up replay did not meet expectations. Inspect harness output for details.');
    } else {
      logInfo(
        `Catch-up replayed ${receivedEvents} events in ${replayDurationMs.toFixed(2)}ms (threshold ${replayThreshold}ms).`,
      );
    }

    logVerbose(config.verbose, `Recorded catch-up metrics: ${JSON.stringify(catchUpMetrics ?? {}, null, 2)}`);

    const details = {
      jobId,
      eventCount,
      replayThresholdMs: replayThreshold,
      receivedEvents,
      replayDurationMs,
      metricsBefore,
      metricsAfter,
      catchUpMetrics,
      catchUpDetails,
      subscriptionLatencyMs: subscriptionResult.latencyMs,
      errorMessages,
    } satisfies Record<string, unknown>;

    return {
      scenario: this.name,
      success,
      summary: success
        ? `Catch-up replayed ${receivedEvents} events in ${replayDurationMs.toFixed(2)}ms.`
        : 'Catch-up replay failed or exceeded threshold.',
      details,
      errors: success ? [] : errorMessages,
    };
  },
};

function buildCatchUpEvents(jobId: string, count: number): NovelJobEventRecord[] {
  const baseTime = Date.now() - count * 40;

  const events: NovelJobEventRecord[] = [];
  for (let index = 0; index < count; index += 1) {
    const occurredAt = new Date(baseTime + index * 40).toISOString();
    const event: SerializedGenerationEvent = {
      type: 'load-test.progress',
      occurredAt,
      sequence: index + 1,
    };

    events.push({
      kind: 'generation',
      jobId,
      emittedAt: occurredAt,
      event,
    });
  }

  return events;
}
