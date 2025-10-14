import { Test } from '@nestjs/testing';
import { NovelEventsGateway } from './novel-events.gateway';
import { NovelEventsController } from './novel-events.controller';
import type { NovelEventsGatewayMetrics } from './novel-events.gateway';

describe('NovelEventsController', () => {
  it('returns gateway metrics', async () => {
    const metrics: NovelEventsGatewayMetrics = {
      totalConnections: 2,
      totalSubscriptions: 4,
      connectionsPerOrigin: { 'https://example.com': 2 },
      subscribersPerJob: { 'job-1': 2 },
      idleClients: 1,
      maxConnections: 50,
      maxConnectionsPerOrigin: 10,
      maxSubscriptionsPerClient: 5,
      idleTimeoutMs: 30000,
      lastCatchUp: {
        'job-1': {
          jobId: 'job-1',
          replayedEvents: 3,
          replaySource: 'events',
          replayDurationMs: 120,
          recordedAt: new Date().toISOString(),
        },
      },
    };

    const module = await Test.createTestingModule({
      controllers: [NovelEventsController],
      providers: [
        {
          provide: NovelEventsGateway,
          useValue: {
            getGatewayMetrics: jest.fn().mockReturnValue(metrics),
          },
        },
      ],
    }).compile();

    const controller = module.get(NovelEventsController);
    const result = controller.getMetrics();

    expect(result).toEqual(metrics);
  });
});
