import http, { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import type {
  ListNovelJobEventsResponse,
  ListNovelJobsResponse,
  NovelJobDetailResponse,
  NovelJobEventResponse,
  NovelJobMetadataResponse,
  NovelJobMetricsResponse,
  NovelJobPayload,
  NovelJobSummaryResponse,
  SerializedDomainEvent,
  SerializedGenerationEvent,
} from '@letswriteabook/shared-types';

const PORT = Number.parseInt(process.env.MOCK_STAGING_PORT ?? '3001', 10);
const CLIENT_ORIGIN = process.env.MOCK_STAGING_CLIENT_ORIGIN ?? 'http://localhost:5173';
const QUEUE_NAME = 'mock-novel-queue';

interface JobState {
  detail: NovelJobDetailResponse;
  metadata: NovelJobMetadataResponse;
  metrics: NovelJobMetricsResponse;
  timeline: NovelJobEventResponse[];
  generationEvents: SerializedGenerationEvent[];
  domainEvents: SerializedDomainEvent[];
  timers: NodeJS.Timeout[];
}

const jobs = new Map<string, JobState>();

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost:${PORT}'}`);
  const { pathname } = url;

  try {
    if (req.method === 'GET' && pathname === '/api/novel') {
      handleListJobs(res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/novel') {
      await handleCreateJob(req, res);
      return;
    }

    const jobMatch = pathname.match(/^\/api\/novel\/([^/]+)(?:\/(events|metrics|metadata))?$/);
    if (jobMatch) {
      const jobId = decodeURIComponent(jobMatch[1]);
      const resource = (jobMatch[2] ?? 'detail') as 'detail' | 'events' | 'metrics' | 'metadata';
        await handleJobResource(req, res, jobId, resource, url);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/realtime/metrics') {
      handleGatewayMetrics(res);
      return;
    }

    sendJson(res, 404, { message: 'Not found' });
  } catch (error) {
    console.error('[mock-staging] Request handler error', error);
    sendJson(res, 500, { message: 'Internal server error' });
  }
});

const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
  path: '/ws',
});

io.on('connection', (socket: Socket) => {
  socket.on('subscribe', (payload: { jobId?: string }) => {
    const jobId = payload?.jobId?.trim();
    if (!jobId) {
      socket.emit('novel.error', 'jobId is required to subscribe.');
      return;
    }

    const job = jobs.get(jobId);
    if (!job) {
      socket.emit('novel.error', `Job ${jobId} not found.`);
      return;
    }

    socket.join(toRoom(jobId));
    socket.emit('novel.subscribed', { jobId, subscribedAt: new Date().toISOString() });
    sendCatchUp(socket, jobId, job);
  });

  socket.on('unsubscribe', (payload: { jobId?: string }) => {
    const jobId = payload?.jobId?.trim();
    if (!jobId) {
      socket.emit('novel.error', 'jobId is required to unsubscribe.');
      return;
    }

    socket.leave(toRoom(jobId));
    socket.emit('novel.unsubscribed', { jobId, unsubscribedAt: new Date().toISOString() });
  });
});

function sendCatchUp(socket: Socket, jobId: string, job: JobState): void {
  const chronological = [...job.timeline].reverse();
  for (const event of chronological) {
    emitTimelineEvent(socket, event);
  }
}

function broadcastEvent(jobId: string, event: NovelJobEventResponse): void {
  io.to(toRoom(jobId)).emit(mapEventName(event), mapEventPayload(event));
}

function emitTimelineEvent(target: Socket, event: NovelJobEventResponse): void {
  target.emit(mapEventName(event), mapEventPayload(event));
}

function mapEventName(event: NovelJobEventResponse): string {
  if (event.kind === 'generation') {
    return 'novel.generation-event';
  }

  if (event.kind === 'domain') {
    return 'novel.domain-event';
  }

  return 'novel.job-status';
}

function mapEventPayload(event: NovelJobEventResponse): Record<string, unknown> {
  if (event.kind === 'generation') {
    return {
      jobId: event.jobId,
      emittedAt: event.emittedAt,
      event: event.event,
    };
  }

  if (event.kind === 'domain') {
    return {
      jobId: event.jobId,
      emittedAt: event.emittedAt,
      event: event.event,
    };
  }

  return {
    jobId: event.jobId,
    emittedAt: event.emittedAt,
    status: event.status,
    snapshot: event.snapshot ?? null,
  };
}

function toRoom(jobId: string): string {
  return `job:${jobId}`;
}

function handleListJobs(res: ServerResponse): void {
  const items: NovelJobSummaryResponse[] = Array.from(jobs.values()).map((job) => {
    const { detail } = job;
    return {
      jobId: detail.jobId,
      status: detail.status,
      queue: detail.queue,
      payload: detail.payload,
      requestedAt: detail.requestedAt,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      progress: detail.progress,
      summary: detail.summary,
      engine: detail.engine,
    } satisfies NovelJobSummaryResponse;
  });

  const response: ListNovelJobsResponse = {
    items,
    count: items.length,
  };

  sendJson(res, 200, response);
}

async function handleCreateJob(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const rawBody = await readJson(req);
  const bodyRecord: Record<string, unknown> = isRecord(rawBody) ? rawBody : {};
  const payloadCandidate = isRecord(bodyRecord.payload) ? (bodyRecord.payload as Record<string, unknown>) : bodyRecord;
  const payload = payloadCandidate as Partial<NovelJobPayload>;

  const resolvedPayload: NovelJobPayload = {
    title: payload.title?.trim() || 'Untitled novel',
    premise:
      payload.premise?.trim() ||
      'A daring explorer uncovers a hidden civilization inside a living, sentient forest that reshapes reality.',
    genre: payload.genre?.trim() || 'Science Fiction',
    subgenre: payload.subgenre?.trim() || 'Solarpunk',
    targetWordCount: Number.isFinite(payload.targetWordCount) ? Number(payload.targetWordCount) : 60000,
    targetChapters: Number.isFinite(payload.targetChapters) ? Number(payload.targetChapters) : 12,
    humanLikeWriting: Boolean(payload.humanLikeWriting ?? true),
  } satisfies NovelJobPayload;

  const job = createJob(resolvedPayload);

  sendJson(res, 202, {
    status: 'queued',
    jobId: job.detail.jobId,
    queue: job.detail.queue,
    createdAt: job.detail.createdAt,
  });
}

async function handleJobResource(
  req: IncomingMessage,
  res: ServerResponse,
  jobId: string,
  resource: 'detail' | 'events' | 'metrics' | 'metadata',
  url: URL,
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    sendJson(res, 404, { message: `Job ${jobId} not found.` });
    return;
  }

  if (resource === 'detail') {
    sendJson(res, 200, job.detail);
    return;
  }

  if (resource === 'metrics') {
    sendJson(res, 200, job.metrics);
    return;
  }

  if (resource === 'metadata') {
    sendJson(res, 200, job.metadata);
    return;
  }

  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(200, Math.max(1, Number.parseInt(limitParam, 10) || 50)) : 50;
  const items = job.timeline.slice(0, limit);

  const response: ListNovelJobEventsResponse = {
    count: items.length,
    items,
  };

  sendJson(res, 200, response);
}

function handleGatewayMetrics(res: ServerResponse): void {
  const connections = Array.from(io.sockets.sockets.values());
  const subscribers: Record<string, number> = {};
  for (const [room, clients] of io.sockets.adapter.rooms) {
    if (!room.startsWith('job:')) {
      continue;
    }
    subscribers[room.replace('job:', '')] = clients.size;
  }

  sendJson(res, 200, {
    activeConnections: connections.length,
    subscribers,
    jobs: Array.from(jobs.values()).map((job) => ({ jobId: job.detail.jobId, status: job.detail.status })),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createJob(payload: NovelJobPayload): JobState {
  const jobId = `demo-${randomUUID()}`;
  const now = new Date().toISOString();

  const detail: NovelJobDetailResponse = {
    jobId,
    status: 'queued',
    queue: QUEUE_NAME,
    payload,
    requestedAt: now,
    createdAt: now,
    updatedAt: now,
    progress: {
      outlineComplete: false,
      chaptersCompleted: 0,
      chaptersFailed: 0,
      totalChapters: payload.targetChapters,
      hasFailures: false,
    },
    summary: null,
    engine: {
      clientType: 'mock',
    },
    outline: [],
    chapters: [],
    events: [],
    domainEvents: [],
    context: {
      job: {
        jobId,
        title: payload.title,
        premise: payload.premise,
        genre: payload.genre,
        subgenre: payload.subgenre,
        targetWordCount: payload.targetWordCount,
        targetChapters: payload.targetChapters,
        humanLikeWriting: payload.humanLikeWriting,
      },
      chapters: [],
    },
    failures: [],
  } satisfies NovelJobDetailResponse;

  const metadata: NovelJobMetadataResponse = {
    jobId,
    storyBible: {
      characters: {
        protagonist: {
          name: 'Lyra Chen',
          summary: 'Botanist-turned-diplomat navigating sentient ecosystems.',
        },
      },
      metadata: null,
      locations: null,
      themes: ['Resilience', 'Cooperation', 'Ecological harmony'],
    },
    continuityAlerts: [],
    aiDecisions: [],
    enhancements: [],
    performance: null,
    updatedAt: now,
  } satisfies NovelJobMetadataResponse;

  const metrics: NovelJobMetricsResponse = {
    jobId,
    cost: {
      totalUsd: 0,
      analysisUsd: 0,
      outlineUsd: 0,
      chaptersUsd: 0,
    },
    tokens: {
      total: 0,
      analysis: 0,
      outline: 0,
      chapters: 0,
    },
    latencyMs: {},
    updatedAt: now,
  } satisfies NovelJobMetricsResponse;

  const job: JobState = {
    detail,
    metadata,
    metrics,
    timeline: [],
    generationEvents: [],
    domainEvents: [],
    timers: [],
  };

  jobs.set(jobId, job);
  initiateLifecycle(jobId);

  return job;
}

function initiateLifecycle(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  setJobStatus(jobId, 'queued', { stage: 'queued' });

  job.timers.push(
    setTimeout(() => setJobStatus(jobId, 'running', { stage: 'analysis' }), 1000),
  );

  job.timers.push(
    setTimeout(
      () =>
        addGenerationEvent(jobId, {
          type: 'stage.analysis.completed',
          occurredAt: new Date().toISOString(),
          summary: 'Analysis stage completed successfully.',
        }),
      2000,
    ),
  );

  job.timers.push(
    setTimeout(
      () =>
        addGenerationEvent(jobId, {
          type: 'stage.outline.completed',
          occurredAt: new Date().toISOString(),
          chapters: job.detail.payload.targetChapters,
          outlineComplete: true,
        }),
      3500,
    ),
  );

  job.timers.push(
    setTimeout(() => {
      setJobStatus(jobId, 'completed', {
        stage: 'completed',
        durationMs: 5500,
        chaptersGenerated: job.detail.payload.targetChapters,
        totalWordCount: Math.round(job.detail.payload.targetWordCount * 0.95),
      });
      updateMetricsForCompletion(jobId);
    }, 5500),
  );
}

function setJobStatus(jobId: string, status: 'queued' | 'running' | 'completed' | 'failed', snapshot?: Record<string, unknown>): void {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  const emittedAt = new Date().toISOString();
  let progress = job.detail.progress;
  let summary = job.detail.summary;

  if (status === 'running') {
    progress = {
      outlineComplete: false,
      chaptersCompleted: 0,
      chaptersFailed: 0,
      totalChapters: job.detail.payload.targetChapters,
      hasFailures: false,
    };
    summary = null;
  }

  if (status === 'completed') {
    progress = {
      outlineComplete: true,
      chaptersCompleted: job.detail.payload.targetChapters,
      chaptersFailed: 0,
      totalChapters: job.detail.payload.targetChapters,
      hasFailures: false,
    };
    summary = {
      chaptersGenerated: job.detail.payload.targetChapters,
      totalChaptersPlanned: job.detail.payload.targetChapters,
      totalWordCount: Math.round(job.detail.payload.targetWordCount * 0.95),
    };
  }

  job.detail = {
    ...job.detail,
    status,
    updatedAt: emittedAt,
    progress,
    summary,
  } satisfies NovelJobDetailResponse;

  const event: NovelJobEventResponse = {
    kind: 'job-status',
    jobId,
    emittedAt,
    status,
    snapshot: snapshot ?? null,
  };

  prependTimeline(job, event);
  broadcastEvent(jobId, event);
}

function addGenerationEvent(jobId: string, event: SerializedGenerationEvent): void {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  const emittedAt = event.occurredAt ?? new Date().toISOString();
  const enriched: SerializedGenerationEvent = {
    ...event,
    occurredAt: emittedAt,
  };

  job.generationEvents = [...job.generationEvents, enriched];
  job.detail = {
    ...job.detail,
    events: job.generationEvents,
    updatedAt: emittedAt,
  } satisfies NovelJobDetailResponse;

  const timelineEvent: NovelJobEventResponse = {
    kind: 'generation',
    jobId,
    emittedAt,
    event: enriched,
  };

  prependTimeline(job, timelineEvent);
  broadcastEvent(jobId, timelineEvent);
}

function updateMetricsForCompletion(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) {
    return;
  }

  const emittedAt = new Date().toISOString();
  job.metrics = {
    ...job.metrics,
    cost: {
      totalUsd: 12.34,
      analysisUsd: 2.1,
      outlineUsd: 1.8,
      chaptersUsd: 8.44,
    },
    tokens: {
      total: 48000,
      analysis: 8000,
      outline: 6000,
      chapters: 34000,
    },
    updatedAt: emittedAt,
  } satisfies NovelJobMetricsResponse;
}

function prependTimeline(job: JobState, event: NovelJobEventResponse): void {
  job.timeline = [event, ...job.timeline].slice(0, 250);
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`Mock staging API listening on http://localhost:${PORT}`);
  console.log(`Allowing frontend origin ${CLIENT_ORIGIN}`);
  // bootstrap a default job for convenience
  createJob({
    title: 'Nebula Wake',
    premise: 'A first-contact mission inside a sentient nebula.',
    genre: 'Science Fiction',
    subgenre: 'First Contact',
    targetWordCount: 75000,
    targetChapters: 15,
    humanLikeWriting: true,
  });
});
