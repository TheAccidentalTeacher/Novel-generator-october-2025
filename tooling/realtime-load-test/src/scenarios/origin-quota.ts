import { fetchGatewayMetrics } from '../metrics.js';
import { logInfo, logWarn } from '../utils/log.js';
import {
  performConnectionAttempts,
  teardownConnections,
  type ConnectionAttemptDetail,
} from '../utils/connections.js';
import { sleep } from '../utils/sleep.js';
import type { HarnessConfig, HarnessOptions, ScenarioDefinition, ScenarioResult } from '../types.js';

export const originQuotaScenario: ScenarioDefinition = {
  name: 'origin-quota',
  description:
    'Attempts to exceed the per-origin connection limit using the allowed Origin header and expects the gateway to enforce the cap.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    const metricsBefore = await fetchGatewayMetrics(config);
    if (metricsBefore.maxConnectionsPerOrigin === 0) {
      return {
        scenario: this.name,
        success: true,
        summary: 'Gateway has no per-origin limit configured; all connection attempts should succeed.',
        details: { metricsBefore },
        errors: [],
      };
    }

    const attempts = options.attempts > 0 ? options.attempts : metricsBefore.maxConnectionsPerOrigin + options.extras;
    logInfo(
      `Configured maxConnectionsPerOrigin=${metricsBefore.maxConnectionsPerOrigin}. Attempting ${attempts} clients from ${config.allowedOrigin}.`,
    );

    const { details, sockets } = await performConnectionAttempts(config, options, attempts, config.allowedOrigin);

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsDuring = await fetchGatewayMetrics(config);
    await teardownConnections(sockets, config.disconnectTimeoutMs);

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsAfter = await fetchGatewayMetrics(config);

    const accepted = details.filter((detail: ConnectionAttemptDetail) => detail.accepted).length;
    const rejected = details.length - accepted;

    const overallLimit = metricsBefore.maxConnections === 0 ? Number.POSITIVE_INFINITY : metricsBefore.maxConnections;
    const expectedAccepted = Math.min(metricsBefore.maxConnectionsPerOrigin, attempts, overallLimit);
    const expectedRejected = Math.max(0, attempts - expectedAccepted);
    const perOriginConnections = metricsDuring.connectionsPerOrigin[config.allowedOrigin] ?? 0;

    const success =
      accepted === expectedAccepted &&
      rejected >= expectedRejected &&
      perOriginConnections <= metricsBefore.maxConnectionsPerOrigin;

    if (!success) {
      logWarn('Per-origin quota scenario failed expectations. Inspect details for diagnostics.');
    }

    return {
      scenario: this.name,
      success,
      summary: `Accepted ${accepted}/${attempts} connections for origin ${config.allowedOrigin}.`,
      details: {
        attempts,
        accepted,
        rejected,
        expectedAccepted,
        expectedRejected,
        perOriginConnections,
        metricsBefore,
        metricsDuring,
        metricsAfter,
        connectionAttempts: details,
      },
      errors: success ? [] : ['Gateway failed to enforce per-origin connection quota.'],
    };
  },
};
