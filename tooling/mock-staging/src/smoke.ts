import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { io, type Socket } from 'socket.io-client';
import type {
  ListNovelJobsResponse,
  NovelJobDetailResponse,
  NovelJobStatus,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';

const API_BASE = process.env.MOCK_STAGING_URL ?? 'http://localhost:3001';
const SOCKET_URL = process.env.MOCK_STAGING_SOCKET_URL ?? 'http://localhost:3001';
const SOCKET_PATH = process.env.MOCK_STAGING_SOCKET_PATH ?? '/ws';
const SERVER_MODE = (process.env.SMOKE_SERVER_MODE ?? 'auto').toLowerCase();

interface ScenarioResult {
  name: string;
  success: boolean;
  details?: string;
  error?: string;
}

async function main(): Promise<void> {
  const results: ScenarioResult[] = [];
  let serverHandle: ServerHandle | undefined;
  let placeholderResult: ScenarioResult | undefined;

  try {
    serverHandle = await ensureServer();
    const jobId = await getDefaultJobId();

    const { socket, elapsed } = await scenarioConnection(jobId);
    results.push({
      name: 'Connection Establishment',
      success: elapsed <= 2000,
      details: `Subscribed in ${elapsed}ms`,
    });

    const deliveryDetails = await scenarioEventDelivery(socket, jobId);
    results.push({
      name: 'Event Delivery',
      success: deliveryDetails.eventsReceived >= 2 && deliveryDetails.completed,
      details: `Received ${deliveryDetails.eventsReceived} events; completed=${deliveryDetails.completed}`,
    });

    const reconnectDetails = await scenarioReconnection(socket, jobId);
    results.push({
      name: 'Reconnection After Disconnect',
      success: reconnectDetails.reconnected && reconnectDetails.catchUp,
      details: reconnectDetails.details,
    });

    const errorDetails = await scenarioErrorSurfacing(socket);
    results.push({
      name: 'Error Surfacing',
      success: errorDetails.sawError,
      details: errorDetails.details,
    });

    socket.disconnect();

    placeholderResult = await scenarioPlaceholderMode();
  } catch (error) {
    results.push({
      name: 'Connection Establishment',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      placeholderResult = await scenarioPlaceholderMode();
    } catch (placeholderError) {
      results.push({
        name: 'Graceful Degradation',
        success: false,
        error: placeholderError instanceof Error ? placeholderError.message : String(placeholderError),
      });
    }
  } finally {
    await serverHandle?.stop();
  }
  if (placeholderResult) {
    results.push(placeholderResult);
  }

  reportResults(results);

  if (results.some((result) => !result.success)) {
    process.exitCode = 1;
  }
}

async function getDefaultJobId(): Promise<string> {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // Allow bootstrap timers time to insert the seed job
      await delay(150);
      const response = await fetchJson<ListNovelJobsResponse>(`${API_BASE}/api/novel`);
      const jobId = response.items[0]?.jobId;
      if (jobId) {
        return jobId;
      }
      if (attempt === attempts) {
        throw new Error('Mock server returned empty job list');
      }
    } catch (error) {
      if (attempt === attempts) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    await delay(200 * attempt);
  }

  throw new Error('Unable to retrieve job id');
}

async function scenarioConnection(jobId: string): Promise<{ socket: Socket; elapsed: number }> {
  const start = Date.now();
  const socket = io(SOCKET_URL, {
    path: SOCKET_PATH,
    transports: ['websocket'],
    timeout: 2000,
    reconnection: true,
  });

  await waitForEvent(socket, 'connect', undefined, 2000);

  const subscribedPromise = waitForEvent<{ jobId: string }>(
    socket,
    'novel.subscribed',
    (payload) => payload.jobId === jobId,
    2000,
  );

  socket.emit('subscribe', { jobId });
  await subscribedPromise;

  const elapsed = Date.now() - start;
  return { socket, elapsed };
}

async function scenarioEventDelivery(socket: Socket, jobId: string): Promise<{ eventsReceived: number; completed: boolean }> {
  let eventsReceived = 0;
  let completed = false;

  const generationHandler = (event: GenerationEventPayload) => {
    if (event.jobId === jobId) {
      eventsReceived += 1;
    }
  };

  socket.on('novel.generation-event', generationHandler as never);

  const generationPromise = waitForEvent<GenerationEventPayload>(
    socket,
    'novel.generation-event',
    (event) => event.jobId === jobId,
    8000,
  );

  const completionPromise = waitForEvent<JobStatusEventPayload>(
    socket,
    'novel.job-status',
    (event) => event.jobId === jobId && event.status === 'completed',
    9000,
  ).then(() => {
    completed = true;
  });

  await Promise.allSettled([generationPromise, completionPromise]);

  socket.off('novel.generation-event', generationHandler as never);

  return { eventsReceived, completed };
}

async function scenarioReconnection(socket: Socket, jobId: string): Promise<{ reconnected: boolean; catchUp: boolean; details: string }> {
  let reconnected = false;
  let catchUp = false;

  const reconnectPromise = waitForEvent(socket, 'connect', undefined, 10000).then(() => {
    reconnected = true;
  });

  const subscribedPromise = waitForEvent<{ jobId: string }>(
    socket,
    'novel.subscribed',
    (payload) => payload.jobId === jobId,
    10000,
  ).then(() => {
    catchUp = true;
  });

  let resubscribed = false;
  const connectHandler = () => {
    if (resubscribed) {
      return;
    }
    resubscribed = true;
    socket.emit('subscribe', { jobId });
  };

  socket.on('connect', connectHandler);

  socket.emit('unsubscribe', { jobId });
  socket.io.engine.close();

  await delay(1000);

  if (socket.connected) {
    connectHandler();
  } else {
    socket.connect();
  }

  await Promise.allSettled([reconnectPromise, subscribedPromise]);

  socket.off('connect', connectHandler);

  return {
    reconnected,
    catchUp,
    details: `Reconnected=${reconnected}, CatchUp=${catchUp}`,
  };
}

async function scenarioErrorSurfacing(socket: Socket): Promise<{ sawError: boolean; details: string }> {
  let sawError = false;

  const errorPromise = waitForEvent<string>(
    socket,
    'novel.error',
    (message) => message.includes('not found'),
    2000,
  ).then(() => {
    sawError = true;
  });

  socket.emit('subscribe', { jobId: 'missing-job-id' });

  await errorPromise.catch(() => {
    sawError = false;
  });

  return {
    sawError,
    details: sawError ? 'Gateway returned not found error for invalid job' : 'No error received when subscribing to invalid job',
  };
}

async function scenarioPlaceholderMode(): Promise<ScenarioResult> {
  const response = await fetch(`${API_BASE}/api/novel`);
  if (!response.ok) {
    return {
      name: 'Graceful Degradation',
      success: false,
      error: `REST API returned status ${response.status}`,
    };
  }

  const list = (await response.json()) as ListNovelJobsResponse;
  const jobId = list.items[0]?.jobId;

  if (!jobId) {
    return {
      name: 'Graceful Degradation',
      success: false,
      error: 'No jobs available when testing placeholder mode',
    };
  }

  const detail = await fetchJson<NovelJobDetailResponse>(`${API_BASE}/api/novel/${encodeURIComponent(jobId)}`);

  return {
    name: 'Graceful Degradation',
    success: Boolean(detail) && detail.jobId === jobId,
    details: 'Job detail retrieved via REST without websocket',
  };
}

function reportResults(results: ScenarioResult[]): void {
  console.log('\nFrontend Realtime Smoke Results');
  console.log('================================');
  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const info = result.details ?? result.error ?? '';
    console.log(`${status}  ${result.name}${info ? ` – ${info}` : ''}`);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function waitForEvent<T = void>(
  socket: Socket,
  eventName: string,
  predicate?: (payload: T) => boolean,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler as never);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);

    const handler = (payload: T) => {
      if (!predicate || predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName, handler as never);
        resolve(payload);
      }
    };

    socket.on(eventName, handler as never);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GenerationEventPayload = {
  jobId: string;
  emittedAt: string;
  event: SerializedGenerationEvent;
};

type JobStatusEventPayload = {
  jobId: string;
  emittedAt: string;
  status: NovelJobStatus;
  snapshot: Record<string, unknown> | null;
};

interface ServerHandle {
  stop: () => Promise<void>;
}

async function ensureServer(): Promise<ServerHandle> {
  try {
    await fetchJson<ListNovelJobsResponse>(`${API_BASE}/api/novel`);
    console.log('Detected existing mock staging server; reusing running instance.');
    return {
      stop: async () => {
        /* external server managed elsewhere */
      },
    };
  } catch (error) {
    if (SERVER_MODE === 'remote') {
      throw new Error(
        `Unable to reach external API at ${API_BASE}. Set SMOKE_SERVER_MODE=auto to allow local fallback. Original error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    console.log(`No external API detected at ${API_BASE}; falling back to local mock server (mode=${SERVER_MODE}).`);
  }

  const serverPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'server.ts');
  console.log('Starting embedded mock staging server for smoke run...');
  const child = spawn(process.execPath, ['--loader', 'ts-node/esm', serverPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MOCK_STAGING_PORT: new URL(API_BASE).port || '3001',
    },
  });

  const rl = createInterface({ input: child.stdout });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for mock server to start'));
    }, 8000);

    const cleanup = () => {
      clearTimeout(timer);
      rl.off('line', handleLine);
      child.stderr?.off('data', handleStderr);
      child.off('exit', handleExit);
    };

    const handleLine = (line: string) => {
      const text = line.trim();
      console.log(`[mock-server] ${text}`);
      if (text.includes('Mock staging API listening')) {
        cleanup();
        resolve();
      }
    };

    const handleStderr = (chunk: Buffer) => {
      const text = chunk.toString();
      process.stderr.write(`[mock-server-err] ${text}`);
      if (text.includes('EADDRINUSE')) {
        cleanup();
        reject(new Error('Port already in use when starting mock server'));
      }
    };

    const handleExit = (code?: number | null) => {
      cleanup();
      reject(new Error(`Mock server exited prematurely with code ${code ?? 'unknown'}`));
    };

    rl.on('line', handleLine);
    child.stderr?.on('data', handleStderr);
    child.once('exit', handleExit);
  });

  return {
    stop: async () => {
      if (child.exitCode !== null) {
        return;
      }
      child.kill('SIGINT');
      await once(child, 'exit');
    },
  };
}

await main();
