import type { ApiConfig } from '@letswriteabook/config';
import type { Server } from 'socket.io';
import {
  createGenerationRealtimeEvent,
  createJobStatusRealtimeEvent,
  type NovelRealtimeEvent,
} from '@letswriteabook/messaging';
import type { NovelJobEventRecord, NovelJobAggregate } from '@letswriteabook/domain';
import { NovelEventsGateway } from './novel-events.gateway';

function createGateway(config: Partial<ApiConfig> = {}): NovelEventsGateway {
  const gateway = new NovelEventsGateway({
    nodeEnv: 'development',
    port: 0,
    socketClientOrigin: 'http://localhost:5173',
    novelQueueName: 'novel-generation',
    mongoUri: undefined,
    redisUrl: undefined,
    openAiApiKey: undefined,
    sentryDsn: undefined,
    socketMaxConnections: 0,
    socketMaxConnectionsPerOrigin: 0,
    socketMaxSubscriptionsPerClient: 20,
    socketIdleTimeoutMs: 0,
    ...config,
  } as ApiConfig);

  return gateway;
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('NovelEventsGateway', () => {
  it('rejects connections from disallowed origins', () => {
    const gateway = createGateway({ socketClientOrigin: 'https://allowed.origin' });
    const disconnect = jest.fn();
    const emit = jest.fn();

    const client = {
      id: 'socket-1',
      handshake: {
        headers: {
          origin: 'https://evil.origin',
        },
      },
      disconnect,
      emit,
    } as any;

    gateway.handleConnection(client);

    expect(emit).toHaveBeenCalledWith('novel.error', { message: 'Origin not allowed' });
    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('enforces maximum concurrent connections', () => {
    const gateway = createGateway({ socketMaxConnections: 1 });

    const firstClient = {
      id: 'socket-a',
      handshake: { headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    gateway.handleConnection(firstClient);

    const secondClient = {
      id: 'socket-b',
      handshake: { headers: {} },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    gateway.handleConnection(secondClient);

    expect(secondClient.emit).toHaveBeenCalledWith('novel.error', {
      message: 'Too many realtime connections. Please retry shortly.',
    });
    expect(secondClient.disconnect).toHaveBeenCalledWith(true);
  });

  it('enforces per-origin connection limits', () => {
    const allowedOrigin = 'https://app.example';
    const gateway = createGateway({
      socketClientOrigin: allowedOrigin,
      socketMaxConnectionsPerOrigin: 1,
    });

    const makeClient = (id: string) =>
      ({
        id,
        handshake: { headers: { origin: allowedOrigin } },
        emit: jest.fn(),
        disconnect: jest.fn(),
      }) as any;

    const firstClient = makeClient('socket-origin-1');
    gateway.handleConnection(firstClient);

    const secondClient = makeClient('socket-origin-2');
    gateway.handleConnection(secondClient);

    expect(secondClient.emit).toHaveBeenCalledWith('novel.error', {
      message: 'Too many connections from this origin. Please retry later.',
    });
    expect(secondClient.disconnect).toHaveBeenCalledWith(true);
  });

  it('subscribes and unsubscribes clients to rooms', () => {
    const gateway = createGateway();
    const join = jest.fn();
    const leave = jest.fn();
    const emit = jest.fn();

    const client = {
      id: 'socket-2',
      handshake: { headers: {} },
      join,
      leave,
      emit,
    } as any;

    gateway.handleConnection(client);
    gateway.handleSubscribe(client, { jobId: 'job-123' });

    expect(join).toHaveBeenCalledWith('job:job-123');
    expect(emit).toHaveBeenCalledWith('novel.subscribed', expect.objectContaining({ jobId: 'job-123' }));

    gateway.handleUnsubscribe(client, { jobId: 'job-123' });

    expect(leave).toHaveBeenCalledWith('job:job-123');
    expect(emit).toHaveBeenCalledWith('novel.unsubscribed', expect.objectContaining({ jobId: 'job-123' }));
  });

  it('rejects subscriptions beyond the per-client limit', () => {
    const gateway = createGateway({ socketMaxSubscriptionsPerClient: 1 });
    const join = jest.fn();
    const emit = jest.fn();

    const client = {
      id: 'socket-limit',
      handshake: { headers: {} },
      join,
      leave: jest.fn(),
      emit,
    } as any;

    gateway.handleConnection(client);
    gateway.handleSubscribe(client, { jobId: 'job-1' });

    gateway.handleSubscribe(client, { jobId: 'job-2' });

    expect(join).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('novel.error', {
      message: 'Subscription limit reached for this connection.',
    });
  });

  it('broadcasts events to job rooms', () => {
    const gateway = createGateway();
    const roomEmit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit: roomEmit });

    (gateway as any).server = {
      to,
    };

    const generationEvent: NovelRealtimeEvent = createGenerationRealtimeEvent('job-789', {
      type: 'stage-log',
      occurredAt: '2025-01-01T00:00:00.000Z',
    });

    gateway.broadcast(generationEvent);

    expect(to).toHaveBeenCalledWith('job:job-789');
    expect(roomEmit).toHaveBeenCalledWith('novel.generation-event', expect.objectContaining({ jobId: 'job-789' }));

    const statusEvent: NovelRealtimeEvent = createJobStatusRealtimeEvent('job-789', 'completed', {
      durationMs: 1200,
    });

    gateway.broadcast(statusEvent);

    expect(roomEmit).toHaveBeenCalledWith(
      'novel.job-status',
      expect.objectContaining({ jobId: 'job-789', status: 'completed' }),
    );
  });

  it('triggers catch-up after subscription', async () => {
    const gateway = createGateway();
    const join = jest.fn();
    const emit = jest.fn();
    const sendCatchUp = jest.fn().mockResolvedValue(undefined);
    (gateway as any).sendCatchUp = sendCatchUp;

    const client = {
      id: 'socket-3',
      handshake: { headers: {} },
      join,
      leave: jest.fn(),
      emit,
    } as any;

    gateway.handleConnection(client);
    gateway.handleSubscribe(client, { jobId: 'job-321' });

    await flushMicrotasks();

    expect(sendCatchUp).toHaveBeenCalledWith(client, 'job-321');
  });

  it('disconnects idle clients after the configured timeout', () => {
    jest.useFakeTimers();
    const gateway = createGateway({ socketIdleTimeoutMs: 1000 });
    const emit = jest.fn();
    const disconnect = jest.fn();
    const client = {
      id: 'socket-idle',
      handshake: { headers: {} },
      emit,
      disconnect,
    } as any;

    (gateway as any).server = {
      sockets: {
        sockets: new Map([[client.id, client]]),
      },
      to: jest.fn(),
    } as unknown as Server;

    gateway.handleConnection(client);

    jest.advanceTimersByTime(1000);

    expect(emit).toHaveBeenCalledWith('novel.error', { message: 'Disconnected due to inactivity.' });
    expect(disconnect).toHaveBeenCalledWith(true);

    jest.useRealTimers();
  });

  it('reports gateway metrics for connections and subscriptions', () => {
    const gateway = createGateway();
    const join = jest.fn();
    const emit = jest.fn();

    const client = {
      id: 'socket-metrics',
      handshake: { headers: {} },
      join,
      leave: jest.fn(),
      emit,
    } as any;

    gateway.handleConnection(client);
    gateway.handleSubscribe(client, { jobId: 'job-42' });

    const metrics = gateway.getGatewayMetrics();

    expect(metrics.totalConnections).toBe(1);
    expect(metrics.totalSubscriptions).toBe(1);
    expect(metrics.subscribersPerJob['job-42']).toBe(1);
    expect(metrics.connectionsPerOrigin.unknown).toBe(1);
  });

  it('sends persisted events to the subscribing client during catch-up', async () => {
    const gateway = createGateway();
    const ensurePersistence = jest.fn().mockResolvedValue(true);
    const generationRecord: NovelJobEventRecord = {
      kind: 'generation',
      jobId: 'job-abc',
      emittedAt: '2025-01-01T00:01:00.000Z',
      event: {
        type: 'stage-log',
        occurredAt: '2025-01-01T00:01:00.000Z',
      },
    } as NovelJobEventRecord;
    const statusRecord: NovelJobEventRecord = {
      kind: 'job-status',
      jobId: 'job-abc',
      emittedAt: '2025-01-01T00:00:00.000Z',
      status: 'running',
      snapshot: { stage: 'analysis' },
    } as NovelJobEventRecord;

    (gateway as any).mongoUri = 'mongodb://localhost:27017/test';
    (gateway as any).ensurePersistence = ensurePersistence;
    (gateway as any).eventRepository = {
      list: jest.fn().mockResolvedValue([generationRecord, statusRecord]),
    };
    (gateway as any).jobRepository = {
      findByJobId: jest.fn(),
    };

    const emit = jest.fn();
    const client = { emit } as any;

    await (gateway as any).sendCatchUp(client, 'job-abc');

    expect(ensurePersistence).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toBe('novel.job-status');
    expect(emit.mock.calls[0][1]).toMatchObject({
      jobId: 'job-abc',
      emittedAt: '2025-01-01T00:00:00.000Z',
      status: 'running',
    });
    expect(emit.mock.calls[1][0]).toBe('novel.generation-event');
    expect(emit.mock.calls[1][1]).toMatchObject({
      jobId: 'job-abc',
      emittedAt: '2025-01-01T00:01:00.000Z',
      event: expect.objectContaining({ type: 'stage-log' }),
    });
  });

  it('falls back to job aggregate when no events are stored', async () => {
    const gateway = createGateway();
    const ensurePersistence = jest.fn().mockResolvedValue(true);
    const aggregate: Partial<NovelJobAggregate> = {
      id: 'job-xyz',
      status: 'completed',
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      snapshot: {
        summary: { totalWordCount: 42000, chaptersGenerated: 12, totalChaptersPlanned: 12 },
        progress: {
          outlineComplete: true,
          chaptersCompleted: 12,
          chaptersFailed: 0,
          totalChapters: 12,
          hasFailures: false,
        },
        events: [],
        domainEvents: [],
      },
    };

    (gateway as any).mongoUri = 'mongodb://localhost:27017/test';
    (gateway as any).ensurePersistence = ensurePersistence;
    (gateway as any).eventRepository = {
      list: jest.fn().mockResolvedValue([]),
    };
    (gateway as any).jobRepository = {
      findByJobId: jest.fn().mockResolvedValue(aggregate),
    };

    const emit = jest.fn();
    const client = { emit } as any;

    await (gateway as any).sendCatchUp(client, 'job-xyz');

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toBe('novel.job-status');
    expect(emit.mock.calls[0][1]).toMatchObject({
      status: 'completed',
      snapshot: expect.objectContaining({
        summary: expect.objectContaining({ totalWordCount: 42000 }),
        progress: expect.objectContaining({ chaptersCompleted: 12 }),
      }),
    });
  });
});
