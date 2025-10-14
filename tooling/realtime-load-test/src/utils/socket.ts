import { performance } from 'node:perf_hooks';
import { io, type Socket } from 'socket.io-client';

const ERROR_EVENT = 'novel.error';

export interface ConnectionAttemptOptions {
  readonly baseUrl: string;
  readonly path: string;
  readonly origin: string;
  readonly connectTimeoutMs: number;
  readonly verbose?: boolean;
}

export interface ConnectionOutcome {
  readonly accepted: boolean;
  readonly socket?: Socket;
  readonly rejectionMessages: string[];
  readonly latencyMs: number;
  readonly disconnectReason?: string;
  readonly error?: string;
}

export async function attemptConnection(options: ConnectionAttemptOptions): Promise<ConnectionOutcome> {
  const { baseUrl, path, origin, connectTimeoutMs, verbose } = options;

  return new Promise<ConnectionOutcome>((resolve) => {
    const start = performance.now();
    const rejectionMessages: string[] = [];
    let resolved = false;
    let connected = false;

    const socket = io(baseUrl, {
      path,
      transports: ['websocket'],
      timeout: connectTimeoutMs,
      forceNew: true,
      extraHeaders: origin ? { Origin: origin } : undefined,
    });

    const cleanup = (): void => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off(ERROR_EVENT, onServerError);
    };

    const settle = (outcome: ConnectionOutcome): void => {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();
      resolve(outcome);
    };

    const onServerError = (payload: { message?: string } | undefined): void => {
      if (payload?.message) {
        rejectionMessages.push(payload.message);
      }

      if (!connected) {
        if (verbose) {
          console.warn(`Server emitted ${ERROR_EVENT} before connect: ${payload?.message ?? 'unknown'}`);
        }

        settle({
          accepted: false,
          rejectionMessages,
          latencyMs: performance.now() - start,
        });
        socket.disconnect();
      }
    };

    const onConnect = (): void => {
      connected = true;
      settle({
        accepted: true,
        socket,
        rejectionMessages,
        latencyMs: performance.now() - start,
      });
    };

    const onConnectError = (error: Error): void => {
      rejectionMessages.push(error.message);
      settle({
        accepted: false,
        rejectionMessages,
        latencyMs: performance.now() - start,
        error: error.message,
      });
      socket.disconnect();
    };

    const onDisconnect = (reason: Socket.DisconnectReason): void => {
      if (!connected) {
        rejectionMessages.push(reason);
        settle({
          accepted: false,
          rejectionMessages,
          latencyMs: performance.now() - start,
          disconnectReason: reason,
        });
      }
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onConnectError);
    socket.once('disconnect', onDisconnect);
    socket.on(ERROR_EVENT, onServerError);
  });
}

export async function disconnectSocket(socket: Socket, timeoutMs: number): Promise<void> {
  if (!socket.connected) {
    socket.removeAllListeners();
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;

    const complete = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.removeAllListeners();
      resolve();
    };

    const timer = setTimeout(() => {
      complete();
    }, timeoutMs);

    const onDisconnect = (): void => {
      clearTimeout(timer);
      complete();
    };

    const onError = (): void => {
      clearTimeout(timer);
      complete();
    };

    socket.once('disconnect', onDisconnect);
    socket.once('error', onError);
    socket.disconnect();
  });
}
