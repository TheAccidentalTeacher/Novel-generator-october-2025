import type { ApiConfig } from '@letswriteabook/config';
import { HealthService } from './health.service';
import type { ReadinessPayload } from './health.types';

const mongoCommandMock = jest.fn();
const mongoCloseMock = jest.fn();

jest.mock('mongodb', () => {
  return {
    MongoClient: jest.fn().mockImplementation(() => ({
      db: () => ({ command: mongoCommandMock }),
      close: mongoCloseMock,
    })),
  } as unknown;
});

const redisPingMock = jest.fn();
const redisDisconnectMock = jest.fn();

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    ping: redisPingMock,
    disconnect: redisDisconnectMock,
  })),
);

function createConfig(overrides: Partial<ApiConfig> = {}): ApiConfig {
  return {
    nodeEnv: 'development',
    port: 3001,
    mongoUri: undefined,
    redisUrl: undefined,
    openAiApiKey: undefined,
    socketClientOrigin: 'http://localhost:5173',
    sentryDsn: undefined,
    novelQueueName: 'novel-generation',
    socketMaxConnections: 0,
    socketMaxConnectionsPerOrigin: 0,
    socketMaxSubscriptionsPerClient: 20,
    socketIdleTimeoutMs: 5 * 60 * 1000,
    loggerLevels: ['log', 'error', 'warn'],
    ...overrides,
  } satisfies ApiConfig;
}

describe('HealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoCommandMock.mockReset();
    mongoCloseMock.mockReset();
    redisPingMock.mockReset();
    redisDisconnectMock.mockReset();
  });

  it('returns unknown dependency statuses when services are not configured', async () => {
    const service = new HealthService(createConfig());

    const readiness = (await service.readiness()) as ReadinessPayload;

    expect(readiness.dependencies.mongo).toBe('unknown');
    expect(readiness.dependencies.redis).toBe('unknown');
    expect(mongoCommandMock).not.toHaveBeenCalled();
    expect(redisPingMock).not.toHaveBeenCalled();
  });

  it('reports unhealthy when dependency checks fail', async () => {
    mongoCommandMock.mockRejectedValueOnce(new Error('mongo down'));
    redisPingMock.mockRejectedValueOnce(new Error('redis down'));

    const service = new HealthService(
      createConfig({
        mongoUri: 'mongodb://root:example@localhost:27017/letswriteabook?authSource=admin',
        redisUrl: 'redis://localhost:6379',
      }),
    );

    const readiness = await service.readiness();

    expect(readiness.dependencies.mongo).toBe('unhealthy');
    expect(readiness.dependencies.redis).toBe('unhealthy');
    expect(mongoCloseMock).toHaveBeenCalled();
    expect(redisDisconnectMock).toHaveBeenCalled();
  });
});
