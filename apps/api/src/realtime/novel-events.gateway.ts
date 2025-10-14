import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, ConnectedSocket, OnGatewayInit } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { ApiConfig } from '@letswriteabook/config';
import { API_CONFIG_TOKEN } from '../config/api-config.provider';
import {
  createDomainRealtimeEvent,
  createGenerationRealtimeEvent,
  createJobStatusRealtimeEvent,
  type NovelRealtimeEvent,
} from '@letswriteabook/messaging';
import {
  connectToDatabase,
  MongoNovelJobEventRepository,
  MongoNovelJobRepository,
} from '@letswriteabook/persistence';
import type {
  NovelJobAggregate,
  NovelJobEventRecord,
  NovelJobEventRepository,
  NovelJobRepository,
} from '@letswriteabook/domain';

const ROOM_PREFIX = 'job:';
const GENERATION_EVENT = 'novel.generation-event';
const DOMAIN_EVENT = 'novel.domain-event';
const JOB_STATUS_EVENT = 'novel.job-status';
const SUBSCRIBED_EVENT = 'novel.subscribed';
const UNSUBSCRIBED_EVENT = 'novel.unsubscribed';
const ERROR_EVENT = 'novel.error';
const CATCH_UP_FETCH_LIMIT = 250;
type ConnectionQuotaViolation = 'max-connections' | 'per-origin';

interface SubscriptionPayload {
  readonly jobId?: string;
}

interface SubscribeResponse {
  readonly jobId: string;
  readonly subscribedAt: string;
}

interface CatchUpMetrics {
  readonly jobId: string;
  readonly replayedEvents: number;
  readonly replaySource: 'events' | 'aggregate' | 'none';
  readonly replayDurationMs: number;
  readonly recordedAt: string;
}

export interface NovelEventsGatewayMetrics {
  readonly totalConnections: number;
  readonly totalSubscriptions: number;
  readonly connectionsPerOrigin: Record<string, number>;
  readonly subscribersPerJob: Record<string, number>;
  readonly idleClients: number;
  readonly maxConnections: number;
  readonly maxConnectionsPerOrigin: number;
  readonly maxSubscriptionsPerClient: number;
  readonly idleTimeoutMs: number;
  readonly lastCatchUp: Record<string, CatchUpMetrics>;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/ws',
})
@Injectable()
export class NovelEventsGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(NovelEventsGateway.name);
  private readonly socketSubscriptions = new Map<string, Set<string>>();
  private readonly clientOrigins = new Map<string, string>();
  private readonly originConnectionCounts = new Map<string, number>();
  private readonly idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly catchUpMetrics = new Map<string, CatchUpMetrics>();
  private readonly eventRepository: NovelJobEventRepository;
  private readonly jobRepository: NovelJobRepository;
  private readonly mongoUri?: string;
  private readonly maxConnections: number;
  private readonly maxConnectionsPerOrigin: number;
  private readonly maxSubscriptionsPerClient: number;
  private readonly idleTimeoutMs: number;
  private persistenceReady?: Promise<void>;
  private loggedMissingMongo = false;

  constructor(@Inject(API_CONFIG_TOKEN) private readonly config: ApiConfig) {
    this.mongoUri = config.mongoUri;
    this.eventRepository = new MongoNovelJobEventRepository();
    this.jobRepository = new MongoNovelJobRepository();
    this.maxConnections = Math.max(0, config.socketMaxConnections);
    this.maxConnectionsPerOrigin = Math.max(0, config.socketMaxConnectionsPerOrigin);
    this.maxSubscriptionsPerClient = Math.max(1, config.socketMaxSubscriptionsPerClient);
    this.idleTimeoutMs = Math.max(0, config.socketIdleTimeoutMs);
  }

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const originHeader = socket.handshake.headers.origin;

      if (originHeader && originHeader !== this.config.socketClientOrigin) {
        this.logger.warn(`Rejected client ${socket.id} from disallowed origin ${originHeader} during handshake.`);
        const error = new Error('Origin not allowed') as Error & { data?: unknown };
        error.data = { code: 'ORIGIN_NOT_ALLOWED' };
        next(error);
        return;
      }

      const originKey = this.normalizeOrigin(originHeader);
      const violation = this.detectConnectionQuotaViolation(originKey);
      if (violation) {
        const message = this.getQuotaRejectionMessage(violation);
        if (violation === 'max-connections') {
          this.logger.warn(
            `Rejected handshake from origin ${originKey} due to max realtime connections limit (${this.maxConnections}) reached.`,
          );
        } else {
          this.logger.warn(
            `Rejected handshake from origin ${originKey} due to per-origin limit (${this.maxConnectionsPerOrigin}).`,
          );
        }

        const error = new Error(message) as Error & { data?: unknown };
        error.data =
          violation === 'max-connections'
            ? { code: 'MAX_CONNECTIONS_EXCEEDED' }
            : { code: 'ORIGIN_CONNECTIONS_EXCEEDED' };
        next(error);
        return;
      }

      next();
    });
  }

  handleConnection(client: Socket): void {
    const originHeader = client.handshake.headers.origin;
    const originKey = this.normalizeOrigin(originHeader);

    if (originHeader && originHeader !== this.config.socketClientOrigin) {
      this.logger.warn(`Rejected client ${client.id} from disallowed origin ${originHeader}`);
      client.emit(ERROR_EVENT, { message: 'Origin not allowed' });
      client.disconnect(true);
      return;
    }

    if (!this.acceptConnectionQuota(client, originKey)) {
      return;
    }

    this.socketSubscriptions.set(client.id, new Set());
    this.clientOrigins.set(client.id, originKey);
    this.incrementOriginCount(originKey);
    this.touchIdleTimer(client.id);

    this.logger.log(`Client connected: ${client.id} (origin: ${originKey})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.socketSubscriptions.delete(client.id);
    this.clearIdleTimer(client.id);

    const originKey = this.clientOrigins.get(client.id);
    if (originKey) {
      this.decrementOriginCount(originKey);
      this.clientOrigins.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscriptionPayload): void {
    const jobId = payload?.jobId?.trim();

    if (!jobId) {
      this.logger.warn(`Client ${client.id} attempted to subscribe without jobId`);
      client.emit(ERROR_EVENT, { message: 'jobId is required to subscribe.' });
      return;
    }

    const subscriptions = this.socketSubscriptions.get(client.id) ?? new Set<string>();
    if (!subscriptions.has(jobId) && subscriptions.size >= this.maxSubscriptionsPerClient) {
      this.logger.warn(
        `Client ${client.id} attempted to exceed subscription limit (${this.maxSubscriptionsPerClient}).`,
      );
      client.emit(ERROR_EVENT, { message: 'Subscription limit reached for this connection.' });
      return;
    }

    const room = this.toRoom(jobId);
    client.join(room);

    subscriptions.add(jobId);
    this.socketSubscriptions.set(client.id, subscriptions);

    const response: SubscribeResponse = {
      jobId,
      subscribedAt: new Date().toISOString(),
    };

    client.emit(SUBSCRIBED_EVENT, response);
    this.logger.debug(`Client ${client.id} subscribed to ${room}`);
    this.touchIdleTimer(client.id);

    void this.sendCatchUp(client, jobId);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() payload: SubscriptionPayload): void {
    const jobId = payload?.jobId?.trim();
    if (!jobId) {
      client.emit(ERROR_EVENT, { message: 'jobId is required to unsubscribe.' });
      return;
    }

    const room = this.toRoom(jobId);
    client.leave(room);

    const existing = this.socketSubscriptions.get(client.id);
    existing?.delete(jobId);
    this.touchIdleTimer(client.id);

    client.emit(UNSUBSCRIBED_EVENT, {
      jobId,
      unsubscribedAt: new Date().toISOString(),
    });

    this.logger.debug(`Client ${client.id} unsubscribed from ${room}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong', { timestamp: Date.now() });
    this.touchIdleTimer(client.id);
  }

  broadcast(event: NovelRealtimeEvent): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized; dropping event');
      return;
    }

    const emittedAt = new Date().toISOString();
    this.emitToTarget(this.server.to(this.toRoom(event.jobId)), event, emittedAt);
  }

  private toRoom(jobId: string): string {
    return `${ROOM_PREFIX}${jobId}`;
  }

  private emitToTarget(
    target: { emit: (event: string, payload: unknown) => void },
    event: NovelRealtimeEvent,
    emittedAt: string,
  ): void {
    if (event.kind === 'generation') {
      target.emit(GENERATION_EVENT, {
        jobId: event.jobId,
        emittedAt,
        event: event.event,
      });
      return;
    }

    if (event.kind === 'domain') {
      target.emit(DOMAIN_EVENT, {
        jobId: event.jobId,
        emittedAt,
        event: event.event,
      });
      return;
    }

    target.emit(JOB_STATUS_EVENT, {
      jobId: event.jobId,
      emittedAt,
      status: event.status,
      snapshot: event.snapshot ?? null,
    });
  }

  private async sendCatchUp(client: Socket, jobId: string): Promise<void> {
    if (!(await this.ensurePersistence())) {
      return;
    }

    const startedAt = Date.now();
    let replayed = 0;
    let replaySource: CatchUpMetrics['replaySource'] = 'none';

    try {
      let records = await this.eventRepository.list(jobId, { limit: CATCH_UP_FETCH_LIMIT });

      if (records.length === 0) {
        const aggregate = await this.jobRepository.findByJobId(jobId);
        if (aggregate) {
          replaySource = 'aggregate';
          records = [this.buildStatusRecordFromAggregate(aggregate)];
        }
      } else {
        replaySource = 'events';
      }

      if (records.length === 0) {
        this.catchUpMetrics.set(jobId, {
          jobId,
          replayedEvents: 0,
          replaySource: 'none',
          replayDurationMs: Date.now() - startedAt,
          recordedAt: new Date().toISOString(),
        });
        return;
      }

      const chronological = [...records].reverse();
      for (const record of chronological) {
        const mapped = this.mapRecordToRealtime(record);
        if (!mapped) {
          continue;
        }

        this.emitToTarget(client, mapped.event, mapped.emittedAt);
        replayed += 1;
      }

      this.catchUpMetrics.set(jobId, {
        jobId,
        replayedEvents: replayed,
        replaySource,
        replayDurationMs: Date.now() - startedAt,
        recordedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send realtime catch-up for job ${jobId}`, message);
    }
  }

  private async ensurePersistence(): Promise<boolean> {
    if (!this.mongoUri) {
      if (!this.loggedMissingMongo) {
        this.logger.warn('MONGODB_URI is not configured; skipping realtime catch-up.');
        this.loggedMissingMongo = true;
      }
      return false;
    }

    if (!this.persistenceReady) {
      this.persistenceReady = connectToDatabase(this.mongoUri)
        .then(() => undefined)
        .catch((error) => {
          this.persistenceReady = undefined;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to connect to MongoDB for realtime catch-up', message);
          throw error;
        });
    }

    try {
      await this.persistenceReady;
      return true;
    } catch {
      return false;
    }
  }

  private mapRecordToRealtime(
    record: NovelJobEventRecord,
  ): { readonly event: NovelRealtimeEvent; readonly emittedAt: string } | null {
    if (record.kind === 'generation') {
      return {
        event: createGenerationRealtimeEvent(record.jobId, record.event),
        emittedAt: record.emittedAt,
      };
    }

    if (record.kind === 'domain') {
      return {
        event: createDomainRealtimeEvent(record.jobId, record.event),
        emittedAt: record.emittedAt,
      };
    }

    return {
      event: createJobStatusRealtimeEvent(record.jobId, record.status, record.snapshot),
      emittedAt: record.emittedAt,
    };
  }

  private buildStatusRecordFromAggregate(aggregate: NovelJobAggregate): NovelJobEventRecord {
    const snapshot = this.extractSnapshotFromAggregate(aggregate);

    return {
      kind: 'job-status',
      jobId: aggregate.id,
      emittedAt: aggregate.updatedAt instanceof Date ? aggregate.updatedAt.toISOString() : new Date().toISOString(),
      status: aggregate.status,
      snapshot,
    };
  }

  private extractSnapshotFromAggregate(aggregate: NovelJobAggregate): Record<string, unknown> | undefined {
    const snapshot: Record<string, unknown> = {};
    const aggregateSnapshot = aggregate.snapshot ?? {};

    if (aggregateSnapshot.summary) {
      snapshot.summary = aggregateSnapshot.summary;
    }

    if (aggregateSnapshot.progress) {
      snapshot.progress = aggregateSnapshot.progress;
    }

    return Object.keys(snapshot).length > 0 ? snapshot : undefined;
  }

  getGatewayMetrics(): NovelEventsGatewayMetrics {
    const subscribersPerJob = new Map<string, number>();
    let totalSubscriptions = 0;

    for (const subscriptions of this.socketSubscriptions.values()) {
      totalSubscriptions += subscriptions.size;
      for (const jobId of subscriptions) {
        subscribersPerJob.set(jobId, (subscribersPerJob.get(jobId) ?? 0) + 1);
      }
    }

    return {
      totalConnections: this.socketSubscriptions.size,
      totalSubscriptions,
      connectionsPerOrigin: this.mapToRecord(this.originConnectionCounts),
      subscribersPerJob: this.mapToRecord(subscribersPerJob),
      idleClients: this.idleTimers.size,
      maxConnections: this.maxConnections,
      maxConnectionsPerOrigin: this.maxConnectionsPerOrigin,
      maxSubscriptionsPerClient: this.maxSubscriptionsPerClient,
      idleTimeoutMs: this.idleTimeoutMs,
      lastCatchUp: this.mapToRecord(this.catchUpMetrics),
    };
  }

  private acceptConnectionQuota(client: Socket, originKey: string): boolean {
    const violation = this.detectConnectionQuotaViolation(originKey);
    if (!violation) {
      return true;
    }

    const message = this.getQuotaRejectionMessage(violation);
    client.emit(ERROR_EVENT, { message });
    client.disconnect(true);

    if (violation === 'max-connections') {
      this.logger.warn(
        `Rejected client ${client.id} due to max realtime connections limit (${this.maxConnections}) reached.`,
      );
    } else {
      this.logger.warn(
        `Rejected client ${client.id} from origin ${originKey} due to per-origin limit (${this.maxConnectionsPerOrigin}).`,
      );
    }

    return false;
  }

  private detectConnectionQuotaViolation(originKey: string): ConnectionQuotaViolation | undefined {
    if (this.maxConnections > 0 && this.socketSubscriptions.size >= this.maxConnections) {
      return 'max-connections';
    }

    const originCount = this.originConnectionCounts.get(originKey) ?? 0;
    if (this.maxConnectionsPerOrigin > 0 && originCount >= this.maxConnectionsPerOrigin) {
      return 'per-origin';
    }

    return undefined;
  }

  private getQuotaRejectionMessage(type: ConnectionQuotaViolation): string {
    return type === 'max-connections'
      ? 'Too many realtime connections. Please retry shortly.'
      : 'Too many connections from this origin. Please retry later.';
  }

  private incrementOriginCount(origin: string): void {
    this.originConnectionCounts.set(origin, (this.originConnectionCounts.get(origin) ?? 0) + 1);
  }

  private decrementOriginCount(origin: string): void {
    const next = (this.originConnectionCounts.get(origin) ?? 1) - 1;
    if (next <= 0) {
      this.originConnectionCounts.delete(origin);
    } else {
      this.originConnectionCounts.set(origin, next);
    }
  }

  private normalizeOrigin(originHeader?: string | string[]): string {
    if (Array.isArray(originHeader)) {
      return originHeader[0] ?? 'unknown';
    }

    if (originHeader && originHeader.length > 0) {
      return originHeader;
    }

    return 'unknown';
  }

  private touchIdleTimer(clientId: string): void {
    if (this.idleTimeoutMs <= 0) {
      return;
    }

    const existing = this.idleTimers.get(clientId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => this.handleIdleTimeout(clientId), this.idleTimeoutMs);
    this.idleTimers.set(clientId, timer);
  }

  private clearIdleTimer(clientId: string): void {
    const timer = this.idleTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(clientId);
    }
  }

  private handleIdleTimeout(clientId: string): void {
    this.idleTimers.delete(clientId);
    const socket = this.server?.sockets?.sockets.get(clientId);
    if (!socket) {
      return;
    }

    this.logger.warn(`Disconnecting client ${clientId} due to inactivity (${this.idleTimeoutMs}ms).`);
    socket.emit(ERROR_EVENT, { message: 'Disconnected due to inactivity.' });
    socket.disconnect(true);
  }

  private mapToRecord<T>(source: Map<string, T>): Record<string, T> {
    const record: Record<string, T> = {};
    for (const [key, value] of source.entries()) {
      record[key] = value;
    }
    return record;
  }
}
