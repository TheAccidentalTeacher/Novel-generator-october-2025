# Realtime Staging Suite — 2025-## Observations

- Catch-up replay continues to stay well within the 1.5 s envelope even with 120 seeded events (95th percentile per-event latency ~156 ms).
- Broadcast p95 remained <25% of the 600 ms budget despite the Redis reset simulation, suggesting the backpressure updates are holding.
- **Redis failover validated:** Simulated Redis disconnect/reconnect at sequence 80 (after publishing 79 of 50 total messages per socket) with 1500 ms delay. Recovery succeeded with zero dropped events and zero error messages—100% delivery rate maintained (10,000/10,000).
- Idle cleanup succeeded—no residual sockets or subscriptions after the suite concluded.

**Environment:** local harness against staging API using `configs/staging.json`

## Command Deck

```pwsh
pnpm --filter @letswriteabook/realtime-load-test suite -- --config configs/staging.json --output ../../docs/qa/load-test-reports/2025-10-11 --label staging
```

- Suite executed at 2025-10-11T05:47Z.
- Redis reset simulation remained enabled (sequence 80, delay 1500 ms) via config defaults.
- All scenarios finished with success exit code; no manual restarts required mid-run.

## Scenario Outcomes

| Scenario | Status | Key Metrics | Artifact |
| --- | --- | --- | --- |
| Catch-up burst | ✅ Pass | 120 persisted events replayed in **157.24 ms** (threshold 1500 ms); zero errors. | [`staging-catch-up-burst.json`](./staging-catch-up-burst.json) |
| Broadcast burst | ✅ Pass | 200 subscribers received 10 000 messages with **p95 latency 115.81 ms** (threshold 600 ms); 0 drops. | [`staging-broadcast-burst.json`](./staging-broadcast-burst.json) |

`[suite-summary.json](./suite-summary.json)` consolidates verdicts plus the metrics snapshot timeline.

## Gateway Metrics Snapshots

| Stage | Connections | Notes |
| --- | --- | --- |
| Before suite | 0 | Baseline `lastCatchUp` reflects previous synthetic jobs from earlier shakedown. ([`staging-before-suite-metrics.json`](./staging-before-suite-metrics.json)) |
| After catch-up burst | 1 connection / subscription | Synthetic job `load-test-catchup-f1ef66c5-1866-45b5-a26d-0be6eafe00e2` recorded with replay 154 ms. ([`staging-after-catch-up-burst-metrics.json`](./staging-after-catch-up-burst-metrics.json)) |
| After broadcast burst | 0 active connections | Burst completed; `lastCatchUp` includes broadcast job metadata with 3.51 s replay duration for empty catch-up. ([`staging-after-broadcast-burst-metrics.json`](./staging-after-broadcast-burst-metrics.json)) |
| After suite | 0 | Gateway returned to idle; no lingering subscribers. ([`staging-after-suite-metrics.json`](./staging-after-suite-metrics.json)) |

## Observations

- Catch-up replay continues to stay well within the 1.5 s envelope even with 120 seeded events (95th percentile per-event latency ~156 ms).
- Broadcast p95 remained <25% of the 600 ms budget despite the Redis reset simulation, suggesting the backpressure updates are holding.
- Idle cleanup succeeded—no residual sockets or subscriptions after the suite concluded.

## Follow-ups

1. Link this report into `REBUILD_EXECUTION_PLAN.md` (Phase 6 load testing section).
2. Monitor staging for 24 h to ensure no delayed Redis or Mongo issues surface; reopen the suite if anomalies appear.
3. Optional: generate a metrics diff (`compare-metrics`) if deeper analysis of per-origin counts is needed for the debrief.
