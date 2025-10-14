import type { ApiConfig } from '@letswriteabook/config';
import { NOVEL_REALTIME_CHANNEL, NOVEL_REALTIME_PROTOCOL_VERSION } from '@letswriteabook/messaging';
import { NovelEventsGateway } from './novel-events.gateway';
import { NovelEventsRedisSubscriber } from './novel-events.redis-subscriber';

jest.mock('ioredis', () => {
  const instances: Array<{
    readonly on: jest.Mock;
    readonly subscribe: jest.Mock;
    readonly connect: jest.Mock;
    readonly quit: jest.Mock;
    readonly options: Record<string, unknown>;
  }> = [];

  const RedisMock = jest.fn((_: string, options: Record<string, unknown>) => {
    const instance = {
      options,
      on: jest.fn(),
      subscribe: jest.fn().mockResolvedValue(1),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    instances.push(instance);

    return instance;
  });

  return {
    __esModule: true,
    default: RedisMock,
    Redis: RedisMock,
    __getInstances: () => instances,
    __reset: () => {
      RedisMock.mockClear();
      instances.length = 0;
    },
  };
});

jest.mock('@letswriteabook/config', () => {
  const actual = jest.requireActual('@letswriteabook/config');
  return {
    ...actual,
    parseRedisUrl: jest.fn(actual.parseRedisUrl),
  };
});

describe('NovelEventsRedisSubscriber', () => {
  const baseConfig: ApiConfig = {
    nodeEnv: 'development',
    port: 3001,
    mongoUri: undefined,
    redisUrl: 'redis://localhost:6379/0',
    openAiApiKey: undefined,
    socketClientOrigin: 'http://localhost:5173',
    sentryDsn: undefined,
    novelQueueName: 'novel-generation',
    socketMaxConnections: 0,
    socketMaxConnectionsPerOrigin: 0,
    socketMaxSubscriptionsPerClient: 20,
    socketIdleTimeoutMs: 5 * 60 * 1000,
    loggerLevels: ['log', 'error', 'warn'],
  };

  const createMockLogger = () => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  });

  const createGateway = () => ({
    broadcast: jest.fn(),
  }) as unknown as jest.Mocked<NovelEventsGateway>;

  beforeEach(() => {
    const redisModule = jest.requireMock('ioredis') as any;
    redisModule.__reset();
    const configModule = jest.requireMock('@letswriteabook/config') as typeof import('@letswriteabook/config') & {
      parseRedisUrl: jest.Mock;
    };
    configModule.parseRedisUrl.mockImplementation(() => ({ host: 'localhost', port: 6379 }));
    configModule.parseRedisUrl.mockClear();
    jest.clearAllMocks();
  });

  it('skips subscription when REDIS_URL is missing', async () => {
    const config: ApiConfig = { ...baseConfig, redisUrl: undefined };
    const gateway = createGateway();
    const subscriber = new NovelEventsRedisSubscriber(config, gateway);
    const logger = createMockLogger();
    (subscriber as any).logger = logger;

    await subscriber.onModuleInit();

    expect(logger.warn).toHaveBeenCalledWith('REDIS_URL is not configured. Realtime updates are disabled.');
    const redisModule = jest.requireMock('ioredis') as any;
    expect(redisModule.default).not.toHaveBeenCalled();
  });

  it('connects to Redis with retry strategy and subscribes to messages', async () => {
    const config: ApiConfig = { ...baseConfig };
    const gateway = createGateway();
    const subscriber = new NovelEventsRedisSubscriber(config, gateway);
    const logger = createMockLogger();
    (subscriber as any).logger = logger;

    await subscriber.onModuleInit();

    const redisModule = jest.requireMock('ioredis') as any;
    expect(redisModule.default).toHaveBeenCalledWith(
      config.redisUrl,
      expect.objectContaining({
        name: 'api-realtime-subscriber',
        lazyConnect: true,
        maxRetriesPerRequest: 2,
      }),
    );

    const instances = redisModule.__getInstances();
    expect(instances).toHaveLength(1);
    const client = instances[0];

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith(NOVEL_REALTIME_CHANNEL);
    expect(client.on).toHaveBeenCalledWith('message', expect.any(Function));

  const options = redisModule.default.mock.calls[0][1];
  logger.warn.mockClear();
  expect(options.retryStrategy?.(3)).toBe(4000);
  expect(logger.warn).toHaveBeenCalledWith('Retrying Redis realtime subscriber connection (attempt 3, delay 4000ms)');
  });

  it('broadcasts decoded messages and warns on version mismatch', () => {
    const config: ApiConfig = { ...baseConfig };
    const gateway = createGateway();
    const subscriber = new NovelEventsRedisSubscriber(config, gateway);
    const logger = createMockLogger();
    (subscriber as any).logger = logger;

    const event = {
      version: NOVEL_REALTIME_PROTOCOL_VERSION + 1,
      kind: 'job-status' as const,
      jobId: 'job-1',
      status: 'running' as const,
    };

    (subscriber as any).handleMessage(JSON.stringify(event));

    expect(gateway.broadcast).toHaveBeenCalledWith(expect.objectContaining({ jobId: 'job-1', status: 'running' }));
    expect(logger.warn.mock.calls.some(([message]: [unknown]) =>
      typeof message === 'string' && message.includes('Realtime payload version mismatch'),
    )).toBe(true);
  });

  it('logs errors for invalid messages and does not broadcast', () => {
    const config: ApiConfig = { ...baseConfig };
    const gateway = createGateway();
    const subscriber = new NovelEventsRedisSubscriber(config, gateway);
    const logger = createMockLogger();
    (subscriber as any).logger = logger;

    (subscriber as any).handleMessage('not-json');

    expect(logger.error).toHaveBeenCalledWith('Received invalid realtime message', expect.any(String));
    expect(gateway.broadcast).not.toHaveBeenCalled();
  });

  it('closes the Redis connection on destroy', async () => {
    const config: ApiConfig = { ...baseConfig };
    const gateway = createGateway();
    const subscriber = new NovelEventsRedisSubscriber(config, gateway);
    const logger = createMockLogger();
    (subscriber as any).logger = logger;

    await subscriber.onModuleInit();
    const redisModule = jest.requireMock('ioredis') as any;
    const [client] = redisModule.__getInstances();

    await subscriber.onModuleDestroy();

    expect(client.quit).toHaveBeenCalledTimes(1);
  });
});
