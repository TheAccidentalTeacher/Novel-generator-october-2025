import { fetchGatewayMetrics } from '../metrics.js';
import { logInfo, logWarn } from '../utils/log.js';
import {
  performConnectionAttempts,
  teardownConnections,
  type ConnectionAttemptDetail,
} from '../utils/connections.js';
import { sleep } from '../utils/sleep.js';
import type { HarnessConfig, HarnessOptions, ScenarioDefinition, ScenarioResult } from '../types.js';

export const connectionQuotaScenario: ScenarioDefinition = {
  name: 'connection-quota',
  description: 'Attempts to exceed the configured max realtime connections and verifies the gateway rejects excess clients.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    const metricsBefore = await fetchGatewayMetrics(config);
    if (metricsBefore.maxConnections === 0) {
      return {
        scenario: this.name,
        success: true,
        summary: 'Gateway has no maxConnections limit configured; all connection attempts should succeed.',
        details: { metricsBefore },
        errors: [],
      };
    }

    const attempts = options.attempts > 0 ? options.attempts : metricsBefore.maxConnections + options.extras;
    logInfo(`Configured maxConnections=${metricsBefore.maxConnections}. Attempting ${attempts} clients.`);

  const { details, sockets: acceptedSockets } = await performConnectionAttempts(config, options, attempts);

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsDuring = await fetchGatewayMetrics(config);
    await teardownConnections(acceptedSockets, config.disconnectTimeoutMs);

    if (options.settleMs > 0) {
      await sleep(options.settleMs);
    }

    const metricsAfter = await fetchGatewayMetrics(config);

  const accepted = details.filter((detail: ConnectionAttemptDetail) => detail.accepted).length;
    const rejected = details.length - accepted;
    const expectedAccepted = Math.min(metricsBefore.maxConnections, attempts);
    const expectedRejected = Math.max(0, attempts - metricsBefore.maxConnections);

    const summary = `Accepted ${accepted}/${attempts} connections (expected ${expectedAccepted}).`;
    const success =
      accepted === expectedAccepted &&
      rejected >= expectedRejected &&
      metricsDuring.totalConnections <= metricsBefore.maxConnections;

    if (!success) {
      logWarn('Connection quota scenario failed expectations. Inspect details for specifics.');
    }

    return {
      scenario: this.name,
      success,
      summary,
      details: {
        attempts,
        accepted,
        rejected,
        expectedAccepted,
        expectedRejected,
        metricsBefore,
        metricsDuring,
        metricsAfter,
        connectionAttempts: details,
      },
      errors: success ? [] : ['Gateway allowed more connections than expected or rejected too many clients.'],
    };
  },
};
