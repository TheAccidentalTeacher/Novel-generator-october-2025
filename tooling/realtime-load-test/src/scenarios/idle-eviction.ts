import { performance } from 'node:perf_hooks';
import type { Socket } from 'socket.io-client';
import { fetchGatewayMetrics } from '../metrics.js';
import { logInfo, logWarn } from '../utils/log.js';
import { performConnectionAttempts, teardownConnections } from '../utils/connections.js';
import { sleep } from '../utils/sleep.js';
import type { HarnessConfig, HarnessOptions, ScenarioDefinition, ScenarioResult } from '../types.js';
import type { ConnectionAttemptDetail } from '../utils/connections.js';

interface IdleWatcherInfo {
  readonly socketId: string;
  readonly errorMessages: string[];
  disconnectLatencyMs?: number;
  disconnected: boolean;
}

interface IdleWatcher {
  readonly socket: Socket;
  readonly info: IdleWatcherInfo;
  readonly onError: (payload: { message?: string } | undefined) => void;
  readonly onDisconnect: () => void;
}

const ERROR_EVENT = 'novel.error';

export const idleEvictionScenario: ScenarioDefinition = {
  name: 'idle-eviction',
  description: 'Verifies sockets are disconnected after the configured idle timeout and receive an inactivity error message.',
  async run(config: HarnessConfig, options: HarnessOptions): Promise<ScenarioResult> {
    const metricsBefore = await fetchGatewayMetrics(config);
    const idleTimeoutMs = metricsBefore.idleTimeoutMs;

    if (idleTimeoutMs <= 0) {
      return {
        scenario: this.name,
        success: true,
        summary: 'Gateway has no idle timeout configured; idle eviction is disabled and scenario exits early.',
        details: { metricsBefore },
        errors: [],
      };
    }

    const attempts = options.attempts > 0 ? options.attempts : Math.min(10, Math.max(1, metricsBefore.maxConnections || 5));
    logInfo(`Configured idleTimeoutMs=${idleTimeoutMs}. Establishing ${attempts} idle clients.`);

    const { details, sockets } = await performConnectionAttempts(config, options, attempts);

    const accepted = details.filter((detail: ConnectionAttemptDetail) => detail.accepted).length;
    if (accepted !== attempts) {
      return {
        scenario: this.name,
        success: false,
        summary: `Only ${accepted}/${attempts} clients connected successfully; aborting idle eviction validation.`,
        details: {
          attempts,
          accepted,
          connectionAttempts: details,
          metricsBefore,
        },
        errors: ['Unable to establish the expected number of test sockets.'],
      };
    }

    const start = performance.now();
    const watchers: IdleWatcher[] = sockets.map((socket) => {
      const info: IdleWatcherInfo = {
        socketId: socket.id ?? '(unknown)',
        errorMessages: [],
        disconnected: false,
      };

      const onError = (payload: { message?: string } | undefined): void => {
        if (payload?.message) {
          info.errorMessages.push(payload.message);
        }
      };

      const onDisconnect = (): void => {
        info.disconnected = true;
        info.disconnectLatencyMs = performance.now() - start;
      };

      socket.on(ERROR_EVENT, onError);
      socket.on('disconnect', onDisconnect);

      return {
        socket,
        info,
        onError,
        onDisconnect,
      };
    });

    const settleBuffer = options.settleMs > 0 ? options.settleMs : 250;
    await sleep(idleTimeoutMs + settleBuffer);

    const metricsAfter = await fetchGatewayMetrics(config);

    for (const watcher of watchers) {
      watcher.socket.off(ERROR_EVENT, watcher.onError);
      watcher.socket.off('disconnect', watcher.onDisconnect);
    }

    const stillConnected = watchers.filter((watcher) => watcher.socket.connected).map((watcher) => watcher.info.socketId);
    const missingError = watchers
      .filter((watcher) => watcher.info.errorMessages.length === 0)
      .map((watcher) => watcher.info.socketId);

    await teardownConnections(sockets, config.disconnectTimeoutMs);

    const success =
      stillConnected.length === 0 &&
      missingError.length === 0 &&
      metricsAfter.totalConnections === 0 &&
      metricsAfter.idleClients === 0;

    if (!success) {
      logWarn('Idle eviction scenario detected unexpected behaviour. Inspect details for diagnostics.');
    }

    return {
      scenario: this.name,
      success,
      summary: success
        ? `All ${attempts} clients were disconnected due to inactivity within ${idleTimeoutMs + settleBuffer}ms.`
        : `Idle eviction failed; ${stillConnected.length} clients remained connected or missing inactivity errors were observed.`,
      details: {
        attempts,
        accepted,
        idleTimeoutMs,
        settleBuffer,
        metricsBefore,
        metricsAfter,
        stillConnected,
        missingError,
        watchers: watchers.map((watcher) => watcher.info),
      },
      errors: success
        ? []
        : [
            stillConnected.length > 0 ? `Clients still connected after timeout: ${stillConnected.join(', ')}` : undefined,
            missingError.length > 0 ? `Clients missing inactivity error payload: ${missingError.join(', ')}` : undefined,
          ].filter((value): value is string => Boolean(value)),
    };
  },
};
