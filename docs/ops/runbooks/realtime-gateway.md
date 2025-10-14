# Realtime Gateway Runbook

**Service:** API Gateway (Socket.IO)  
**Owner:** Backend Team  
**Last Updated:** 2025-10-11

---

## Overview

The realtime gateway delivers novel generation progress events to web clients via Socket.IO, combining REST snapshots with catch-up replay from MongoDB and live Redis pub/sub. This runbook covers operational baselines, troubleshooting procedures, and recovery scenarios.

---

## Service Level Objectives (SLOs)

### Latency Baselines (Staging, 2025-10-11)

Based on load test results captured in [`docs/qa/load-test-reports/2025-10-11/`](../../qa/load-test-reports/2025-10-11/):

| Metric | Target | Measured (2025-10-11) | Status |
|--------|--------|----------------------|---------|
| Catch-up replay (120 events) | < 1500 ms | 157.24 ms | ✅ Pass |
| Broadcast p95 latency | < 600 ms | 115.81 ms | ✅ Pass |
| Event drops | 0 | 0 | ✅ Pass |

**Accepted Thresholds:**
- **Catch-up latency:** Single-subscriber replay of 120 stored events must complete in under 1500 ms (p95).
- **Broadcast latency:** p95 end-to-end latency for live events must stay below 600 ms under 200 concurrent subscribers receiving 10k messages.
- **Zero drops:** No events should be lost during normal operations; verify via event sequence gaps in client logs.

### Availability Target
- **Uptime:** 99.5% per month (allows ~3.6 hours downtime for maintenance).
- **Reconnect window:** Clients must successfully reconnect within 30 seconds after transient Redis or network failures.

---

## Monitoring & Alerts

### Key Metrics (Exposed via `/api/realtime/metrics`)

```json
{
  "activeConnections": 0,
  "totalSubscribers": 0,
  "subscriptionsByJob": {},
  "lastCatchUp": {
    "jobId": "load-test-catchup-...",
    "eventCount": 120,
    "durationMs": 157,
    "completedAt": "2025-10-11T05:47:32.123Z"
  }
}
```

**Alerting Rules:**
- **High latency:** Alert if catch-up replay exceeds 1200 ms (80% of threshold).
- **Connection spike:** Alert if `activeConnections` > 500 (80% of quota).
- **Redis disconnection:** Alert on subscriber reconnect loop > 3 attempts within 5 minutes.

### Log Signals

**Normal operation:**
```
[RealtimeGateway] Subscriber added for job <jobId> (total: 1)
[RealtimeGateway] Catch-up replay completed: 120 events in 157ms
```

**Warning signals:**
```
[RealtimeGateway] Catch-up replay slow: 980ms for job <jobId>
[RedisEventSubscriber] Reconnecting to Redis (attempt 2/5)...
```

**Error signals:**
```
[RealtimeGateway] Connection rejected: origin quota exceeded (10/10)
[RedisEventSubscriber] Failed to subscribe to channel after 5 attempts
```

---

## Common Scenarios

### 1. Redis Connection Loss

**Symptoms:**
- Clients receive only catch-up events; no live updates.
- Logs show `[RedisEventSubscriber] Reconnecting to Redis...` messages.

**Immediate Actions:**
1. Check Redis service health:
   ```powershell
   redis-cli ping
   ```
2. Verify API can reach Redis:
   ```powershell
   curl http://localhost:3000/health
   ```
   Expected: `"redis": "healthy"`

**Recovery:**
- **Auto-recovery:** Subscriber retries with exponential backoff (2s, 4s, 8s, 16s, 32s).
- **Manual intervention:** If retries exhausted, restart API service:
  ```powershell
  # Railway
  railway restart api
  
  # Local
  pnpm --filter @letswriteabook/api dev
  ```

**Prevention:**
- Ensure Redis has sufficient memory (monitor `used_memory_rss`).
- Configure Redis `maxmemory-policy` to `allkeys-lru` to prevent eviction issues.

---

### 2. Slow Catch-Up Replay

**Symptoms:**
- Catch-up duration > 1200 ms in `/api/realtime/metrics`.
- Clients report delayed initial data load.

**Diagnosis:**
1. Check MongoDB query performance:
   ```javascript
   db.novelJobEvents.find({ jobId: "..." }).sort({ timestamp: 1 }).explain("executionStats")
   ```
   Expected: Index scan on `jobId_1_timestamp_1`.

2. Verify index exists:
   ```javascript
   db.novelJobEvents.getIndexes()
   ```

**Remediation:**
- **Missing index:** Run migration:
  ```powershell
  pnpm --filter @letswriteabook/persistence migrate up
  ```
- **Large event count:** Consider archiving events older than 30 days to separate collection.

---

### 3. Connection Quota Exceeded

**Symptoms:**
- New clients receive `"Connection rejected: max connections reached"` error.
- `/api/realtime/metrics` shows `activeConnections` at 500.

**Immediate Actions:**
1. Identify idle connections:
   ```powershell
   # Check metrics for connections without subscriptions
   curl http://localhost:3000/api/realtime/metrics | jq '.activeConnections, .totalSubscribers'
   ```

2. Force idle cleanup (if automatic eviction isn't running):
   - Idle timeout is set to 5 minutes by default.
   - Restart gateway to clear stale sockets if needed.

**Long-term Fix:**
- **Horizontal scaling:** Deploy additional API instances behind a load balancer with sticky sessions.
- **Quota adjustment:** Increase `MAX_CONNECTIONS` in environment config (requires capacity planning).

---

### 4. Event Drops / Sequence Gaps

**Symptoms:**
- Client reports missing events (sequence numbers jump).
- Generation progress appears frozen despite worker activity.

**Diagnosis:**
1. Check Redis pub/sub status:
   ```redis
   PUBSUB NUMSUB realtime:events:novel-generation
   ```
   Expected: At least 1 subscriber (the API gateway).

2. Verify worker is publishing:
   ```powershell
   # Tail worker logs for event publish confirmations
   railway logs worker --tail 50 | grep "publishDomainEvent"
   ```

**Root Causes:**
- **Redis memory pressure:** Check `evicted_keys` metric; increase memory or adjust policy.
- **Network partition:** Transient network issues between worker and Redis.
- **Publisher not configured:** Verify `REDIS_URL` is set in worker environment.

**Recovery:**
- Missing events are **not replayed** from Redis (ephemeral transport).
- Clients should rely on catch-up replay to fill gaps after reconnection.

---

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] Verify MongoDB migration status: `pnpm --filter @letswriteabook/persistence migrate status`
- [ ] Confirm Redis is running and accessible
- [ ] Test `/health` endpoint returns all dependencies healthy
- [ ] Review active connections count; schedule deployment during low-traffic window if > 100 connections

### Deployment Steps
1. **Drain connections gracefully:**
   - API implements graceful shutdown; new connections are rejected 30s before exit.
   - Existing sockets receive `disconnect` event; clients auto-reconnect.

2. **Deploy new version:**
   ```powershell
   railway up api
   ```

3. **Validate post-deployment:**
   - Check `/health`: expect `200 OK`
   - Check `/api/realtime/metrics`: verify `activeConnections` rebuilding
   - Monitor logs for reconnection storms (should stabilize within 60s)

### Rollback Procedure
1. Identify previous working deployment:
   ```powershell
   railway deployments --service api
   ```

2. Revert to previous image:
   ```powershell
   railway rollback api <deployment-id>
   ```

3. Verify health checks pass within 2 minutes.

---

## Performance Tuning

### Catch-Up Optimization
- **Index coverage:** Ensure `novelJobEvents` has compound index on `(jobId, timestamp)`.
- **Projection:** Only fetch required fields: `{ eventType: 1, payload: 1, timestamp: 1 }`.
- **Pagination:** If event count > 500, consider paginated catch-up (not yet implemented).

### Broadcast Optimization
- **Redis pub/sub:** Keep message payloads < 1 KB; larger payloads should reference storage.
- **Socket.IO compression:** Enabled by default for messages > 1024 bytes.
- **Backpressure limits:** Current limits (500 connections, 10/origin, 5 subscriptions/socket) tuned for staging; adjust for production load.

---

## Disaster Recovery

### Full Service Outage

**Scenario:** Both API and Redis are down.

**Recovery Steps:**
1. Restore Redis from latest snapshot (Railway auto-backup).
2. Restart API service.
3. Clients will reconnect and receive catch-up replay from MongoDB (Redis pub/sub history is lost).

**Data Impact:**
- **Catch-up events:** Preserved in MongoDB; no loss.
- **In-flight Redis messages:** Lost (ephemeral); clients must rely on catch-up after reconnection.

### MongoDB Outage

**Scenario:** MongoDB unavailable; Redis still running.

**Impact:**
- Catch-up replay fails; clients receive only live events.
- New job subscriptions are rejected with `503 Service Unavailable`.

**Recovery:**
- Restore MongoDB connectivity.
- Clients retry subscription; catch-up replay resumes.

---

## Testing & Validation

### Load Test Execution

Run the realtime load test suite against staging:

```powershell
# From monorepo root
cd Letswriteabook

# Ensure API and dependencies are running
# (Mongo, Redis, API on port 3000)

# Execute suite
pnpm --filter @letswriteabook/realtime-load-test suite `
  --config configs/staging.json `
  --output docs/qa/load-test-reports/$(Get-Date -Format 'yyyy-MM-dd') `
  --label staging
```

**Expected Outcomes:**
- All scenarios pass (exit code 0).
- Artifacts generated in `docs/qa/load-test-reports/<date>/`.
- Metrics snapshots captured before/after each scenario.

### Manual Smoke Test

1. Open web app: `http://localhost:5173`
2. Start a novel generation job.
3. Observe realtime progress updates in browser console:
   ```javascript
   // Should see:
   [Realtime] Connected to gateway
   [Realtime] Subscribed to job <jobId>
   [Realtime] Received event: { type: 'generation.chapter.started', ... }
   ```
4. Kill Redis container: `docker stop redis`
5. Verify client logs show reconnection attempts.
6. Restart Redis: `docker start redis`
7. Confirm client reconnects and replays missed events.

---

## References

- **Load Test Reports:** [`docs/qa/load-test-reports/`](../../qa/load-test-reports/)
- **WebSocket Contract:** [`docs/contracts/websocket.md`](../../contracts/websocket.md)
- **Realtime API Spec:** [`docs/api/realtime.md`](../../api/realtime.md)
- **Integration Guide:** [`docs/web/realtime-integration.md`](../../web/realtime-integration.md)

---

**End of Runbook**
