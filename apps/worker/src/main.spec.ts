/// <reference types="jest" />
import type { WorkerConfig } from '@letswriteabook/config';
import { loadWorkerConfig, parseRedisUrl } from '@letswriteabook/config';
import { startWorker } from './main';

const processNovelJobMock = jest.fn();

jest.mock('./novel-job-processor', () => ({
  createNovelJobProcessor: jest.fn(async () => ({
    process: processNovelJobMock,
  })),
}));

jest.mock('./realtime-publisher', () => {
  const publishMock = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
  const closeMock = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const createMock = jest
    .fn<Promise<{ publish: typeof publishMock; close: typeof closeMock }>, [string, unknown]>()
    .mockResolvedValue({
      publish: publishMock,
      close: closeMock,
    });

  return {
    NovelRealtimePublisher: {
      create: createMock,
    },
    __mock: {
      publishMock,
      closeMock,
      createMock,
    },
  } satisfies Record<string, unknown>;
});

const { createNovelJobProcessor: createNovelJobProcessorMock } = jest.requireMock('./novel-job-processor') as {
  createNovelJobProcessor: jest.Mock<Promise<{ process: typeof processNovelJobMock }>, any[]>;
};

const {
  NovelRealtimePublisher: { create: novelRealtimePublisherCreateMock },
  __mock: { publishMock: realtimePublishMock, closeMock: realtimeCloseMock },
} = jest.requireMock('./realtime-publisher') as {
  NovelRealtimePublisher: { create: jest.Mock }; 
  __mock: {
    publishMock: jest.Mock<Promise<void>, [unknown]>;
    closeMock: jest.Mock<Promise<void>, []>;
    createMock: jest.Mock;
  };
};

const workerOnMock = jest.fn();
const workerWaitUntilReadyMock = jest.fn();
const workerCloseMock = jest.fn();
const queueEventsOnMock = jest.fn();
const queueEventsWaitUntilReadyMock = jest.fn();
const queueEventsCloseMock = jest.fn();

interface WorkerConstructorCall {
  readonly queueName: string;
  readonly processor: (job: unknown) => Promise<unknown>;
  readonly options: Record<string, unknown>;
}

interface QueueEventsConstructorCall {
  readonly queueName: string;
}

const workerConstructorCalls: WorkerConstructorCall[] = [];
const queueEventsConstructorCalls: QueueEventsConstructorCall[] = [];

jest.mock('bullmq', () => ({
  Worker: jest.fn(
    (queueName: string, processor: (job: unknown) => Promise<unknown>, options: Record<string, unknown>) => {
      workerConstructorCalls.push({ queueName, processor, options });

      return {
        on: workerOnMock,
        waitUntilReady: workerWaitUntilReadyMock,
        close: workerCloseMock,
      };
    },
  ),
  QueueEvents: jest.fn((queueName: string) => {
    queueEventsConstructorCalls.push({ queueName });

    return {
      on: queueEventsOnMock,
      waitUntilReady: queueEventsWaitUntilReadyMock,
      close: queueEventsCloseMock,
    };
  }),
}));

const { Worker: WorkerMock, QueueEvents: QueueEventsMock } = jest.requireMock('bullmq') as {
  Worker: jest.Mock;
  QueueEvents: jest.Mock;
};

jest.mock('@letswriteabook/config', () => ({
  loadWorkerConfig: jest.fn(),
  parseRedisUrl: jest.fn(),
}));

jest.mock('@letswriteabook/persistence', () => ({
  connectToDatabase: jest.fn(),
  disconnectFromDatabase: jest.fn(),
  MongoNovelJobRepository: jest.fn(() => ({
    initializeJob: jest.fn(),
    saveGenerationResult: jest.fn(),
    recordFailure: jest.fn(),
    findByJobId: jest.fn(),
    listActiveJobs: jest.fn(),
  })),
  MongoNovelJobEventRepository: jest.fn(() => ({
    append: jest.fn(),
    list: jest.fn(),
  })),
  MongoNovelJobMetricsRepository: jest.fn(() => ({
    incrementCosts: jest.fn(),
    incrementTokens: jest.fn(),
    updateLatency: jest.fn(),
    reset: jest.fn(),
    getMetrics: jest.fn(),
  })),
  MongoNovelJobMetadataRepository: jest.fn(() => ({
    upsertStoryBible: jest.fn(),
    addContinuityAlert: jest.fn(),
    resolveContinuityAlert: jest.fn(),
    appendAiDecision: jest.fn(),
    getMetadata: jest.fn(),
  })),
}));

const loadWorkerConfigMock = jest.mocked(loadWorkerConfig);
const parseRedisUrlMock = jest.mocked(parseRedisUrl);
const {
  connectToDatabase: connectToDatabaseMock,
  disconnectFromDatabase: disconnectFromDatabaseMock,
  MongoNovelJobRepository: MongoNovelJobRepositoryMock,
  MongoNovelJobEventRepository: MongoNovelJobEventRepositoryMock,
  MongoNovelJobMetricsRepository: MongoNovelJobMetricsRepositoryMock,
  MongoNovelJobMetadataRepository: MongoNovelJobMetadataRepositoryMock,
} = jest.requireMock('@letswriteabook/persistence') as {
  connectToDatabase: jest.Mock<Promise<void>, [string]>;
  disconnectFromDatabase: jest.Mock<Promise<void>, []>;
  MongoNovelJobRepository: jest.Mock;
  MongoNovelJobEventRepository: jest.Mock;
  MongoNovelJobMetricsRepository: jest.Mock;
  MongoNovelJobMetadataRepository: jest.Mock;
};

const onceRegistrations: Array<{ event: NodeJS.Signals; listener: (signal: NodeJS.Signals) => void }> = [];
const onRegistrations: Array<{ event: string; listener: (...args: unknown[]) => void }> = [];

let processOnceSpy: jest.SpiedFunction<typeof process.once>;
let processOnSpy: jest.SpiedFunction<typeof process.on>;
let consoleLogSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;
let originalExitCode: number | undefined;

function createConfig(overrides: Partial<WorkerConfig> = {}): WorkerConfig {
  return {
    nodeEnv: 'development',
    mongoUri: 'mongodb://localhost:27017/worker-tests',
    redisUrl: 'redis://localhost:6379',
    openAiApiKey: undefined,
    modelOverrides: undefined,
    sentryDsn: undefined,
    novelQueueName: 'novel-generation',
    loggerLevels: ['info', 'warn', 'error'],
    ...overrides,
  } satisfies WorkerConfig;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

beforeEach(() => {
  onceRegistrations.length = 0;
  onRegistrations.length = 0;
  workerConstructorCalls.length = 0;
  queueEventsConstructorCalls.length = 0;

  WorkerMock.mockClear();
  QueueEventsMock.mockClear();
  workerOnMock.mockReset();
  workerWaitUntilReadyMock.mockReset();
  workerCloseMock.mockReset();
  queueEventsOnMock.mockReset();
  queueEventsWaitUntilReadyMock.mockReset();
  queueEventsCloseMock.mockReset();
  loadWorkerConfigMock.mockReset();
  parseRedisUrlMock.mockReset();
  connectToDatabaseMock.mockReset();
  disconnectFromDatabaseMock.mockReset();
  MongoNovelJobRepositoryMock.mockClear();
  MongoNovelJobEventRepositoryMock.mockClear();
  MongoNovelJobMetricsRepositoryMock.mockClear();
  MongoNovelJobMetadataRepositoryMock.mockClear();
  createNovelJobProcessorMock.mockClear();
  processNovelJobMock.mockReset();
  novelRealtimePublisherCreateMock.mockReset();
  realtimePublishMock.mockReset();
  realtimeCloseMock.mockReset();
  realtimePublishMock.mockResolvedValue(undefined);
  realtimeCloseMock.mockResolvedValue(undefined);
  novelRealtimePublisherCreateMock.mockResolvedValue({
    publish: realtimePublishMock,
    close: realtimeCloseMock,
  });

  workerWaitUntilReadyMock.mockResolvedValue(undefined);
  workerCloseMock.mockResolvedValue(undefined);
  queueEventsWaitUntilReadyMock.mockResolvedValue(undefined);
  queueEventsCloseMock.mockResolvedValue(undefined);
  connectToDatabaseMock.mockResolvedValue(undefined);
  disconnectFromDatabaseMock.mockResolvedValue(undefined);

  processOnceSpy = jest.spyOn(process, 'once').mockImplementation((event: string | symbol, listener: (...args: unknown[]) => void) => {
    onceRegistrations.push({ event: event as NodeJS.Signals, listener: listener as (signal: NodeJS.Signals) => void });
    return process;
  });

  processOnSpy = jest.spyOn(process, 'on').mockImplementation((event: string | symbol, listener: (...args: unknown[]) => void) => {
    onRegistrations.push({ event: String(event), listener });
    return process;
  });

  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  originalExitCode = typeof process.exitCode === 'number' ? process.exitCode : undefined;
  process.exitCode = undefined;
});

afterEach(() => {
  processOnceSpy.mockRestore();
  processOnSpy.mockRestore();
  consoleLogSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  process.exitCode = originalExitCode;
});

it('throws when REDIS_URL is missing', async () => {
  loadWorkerConfigMock.mockReturnValue(createConfig({ redisUrl: undefined }));

  await expect(startWorker()).rejects.toThrow('REDIS_URL is required to start the worker.');

  expect(workerConstructorCalls).toHaveLength(0);
  expect(queueEventsConstructorCalls).toHaveLength(0);
  expect(connectToDatabaseMock).not.toHaveBeenCalled();
  expect(MongoNovelJobRepositoryMock).not.toHaveBeenCalled();
});

it('throws when MONGODB_URI is missing', async () => {
  loadWorkerConfigMock.mockReturnValue(createConfig({ mongoUri: undefined }));

  await expect(startWorker()).rejects.toThrow('MONGODB_URI is required to start the worker.');

  expect(connectToDatabaseMock).not.toHaveBeenCalled();
  expect(MongoNovelJobRepositoryMock).not.toHaveBeenCalled();
});

it('starts the worker runtime and registers lifecycle handlers', async () => {
  parseRedisUrlMock.mockReturnValue({ host: 'localhost', port: 6379 });
  loadWorkerConfigMock.mockReturnValue(createConfig());

  await expect(startWorker()).resolves.toBeUndefined();

  expect(connectToDatabaseMock).toHaveBeenCalledWith('mongodb://localhost:27017/worker-tests');
  expect(MongoNovelJobRepositoryMock).toHaveBeenCalledTimes(1);
  expect(parseRedisUrlMock).toHaveBeenCalledWith('redis://localhost:6379');
  expect(novelRealtimePublisherCreateMock).toHaveBeenCalledWith('redis://localhost:6379', expect.any(Object));
  expect(workerConstructorCalls).toHaveLength(1);
  const workerCall = workerConstructorCalls[0];
  expect(workerCall.queueName).toBe('novel-generation');
  expect(workerCall.options).toMatchObject({
    connection: { host: 'localhost', port: 6379 },
    concurrency: 1,
  });

  expect(queueEventsConstructorCalls).toEqual([{ queueName: 'novel-generation' }]);
  expect(workerWaitUntilReadyMock).toHaveBeenCalledTimes(1);
  expect(queueEventsWaitUntilReadyMock).toHaveBeenCalledTimes(1);

  const queueEventNames = queueEventsOnMock.mock.calls.map((call) => call[0] as string);
  expect(queueEventNames).toEqual(expect.arrayContaining(['completed', 'failed']));

  const workerEventNames = workerOnMock.mock.calls.map((call) => call[0] as string);
  expect(workerEventNames).toContain('failed');

  const signalNames = onceRegistrations.map((registration) => registration.event);
  expect(signalNames).toEqual(expect.arrayContaining(['SIGINT', 'SIGTERM']));

  const lifecycleEvents = onRegistrations.map((registration) => registration.event);
  expect(lifecycleEvents).toEqual(expect.arrayContaining(['unhandledRejection', 'uncaughtException']));

  // Trigger the shutdown handler and ensure resources close gracefully.
  for (const registration of onceRegistrations) {
    registration.listener(registration.event);
  }
  await flushMicrotasks();

  expect(workerCloseMock).toHaveBeenCalledWith(true);
  expect(queueEventsCloseMock).toHaveBeenCalledTimes(onceRegistrations.length);
  expect(disconnectFromDatabaseMock).toHaveBeenCalledTimes(onceRegistrations.length);
  expect(realtimeCloseMock).toHaveBeenCalledTimes(onceRegistrations.length);
  expect(process.exitCode).toBe(0);

  const rejectionHandler = onRegistrations.find((registration) => registration.event === 'unhandledRejection');
  expect(rejectionHandler).toBeDefined();
  rejectionHandler?.listener(new Error('expected rejection'));

  const exceptionHandler = onRegistrations.find((registration) => registration.event === 'uncaughtException');
  expect(exceptionHandler).toBeDefined();
  exceptionHandler?.listener(new Error('boom'));

  await flushMicrotasks();

  expect(consoleErrorSpy.mock.calls.some((call) => String(call[0]).includes('Unhandled promise rejection'))).toBe(true);
  expect(consoleErrorSpy.mock.calls.some((call) => String(call[0]).includes('Uncaught exception'))).toBe(true);
  const repositoryInstance = MongoNovelJobRepositoryMock.mock.results[0]?.value;
  const eventRepositoryInstance = MongoNovelJobEventRepositoryMock.mock.results[0]?.value;
  const metricsRepositoryInstance = MongoNovelJobMetricsRepositoryMock.mock.results[0]?.value;
  const metadataRepositoryInstance = MongoNovelJobMetadataRepositoryMock.mock.results[0]?.value;

  expect(repositoryInstance).toBeDefined();
  expect(eventRepositoryInstance).toBeDefined();
  expect(metricsRepositoryInstance).toBeDefined();
  expect(metadataRepositoryInstance).toBeDefined();
  expect(createNovelJobProcessorMock).toHaveBeenCalledWith(
    expect.any(Object),
    expect.any(Object),
    'novel-generation',
    {
      jobs: repositoryInstance,
      events: eventRepositoryInstance,
      metrics: metricsRepositoryInstance,
      metadata: metadataRepositoryInstance,
    },
    expect.objectContaining({ publish: expect.any(Function), close: expect.any(Function) }),
  );
});
