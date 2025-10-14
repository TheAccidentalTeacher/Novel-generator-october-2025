# Realtime Novel Updates API

The API exposes a Socket.IO gateway that streams generation progress, domain milestones, and job status updates for each novel job.

## Connection

- **Endpoint:** `ws[s]://<api-host>/ws`
- **Transport:** Socket.IO (websocket + long polling fallback)
- **Origin restriction:** The server only accepts connections from the `SOCKET_CLIENT_ORIGIN` configured in the API environment.

Example client setup using Socket.IO:

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.example.com', {
  path: '/ws',
  transports: ['websocket'],
});

socket.on('connect', () => {
  socket.emit('subscribe', { jobId: 'job-123' });
});
```

## Subscription Lifecycle

| Event               | Direction        | Payload                                             | Notes                                                                 |
|---------------------|------------------|-----------------------------------------------------|-----------------------------------------------------------------------|
| `subscribe`         | Client → Server  | `{ jobId: string }`                                 | Joins the job-specific room. `jobId` is required.                     |
| `novel.subscribed`  | Server → Client  | `{ jobId: string; subscribedAt: string }`           | Confirms the subscription and triggers catch-up replay.               |
| `unsubscribe`       | Client → Server  | `{ jobId: string }`                                 | Leaves the job-specific room.                                         |
| `novel.unsubscribed`| Server → Client  | `{ jobId: string; unsubscribedAt: string }`         | Confirms that the socket left the room.                               |
| `ping`              | Client → Server  | `void`                                              | Optional heartbeat.                                                   |
| `pong`              | Server → Client  | `{ timestamp: number }`                             | Response to `ping`.                                                   |
| `novel.error`       | Server → Client  | `{ message: string }`                               | Returned for invalid subscriptions, disallowed origins, quota breaches, and idle disconnects. |

## Protocol Envelope

All realtime payloads conform to the *Novel Realtime Protocol v1* and include the job identifier. Events are broadcast only to clients subscribed to that job.

```json
{
  "version": 1,
  "kind": "generation" | "domain" | "job-status",
  "jobId": "job-123",
  "emittedAt": "2025-10-04T10:00:30.000Z",
  ... // kind-specific data
}
```

- `version` is incremented for breaking changes. Clients must ignore versions they cannot handle and may surface a warning.
- `kind` discriminates the payload and matches the Socket.IO event name below.
- Helper constructors in `@letswriteabook/messaging` populate the envelope and perform schema validation.

## Realtime Events

### Generation Events

- **Event name:** `novel.generation-event`
- **Payload:**
  ```json
  {
    "jobId": "job-123",
    "emittedAt": "2025-10-04T10:00:30.000Z",
    "event": {
      "type": "stage-log",
      "occurredAt": "2025-10-04T10:00:30.000Z",
      "stage": "analysis",
      "level": "info",
      "message": "analysis complete"
    }
  }
  ```
- Mirrors the serialized generation event emitted by the AI engine.

### Domain Events

- **Event name:** `novel.domain-event`
- **Payload:** Serialized domain event produced by the worker. Useful for workflow automation or UI summaries. The envelope includes `event.type`, `occurredAt`, and optional contextual fields depending on the domain event subtype.

### Job Status Updates

- **Event name:** `novel.job-status`
- **Payload:**
  ```json
  {
    "jobId": "job-123",
    "emittedAt": "2025-10-04T10:05:00.000Z",
    "status": "completed",
    "snapshot": {
      "queue": "novel-generation",
      "durationMs": 300000,
      "chaptersGenerated": 12,
      "totalWordCount": 45000
    }
  }
  ```
- Status can be `queued`, `running`, `completed`, or `failed`.
- The `snapshot` field contains contextual metadata for dashboards.

## Catch-up Replay

After `novel.subscribed` the gateway attempts to replay persisted history so late joiners receive relevant context:

1. Load the latest 50 stored events for the job from MongoDB (`NovelJobEventRepository`).
2. Emit each event to the subscribing socket using the same Socket.IO event names listed above. Events preserve their original `emittedAt` timestamps.
3. If no events exist yet, emit a synthetic `novel.job-status` snapshot derived from the job aggregate, allowing UIs to render the last known state.

If MongoDB is not configured, the gateway skips the replay and logs a warning while keeping the subscription active.

## Backpressure & Metrics

- **Connection caps:**
  - `SOCKET_MAX_CONNECTIONS` limits total concurrent sockets (0 disables the guardrail).
  - `SOCKET_MAX_CONNECTIONS_PER_ORIGIN` caps sockets that share the same `Origin` header.
- **Subscription caps:** `SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT` (default 20) bounds the number of unique job rooms per socket.
- **Idle eviction:** `SOCKET_IDLE_TIMEOUT_MS` (default 300 000 ms) disconnects sockets that neither send heartbeats nor subscribe/unsubscribe within the window.
- **Metrics:** `NovelEventsGateway#getGatewayMetrics()` exposes totals for connections, subscriptions, per-origin usage, per-job subscriber counts, idle timers, and catch-up replay statistics. Surface these values via Prometheus or logging sinks in Phase 8.

## Redis Channel Contract

The worker publishes realtime events to the Redis channel `novel.realtime.events`, using the JSON schema defined in `packages/messaging`. The API subscribes with retry/backoff and forwards validated messages to connected clients. Version mismatches are logged and dropped.

## Error Handling

- Invalid subscription requests (missing `jobId`) emit `novel.error` to the sender.
- Connections from origins other than `SOCKET_CLIENT_ORIGIN` are rejected.
- Redis connectivity hiccups trigger exponential backoff; events published while disconnected are recovered during catch-up.
- Connection, origin, or subscription limits emit `novel.error` with a descriptive message and disconnect the socket.
- Idle sockets are disconnected after `SOCKET_IDLE_TIMEOUT_MS` with an explanatory `novel.error` payload.
- When the API cannot deliver an event (e.g., gateway not ready) the event is dropped and a warning is logged; the worker retains full job history in MongoDB for catch-up.

## Versioning & Compatibility

- Protocol version is currently `1`. Increment the version for breaking schema changes.
- Minor additive fields remain under the same version but must be optional for legacy clients.
- Clients should treat unknown `kind` or `version` values as no-ops and surface diagnostics instead of crashing.
