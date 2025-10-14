# Phase 6 Realtime Load Test Report — 2025-10-10

_Last Updated: 2025-10-11_

This directory captures artifacts for the coordinated Phase 6/7 realtime staging validation. Populate the template below as you execute the suite and archive outputs.

---

# Run Overview

| Item | Value |
| --- | --- |
| Environment | staging |
| Harness Config | `tooling/realtime-load-test/configs/staging.json` |
| Output Directory | `docs/qa/load-test-reports/2025-10-10/` |
| Session Owner(s) | <!-- names / handles --> |
| Run Window | 2025-10-11 02:10Z |

**Suite Command**

```pwsh
pnpm --filter @letswriteabook/realtime-load-test suite -- --config tooling/realtime-load-test/configs/staging.json --output docs/qa/load-test-reports/2025-10-10 --label staging
```

**Metrics Diff Command**

```pwsh
pnpm --filter @letswriteabook/realtime-load-test compare-metrics --baseline docs/qa/load-test-reports/2025-10-10/staging-before-suite-metrics.json --target docs/qa/load-test-reports/2025-10-10/staging-after-suite-metrics.json --output docs/qa/load-test-reports/2025-10-10/metrics-diff.json
```

Archive raw scenario JSON, metrics snapshots, and diff output in this folder immediately after the run.

---

## Coordination Checklist

- [ ] Confirm staging Mongo URI and Redis URL (read/write credentials) received from Phase 6 owner.
- [ ] Confirm deployed gateway image tag / commit from DevOps.
- [ ] Align with QA on latency thresholds and acceptable error budgets.
- [ ] Announce execution window in #realtime-qa (or equivalent) and tag observers.
- [ ] Verify harness config (`staging.json`) matches the provided endpoints and quotas.

### Contact Matrix

| Area | Primary | Backup | Notes |
| --- | --- | --- | --- |
| Phase 6 Backend | <!-- name --> | <!-- backup --> | Mongo/Redis credentials, gateway config |
| DevOps / Infra | <!-- name --> | <!-- backup --> | Deployed image, environment overrides |
| QA Lead | <!-- name --> | <!-- backup --> | Accept/reject criteria |
| Frontend | <!-- name --> | <!-- backup --> | UI telemetry + playback |

---

## Environment Details

| Item | Value | Notes |
| --- | --- | --- |
| Staging API URL | <!-- e.g., https://staging-api.letswriteabook.com --> |  |
| Staging Web Origin | <!-- e.g., https://staging-app.letswriteabook.com --> |  |
| Redis URL | <!-- include username/password if temp credentials --> |  |
| Mongo URI | <!-- database + auth db --> |  |
| Harness Commit | <!-- git rev-parse HEAD --> |  |
| Gateway Build | <!-- docker tag / commit --> |  |
| Redis Reset Sequence | <!-- e.g., 80 --> |  |
| Redis Reset Delay (ms) | <!-- e.g., 1500 --> |  |

Attach the raw configuration snapshot (`config.md`) and preflight metrics JSON alongside this README after collection.

---

## Scenario Results

| Scenario | Status | Key Metrics | Artifact |
| --- | --- | --- | --- |
| Catch-up Burst | ✅ Pass | Replay max (ms): `148.04` · Failures: `0` | `staging-catch-up-burst.json` |
| Broadcast Burst | ✅ Pass | Latency p95 (ms): `107.51` · Dropped Events: `0` | `staging-broadcast-burst.json` |
| Reliability Drill | ☐ Pending | Redis reset recovery (s): `__` | `reliability-drill.log` |

Add narrative notes per scenario in the highlights section.

---

## Metrics Snapshot Diff

Use the `compare-metrics` helper to diff the snapshots listed below. Summarize notable deltas (connections, per-origin counts, idle clients, catch-up stats) in the notes column.

| Stage | File | Notes |
| --- | --- | --- |
| Before Suite | `staging-before-suite-metrics.json` | Max connections 500 · baseline idle state |
| After Catch-up Burst | `staging-after-catch-up-burst-metrics.json` | Catch-up job replayed 120 events |
| After Broadcast Burst | `staging-after-broadcast-burst-metrics.json` | 200 active connections, job swarm complete |
| After Suite | `staging-after-suite-metrics.json` | Connections drained; idle timers reset |
| Diff Report | `metrics-diff.json` | Added catch-up replay stats for synthetic jobs |

Attach the raw JSON files in this directory for traceability.

---

## Scenario Highlights

### Catch-up Burst
- Replay duration (max): `148` ms
- Replay failures: `0`
- Notes: Synthetic job `load-test-catchup-4b9b15f2-6676-4b93-a925-b50b4c4eb6d8` fully replayed from Mongo snapshot data.

### Broadcast Burst
- Publish latency (p95): `107.51` ms
- Dropped events: `0`
- Redis reset recovery time: _not triggered_ (threshold not reached)
- Notes: 200 websocket clients subscribed and received 50 events (10,000 total deliveries) without disconnect churn.

---

## Follow-ups

List any GitHub issues, ADRs, or remediation tasks raised from this run.

- [ ] None identified (broadcast and catch-up scenarios within thresholds).

---

## Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Backend Lead | <!-- signer --> | <!-- date --> |  |
| Frontend Lead | <!-- signer --> | <!-- date --> |  |
| QA Lead | <!-- signer --> | <!-- date --> |  |

Once all fields are complete and success criteria are met, update the Phase 6 and Phase 7 sections in `REBUILD_EXECUTION_PLAN.md` with a link to this report.
