import type { Socket } from 'socket.io-client';
import type { HarnessConfig, HarnessOptions } from '../types.js';
import { attemptConnection, disconnectSocket } from './socket.js';
import { sleep } from './sleep.js';
import { logVerbose } from './log.js';

export interface ConnectionAttemptDetail {
  readonly accepted: boolean;
  readonly rejectionMessages: string[];
  readonly latencyMs: number;
}

export async function performConnectionAttempts(
  config: HarnessConfig,
  options: HarnessOptions,
  attempts: number,
  originOverride?: string,
): Promise<{ details: ConnectionAttemptDetail[]; sockets: Socket[] }> {
  const details: ConnectionAttemptDetail[] = [];
  const sockets: Socket[] = [];

  for (let idx = 0; idx < attempts; idx += 1) {
    logVerbose(config.verbose, `Attempting connection ${idx + 1}/${attempts}`);
    const outcome = await attemptConnection({
      baseUrl: config.apiBaseUrl,
      path: config.websocketPath,
      origin: originOverride ?? config.allowedOrigin,
      connectTimeoutMs: config.connectTimeoutMs,
      verbose: config.verbose,
    });

    details.push({
      accepted: outcome.accepted,
      rejectionMessages: outcome.rejectionMessages,
      latencyMs: outcome.latencyMs,
    });

    if (outcome.accepted && outcome.socket) {
      sockets.push(outcome.socket);
    }

    if (options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  return { details, sockets };
}

export async function teardownConnections(sockets: Socket[], disconnectTimeoutMs: number): Promise<void> {
  for (const socket of sockets) {
    await disconnectSocket(socket, disconnectTimeoutMs);
  }
}
