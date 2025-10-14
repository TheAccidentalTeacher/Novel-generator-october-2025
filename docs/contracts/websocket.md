# WebSocket Contract

_Last Updated: 2025-10-06_<br>
_Owner: Backend Lead_

This document describes the realtime messaging contract between the API gateway and websocket clients. The implementation is backed by the TypeScript types exported from `@letswriteabook/messaging`; keep this file and the generated schemas in sync.

---

## Transport & Handshake

- **Endpoint:** `wss://<api-host>/ws`
- **Protocol:** Socket.IO (WebSocket preferred, long-polling fallback)
- **Origin enforcement:** connections must match the configured `SOCKET_CLIENT_ORIGIN`.

### Connection Flow

1. Client establishes Socket.IO connection.
2. Client emits `subscribe` with `{ jobId: string }`.
3. Server joins the socket to room `job:<jobId>` and replies with:
	 ```json
	 {
		 "event": "novel.subscribed",
		 "payload": {
			 "jobId": "job-123",
			 "subscribedAt": "2025-10-06T12:00:00.000Z"
		 }
	 }
	 ```
4. The gateway replays the most recent persisted events for that job (see *Catch-up Replay* below).
5. Client can optionally emit `ping`; server responds with `pong { timestamp: number }`.
6. Client can leave the room with `unsubscribe { jobId }`, receiving `novel.unsubscribed` confirmation.

Invalid subscription requests emit `novel.error { message }` and retain the socket outside the room.

---

## Payload Envelope

Every realtime message adheres to the *Novel Realtime Protocol*. The encoded payload (prior to Socket.IO decoration) is:

```json
{
	"version": 1,
	"kind": "generation" | "domain" | "job-status",
	"jobId": "job-123",
	... // kind-specific fields
}
```

- `version` (number) — protocol version. The gateway currently publishes version `1`. Clients **must** ignore messages with newer versions and may surface a warning.
- `kind` (string) — discriminator for the payload shape.
- `jobId` (string) — unique identifier for the novel generation job.

The helper constructors in `@letswriteabook/messaging` (`createGenerationRealtimeEvent`, `createDomainRealtimeEvent`, `createJobStatusRealtimeEvent`) guarantee the structure and populate the `version` field automatically.

---

## Event Catalogue

### 1. Generation Events

- **Socket event:** `novel.generation-event`
- **Description:** Streams granular progress logs from the AI engine (stage transitions, token counts, etc.).
- **Payload:**
	```json
	{
		"jobId": "job-123",
		"emittedAt": "2025-10-06T12:01:30.000Z",
		"event": {
			"type": "stage-log",
			"occurredAt": "2025-10-06T12:01:30.000Z",
			"stage": "analysis",
			"level": "info",
			"message": "Outline completed",
			"details": {
				"chapters": 12
			}
		}
	}
	```

### 2. Domain Events

- **Socket event:** `novel.domain-event`
- **Description:** Emits domain-level milestones produced by the worker (e.g., `job-completed`, `continuity-alert`).
- **Payload:**
	```json
	{
		"jobId": "job-123",
		"emittedAt": "2025-10-06T12:02:05.000Z",
		"event": {
			"type": "job-completed",
			"occurredAt": "2025-10-06T12:02:05.000Z",
			"message": "Novel generation finished",
			"progress": {
				"outlineComplete": true,
				"chaptersCompleted": 12,
				"chaptersFailed": 0,
				"totalChapters": 12,
				"hasFailures": false
			}
		}
	}
	```

### 3. Job Status Updates

- **Socket event:** `novel.job-status`
- **Description:** Reports coarse job state transitions.
- **Payload:**
	```json
	{
		"jobId": "job-123",
		"emittedAt": "2025-10-06T12:02:05.000Z",
		"status": "completed",
		"snapshot": {
			"queue": "novel-generation",
			"durationMs": 365000,
			"chaptersGenerated": 12,
			"totalWordCount": 42000,
			"totalChaptersPlanned": 12
		}
	}
	```

Status values: `queued`, `running`, `completed`, `failed`.

---

## Catch-up Replay

Upon a successful subscription, the gateway replays persisted events so late joiners receive the latest context:

1. The most recent 50 entries from `NovelJobEventRepository.list(jobId)` are fetched (newest first, delivered oldest first).
2. Each stored record is re-encoded via the messaging helpers and emitted directly to the subscribing socket using the canonical Socket.IO event names above. The original `emittedAt` timestamps are preserved.
3. If no events are stored yet, the gateway queries the job aggregate and emits a synthetic `novel.job-status` snapshot reflecting the last known status.

The catch-up pipeline requires `MONGODB_URI`. When it is not configured, the gateway logs a warning and skips the replay without failing the subscription.

---

## Heartbeats & Disconnects

- Clients may send `ping`; the server responds with `pong { timestamp }`.
- The gateway removes socket membership on disconnect and logs the event.
- Idle sockets are disconnected after `SOCKET_IDLE_TIMEOUT_MS` milliseconds (default 5 minutes) with `novel.error { message: "Disconnected due to inactivity." }`.
- Stale connections should periodically send a heartbeat (implementation detail to be handled in the Phase 7 frontend rebuild).

---

## Backpressure & Quotas

Realtime capacity is guarded by environment-configurable quotas:

| Setting | Default | Effect |
|---------|---------|--------|
| `SOCKET_MAX_CONNECTIONS` | `0` (disabled) | Caps total concurrent socket connections; excess clients are rejected with `novel.error { message: "Too many realtime connections. Please retry shortly." }` |
| `SOCKET_MAX_CONNECTIONS_PER_ORIGIN` | `0` (disabled) | Limits concurrent connections sharing the same `Origin` header; excess clients receive `novel.error { message: "Too many connections from this origin. Please retry later." }` |
| `SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT` | `20` | Limits unique job rooms per socket; exceeding the limit emits `novel.error { message: "Subscription limit reached for this connection." }` |
| `SOCKET_IDLE_TIMEOUT_MS` | `300000` (5 minutes) | Disconnects idle sockets to reclaim capacity |

Gateway metrics (`NovelEventsGateway#getGatewayMetrics`) expose live counts for total connections, per-origin usage, per-job subscribers, idle timers, and catch-up replay stats for observability dashboards.

---

## Error Semantics

| Code / Event          | Scenario                                  | Behaviour                              |
|----------------------|--------------------------------------------|----------------------------------------|
| `novel.error`        | Missing jobId, disallowed origin, etc.     | Sends `{ message }`, refuses subscription |
| `novel.error`        | Backpressure guardrails triggered (connection limit, per-origin limit, subscription cap, idle timeout) | Communicates limit breach and disconnects the socket |
| Redis publish failure| Worker cannot publish to Redis             | Worker logs error, event replay available via catch-up |
| Redis subscriber loss| API logs error, reconnects with exponential backoff, emits warning to logs |

Errors do **not** change the websocket schema; clients should surface user-friendly messaging where appropriate.

---

## Versioning Policy

- Protocol version is monotonic (`1`, `2`, ...). Breaking changes increment the version.
- Older clients must drop unknown versions gracefully and optionally request a refresh.
- Additive changes (new fields) remain under the same version; fields are added with sensible defaults to maintain backwards compatibility.

Upcoming changes should follow the ADR workflow and update both this document and the shared messaging package before deployment.
