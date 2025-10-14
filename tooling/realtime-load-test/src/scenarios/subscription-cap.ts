import { fetchGatewayMetrics } from '../metrics.js';
import { logInfo, logWarn } from '../utils/log.js';
import { sleep } from '../utils/sleep.js';
import { attemptConnection, disconnectSocket } from '../utils/socket.js';
import { attemptSubscription, cleanupSubscriptions } from '../utils/subscriptions.js';
import type { HarnessConfig, HarnessOptions, ScenarioDefinition, ScenarioResult } from '../types.js';

interface SubscriptionAttemptDetail {
  readonly jobId: string;
  readonly success: boolean;
  readonly message?: string;
  readonly latencyMs: number;
}

export const subscriptionCapScenario: ScenarioDefinition = {
  name: 'subscription-cap',
  description:
    'Verifies a client cannot subscribe to more than the configured maxSubscriptionsPerClient jobs on a single socket connection.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    const metricsBefore = await fetchGatewayMetrics(config);
    const limit = metricsBefore.maxSubscriptionsPerClient;

    if (limit <= 0) {
      return {
        scenario: this.name,
        success: false,
        summary: 'Gateway must set maxSubscriptionsPerClient > 0 to validate this scenario.',
        details: { metricsBefore },
        errors: ['Invalid configuration: maxSubscriptionsPerClient is not greater than zero.'],
      };
    }

    logInfo(`Configured maxSubscriptionsPerClient=${limit}. Establishing control connection.`);
    const connectionOutcome = await attemptConnection({
      baseUrl: config.apiBaseUrl,
      path: config.websocketPath,
      origin: config.allowedOrigin,
      connectTimeoutMs: config.connectTimeoutMs,
      verbose: config.verbose,
    });

    if (!connectionOutcome.accepted || !connectionOutcome.socket) {
      return {
        scenario: this.name,
        success: false,
        summary: 'Failed to establish websocket connection for subscription testing.',
        details: { connectionOutcome },
        errors: connectionOutcome.rejectionMessages.length > 0 ? connectionOutcome.rejectionMessages : ['Unknown connection error'],
      };
    }

    const socket = connectionOutcome.socket;
    const attempts = options.jobCount > 0 ? options.jobCount : limit + options.extras;
    const results: SubscriptionAttemptDetail[] = [];
    const subscribedJobs: string[] = [];

    for (let index = 0; index < attempts; index += 1) {
      const jobId = `load-test-job-${index + 1}`;
      const result = await attemptSubscription(socket, jobId, config.connectTimeoutMs, config.verbose);
      results.push(result);
      if (result.success) {
        subscribedJobs.push(jobId);
      }

      if (options.delayMs > 0) {
        await sleep(options.delayMs);
      }
    }

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsDuring = await fetchGatewayMetrics(config);

  await cleanupSubscriptions(socket, subscribedJobs, config.connectTimeoutMs, config.verbose);
    await disconnectSocket(socket, config.disconnectTimeoutMs);

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsAfter = await fetchGatewayMetrics(config);

    const accepted = results.filter((result) => result.success).length;
    const rejected = results.length - accepted;
    const expectedAccepted = Math.min(limit, attempts);
    const expectedRejected = Math.max(0, attempts - expectedAccepted);
    const rejectionMessages = results.filter((result) => !result.success).map((result) => result.message ?? 'unknown');

    const success = accepted === expectedAccepted && rejected >= expectedRejected;

    if (!success) {
      logWarn('Subscription cap scenario failed expectations. Inspect diagnostics.');
    }

    return {
      scenario: this.name,
      success,
      summary: `Accepted ${accepted}/${attempts} subscriptions on a single connection (expected ${expectedAccepted}).`,
      details: {
        attempts,
        accepted,
        rejected,
        expectedAccepted,
        expectedRejected,
        rejectionMessages,
        results,
        metricsBefore,
        metricsDuring,
        metricsAfter,
      },
      errors: success ? [] : ['Gateway failed to enforce subscription cap or rejected legitimate subscriptions.'],
    };
  },
};
