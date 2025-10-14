import { performance } from 'node:perf_hooks';
import type { Socket } from 'socket.io-client';
import { sleep } from './sleep.js';
import { logVerbose } from './log.js';

const SUBSCRIBED_EVENT = 'novel.subscribed';
const ERROR_EVENT = 'novel.error';
const UNSUBSCRIBED_EVENT = 'novel.unsubscribed';

export interface SubscriptionAttemptResult {
  readonly jobId: string;
  readonly success: boolean;
  readonly message?: string;
  readonly latencyMs: number;
}

export async function attemptSubscription(
  socket: Socket,
  jobId: string,
  timeoutMs: number,
  verbose: boolean,
): Promise<SubscriptionAttemptResult> {
  return new Promise<SubscriptionAttemptResult>((resolve) => {
    const startedAt = performance.now();

    const cleanup = (): void => {
      socket.off(SUBSCRIBED_EVENT, onSubscribed);
      socket.off(ERROR_EVENT, onError);
    };

    const settle = (result: SubscriptionAttemptResult): void => {
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      settle({
        jobId,
        success: false,
        message: 'Timed out awaiting subscription acknowledgement.',
        latencyMs: performance.now() - startedAt,
      });
    }, timeoutMs);

    const onSubscribed = (payload: { jobId?: string } | undefined): void => {
      if (payload?.jobId !== jobId) {
        return;
      }

      clearTimeout(timer);
      settle({
        jobId,
        success: true,
        latencyMs: performance.now() - startedAt,
      });
    };

    const onError = (payload: { message?: string } | undefined): void => {
      clearTimeout(timer);
      settle({
        jobId,
        success: false,
        message: payload?.message ?? 'Unknown error',
        latencyMs: performance.now() - startedAt,
      });
    };

    socket.once(SUBSCRIBED_EVENT, onSubscribed);
    socket.once(ERROR_EVENT, onError);
    socket.emit('subscribe', { jobId });

    logVerbose(verbose, `Sent subscribe for ${jobId}`);
  });
}

export async function attemptUnsubscribe(
  socket: Socket,
  jobId: string,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    const cleanup = (): void => {
      socket.off(UNSUBSCRIBED_EVENT, onUnsubscribed);
      socket.off(ERROR_EVENT, onError);
    };

    const settle = (value: boolean): void => {
      cleanup();
      clearTimeout(timer);
      resolve(value);
    };

    const onUnsubscribed = (payload: { jobId?: string } | undefined): void => {
      if (payload?.jobId !== jobId) {
        return;
      }
      settle(true);
    };

    const onError = (): void => {
      settle(false);
    };

    socket.once(UNSUBSCRIBED_EVENT, onUnsubscribed);
    socket.once(ERROR_EVENT, onError);
    socket.emit('unsubscribe', { jobId });
  });
}

export async function cleanupSubscriptions(
  socket: Socket,
  jobIds: readonly string[],
  timeoutMs: number,
  verbose: boolean,
): Promise<void> {
  for (const jobId of jobIds) {
    const success = await attemptUnsubscribe(socket, jobId, timeoutMs);
    if (!success) {
      logVerbose(verbose, `Unsubscribe timed out for ${jobId}, continuing.`);
    }
    await sleep(10);
  }
}
