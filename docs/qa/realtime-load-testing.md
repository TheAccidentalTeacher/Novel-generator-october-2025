# Realtime Gateway Load Testing Plan

_Last Updated: 2025-10-11_<br>
_Owner: Backend Engineer_

This plan describes how we will validate the Socket.IO gateway hardening completed in Phase 6. The objective is to prove that the realtime stack sustains expected production load while enforcing the new backpressure guardrails and maintaining acceptable latency for event delivery.

> Tracking when each scenario must run and who owns it now lives in the consolidated QA Test Roadmap (`docs/qa/test-roadmap.md`). Align the roadmap before launching any new harness runs so evidence lands in the expected folders.

---

## Goals & Success Criteria

1. **Connection quotas**: When `SOCKET_MAX_CONNECTIONS` and `SOCKET_MAX_CONNECTIONS_PER_ORIGIN` are configured, excess clients must be rejected within 200 ms and the gateway metrics should show the limit is not exceeded.
2. **Subscription caps**: A single socket must not hold more than `SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT` active rooms. Attempts beyond the limit should emit `novel.error` once per offending request.
3. **Idle eviction**: With `SOCKET_IDLE_TIMEOUT_MS` set to a low threshold (≤5 s for testing), inactive clients should disconnect automatically and free their slot.
4. **Catch-up throughput**: Replaying 50 persisted events to a freshly subscribed client must complete in under 1 s, and no more than 1% of catch-up attempts may fail.
5. **Broadcast latency**: When 200 concurrent subscribers receive a burst of 100 events, the 95th percentile end-to-end latency (publish → client receipt) must stay below 500 ms.

A run passes when all goals are met and no unexpected gateway errors are logged.

---

## Test Environment

| Component | Purpose | Notes |
| --- | --- | --- |
| API (`apps/api`) | Hosts the Socket.IO gateway under test. | Launch with quotas tuned for each scenario. |
| Redis | Drives the realtime pub/sub channel (`novel.realtime.events`). | Provided via `infra/compose/docker-compose.dev.yml`. |
| MongoDB | Stores events for catch-up replay scenarios. | Optional for pure connection tests, required for catch-up validation. |

### Local bootstrap

1. `pnpm install`
2. `docker compose -f infra/compose/docker-compose.dev.yml up -d redis mongodb`
3. `pnpm --filter api dev`

For automated runs use the harness command shown below (`pnpm --filter @letswriteabook/realtime-load-test run -- --scenario <name>`).

---

## Tooling & Harness

We now ship a bespoke TypeScript harness under `tooling/realtime-load-test/` (`@letswriteabook/realtime-load-test`). The harness provides:

- Fine-grained Socket.IO client control (origin headers, pacing, sequencing) via `socket.io-client`.
- White-box assertions by pulling the gateway metrics endpoint directly from the API.
- Structured JSON output that captures expectations, metrics deltas, and per-attempt diagnostics for dashboards/CI.
- Scenario modules for connection quota, per-origin quota, and subscription cap coverage (additional workflows pending).

> **Why not Artillery/k6?** We still need tight control over Socket.IO protocol semantics, Redis-driven catch-up, and custom origin headers. Purpose-built tooling keeps dependencies low and aligns with the monorepo developer workflow.

### Running the harness

```pwsh
pnpm --filter @letswriteabook/realtime-load-test run -- --scenario connection-quota --origin http://localhost:5173
```

Common flags:

- `--scenario` (`connection-quota`, `origin-quota`, `subscription-cap`, `idle-eviction`, `catch-up-burst`, `broadcast-burst`).
- `--config` (optional) points to a JSON file with shared defaults (see below).
- `--api-url`/`--ws-path` to target non-default gateways.
- `--origin` set to the allowed origin header (can be provided via config file).
- `--attempts`, `--extras`, `--job-count` to override scenario attempt counts.
- `--mongo-uri` for catch-up replay seeding (requires Mongo running).
- `--redis-url` for broadcast bursts (publishes to `novel.realtime.events`).
- `--redis-reset-sequence`/`--redis-reset-delay` to simulate a Redis outage during broadcast scenarios.
- `--json` toggles machine-readable output (pipe or redirect to persist alongside logs).

JSON results can be archived under `docs/qa/load-test-reports/<date>` for traceability.

### Config-driven runs

The harness now supports reusable defaults via `--config`. A sample file lives at `tooling/realtime-load-test/configs/staging.sample.json`; copy it to `tooling/realtime-load-test/configs/staging.json`, replace the placeholder URLs/secrets, and commit it to your local `.gitignore` (do **not** commit credentials).

Example structure:

```json
{
	"apiUrl": "https://staging-api.letswriteabook.com",
	"origin": "https://staging-app.letswriteabook.com",
	"redisUrl": "redis://...",
	"mongoUri": "mongodb+srv://...",
	"options": { "delayMs": 25, "settleMs": 500, "redisResetSequence": 0, "redisResetDelayMs": 1000 },
	"scenarioOptions": {
		"catch-up-burst": { "eventCount": 120, "replayThresholdMs": 1500 },
		"broadcast-burst": { "clientCount": 200, "latencyThresholdMs": 600, "redisResetSequence": 80, "redisResetDelayMs": 1500 }
	}
}
```

With the config file in place the command surface becomes:

```pwsh
pnpm --filter @letswriteabook/realtime-load-test run -- --scenario catch-up-burst --config tooling/realtime-load-test/configs/staging.json --json > docs/qa/load-test-reports/<date>/catch-up-burst-staging.json
```

### Automated suite runner

To streamline staging validation, use the suite helper to execute both burst scenarios sequentially and archive the outputs:

```pwsh
pnpm --filter @letswriteabook/realtime-load-test suite -- --config tooling/realtime-load-test/configs/staging.json --output docs/qa/load-test-reports/<date> --label staging
```

Key behaviours:

- Runs `catch-up-burst` then `broadcast-burst`, applying any scenario overrides defined in the config file.
- Writes one JSON artifact per scenario plus `suite-summary.json` to the target output directory (created if missing).
- Captures gateway metrics snapshots before the suite, after each scenario, and after the final scenario. Files are named `<label>-<stage>-metrics.json` when a label is provided (for example, `staging-before-suite-metrics.json`).
- Inherits the config file’s Redis reset settings; add `--skip-redis-reset` to the suite command to disable the simulated outage.
- Returns a non-zero exit code if any scenario fails, making it CI-friendly.

### Metrics diff helper

After a suite run, quickly inspect how gateway state shifted by diffing two snapshot files:

```pwsh
pnpm --filter @letswriteabook/realtime-load-test compare-metrics --baseline docs/qa/load-test-reports/<date>/staging-before-suite-metrics.json --target docs/qa/load-test-reports/<date>/staging-after-suite-metrics.json --output docs/qa/load-test-reports/<date>/metrics-diff.json
```

By default only changed metrics are printed (total connections, per-origin counts, catch-up stats, etc.). Pass `--all` to include zero-delta readings. When `--output` is provided, a machine-friendly JSON report is generated alongside the console summary for audit logs.

---

## Scenarios

| Scenario | Description | Harness status | Env overrides |
| --- | --- | --- | --- |
| `connection-quota` | Ramp clients until `SOCKET_MAX_CONNECTIONS` is reached, verify the `(maxConnections + 1)`th client is rejected with `novel.error`. | ✅ automated via harness | `SOCKET_MAX_CONNECTIONS=50`, `SOCKET_MAX_CONNECTIONS_PER_ORIGIN=0` |
| `origin-quota` | Split clients across the allowed origin header and confirm the per-origin cap triggers. | ✅ automated via harness | `SOCKET_MAX_CONNECTIONS=0`, `SOCKET_MAX_CONNECTIONS_PER_ORIGIN=25` |
| `subscription-cap` | Let one socket subscribe to `N` job rooms, expect an error on the `(N+1)`th subscribe call. | ✅ automated via harness | `SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT=5` |
| `idle-eviction` | Hold 20 sockets idle and ensure each disconnects within `idleTimeout + 500ms`. | ✅ automated via harness | `SOCKET_IDLE_TIMEOUT_MS=2000` |
| `catch-up-burst` | Seed Mongo with synthetic events and confirm catch-up replay completes under the configured threshold. | ✅ automated via harness | `MONGODB_URI` configured; quotas relaxed to allow catch-up |
| `broadcast-burst` | Publish a burst of realtime events to hundreds of subscribers and enforce p95 latency within budget. | ✅ automated via harness | `REDIS_URL` configured; quotas allow `--client-count` |

### Latest Results — 2025-10-11

- **Catch-up burst (staging)** – 120 persisted events replayed in **157.24 ms** (threshold 1500 ms) with zero errors. Metrics confirm the gateway recorded the synthetic job under `lastCatchUp`. ([JSON](./load-test-reports/2025-10-11/staging-catch-up-burst.json))
- **Broadcast burst (staging)** – 200 subscribers received **10 000 messages** with **p95 latency 115.81 ms** (threshold 600 ms) and no dropped deliveries. ([JSON](./load-test-reports/2025-10-11/staging-broadcast-burst.json))
- **Suite summary & metrics** – `suite-summary.json` captures both scenario verdicts plus before/after metrics snapshots (`staging-before-suite-metrics.json`, `staging-after-catch-up-burst-metrics.json`, `staging-after-broadcast-burst-metrics.json`, `staging-after-suite-metrics.json`). ([Folder](./load-test-reports/2025-10-11/))

Suite executions automatically persist gateway metrics snapshots (connections, per-origin counts, idle clients) before the run, after each scenario, and once more after completion. Diff them with the helper command above when investigating deltas.

### Historical Results — 2025-10-06

- **Connection quota** – 53 attempts, 50 accepted, 3 rejected with `"Too many realtime connections"`. Metrics snapshots confirm peak concurrent sockets at 50. ([JSON](./load-test-reports/2025-10-06/connection-quota.json))
- **Per-origin quota** – 28 attempts from `http://localhost:5173`, 25 accepted before hitting the per-origin cap, 3 rejections with `"Too many connections from this origin"`. ([JSON](./load-test-reports/2025-10-06/origin-quota.json))
- **Subscription cap** – Single socket successfully subscribed to 5 rooms; subsequent 3 attempts rejected with `"Subscription limit reached"`. ([JSON](./load-test-reports/2025-10-06/subscription-cap.json))
- **Idle eviction** – 10 idle sockets disconnected within 1.98 s (timeout 2.0 s + 250 ms buffer), all clients received `"Disconnected due to inactivity."`. ([JSON](./load-test-reports/2025-10-06/idle-eviction.json))

Artifacts for this run live under `docs/qa/load-test-reports/2025-10-06/` for auditability and provide the pre-hardening baseline for quota-related scenarios.

---

## Staging Suite Artifacts — 2025-10-11

| Artifact | Target Path | Owner | Notes |
| --- | --- | --- | --- |
| Preflight metrics snapshot | `docs/qa/load-test-reports/2025-10-11/staging-before-suite-metrics.json` | Backend Engineer | Auto-captured when the suite runner started; use as baseline for diffs. |
| Catch-up burst results | `docs/qa/load-test-reports/2025-10-11/staging-catch-up-burst.json` | Backend Engineer | Replay duration 157.24 ms; includes detailed per-event latencies. |
| Broadcast burst results | `docs/qa/load-test-reports/2025-10-11/staging-broadcast-burst.json` | Backend Engineer | 10 000 deliveries with p95 latency 115.81 ms. |
| Suite summary | `docs/qa/load-test-reports/2025-10-11/suite-summary.json` | Backend Engineer | Consolidates verdicts plus references to all metrics snapshots. |
| Metrics snapshots | `docs/qa/load-test-reports/2025-10-11/staging-*-metrics.json` | Backend Engineer | Before/after JSON dumps suitable for compare-metrics tooling. |

Populate folder-level README or follow-up notes as needed, then link highlights back into `REBUILD_EXECUTION_PLAN.md` (Phases 6 and 7).

---

## Staging Execution Checklist (Phase 6 Exit)

Run this sequence once the staging environment exposes the hardened gateway with Mongo/Redis fixtures:

1. **Verify prerequisites**
	- Staging API URL (e.g., `https://staging-api.letswriteabook.com`) reachable and returning healthy status.
	- Staging Redis connection string available (read-only publish credentials approved).
	- Staging Mongo seeded with representative job history or enable harness seeding flag.
	- Local `tooling/realtime-load-test/configs/staging.json` generated from the sample template and populated with staging endpoints.

2. **Capture baseline metrics**
	- When using the suite runner, confirm the generated `<label>-before-suite-metrics.json` file exists (manual fetch optional if you want to double-check the endpoint).
	- Record current gateway configuration (`SOCKET_*` env values) in the same folder (`config.md`).

3. **Execute catch-up burst**
	```pwsh
	pnpm --filter @letswriteabook/realtime-load-test run -- --scenario catch-up-burst --config tooling/realtime-load-test/configs/staging.json --json > docs/qa/load-test-reports/<date>/catch-up-burst-staging.json
	```
	- Inspect harness summary for replay duration and error counts.
	- Append findings + any anomalies to `docs/qa/load-test-reports/<date>/README.md`.

4. **Execute broadcast burst**
	```pwsh
	pnpm --filter @letswriteabook/realtime-load-test run -- --scenario broadcast-burst --config tooling/realtime-load-test/configs/staging.json --client-count 150 --json > docs/qa/load-test-reports/<date>/broadcast-burst-staging.json
	```
	- Ensure p95 latency < 500 ms (or target documented SLA). Escalate if exceeded.

	_Alternative_: run both bursts via the automated suite command documented above to generate all artifacts plus `suite-summary.json` in one pass.

> **Quick run deck (share before session):**
> 1. Announce run start in #realtime-qa with link to the target folder (for example `docs/qa/load-test-reports/<date>/README.md`).
> 2. Run catch-up burst command, paste p95 replay time into Slack, attach JSON artifact commit.
> 3. Run broadcast burst command, paste p95 latency and dropped-event count, attach JSON artifact commit.
> 4. Flag any anomalies immediately; otherwise confirm completion and schedule debrief (15 min).

5. **Reliability drills**
	- During broadcast run, bounce the staging Redis instance (if safe) or simulate the outage with `--redis-reset-sequence <n>` (e.g., 80) to observe reconnect behaviour. Adjust `--redis-reset-delay` to mirror expected downtime.
	- Document recovery time and note any dropped events.

6. **Post-run metrics**
	- Review the suite-generated `*-after-<scenario>-metrics.json` and `*-after-suite-metrics.json` files. Diff them against the baseline snapshot and spot-check any unexpected deltas. If you skipped the suite, re-query `GET /internal/realtime/metrics` manually.
	- File a short summary in `docs/qa/load-test-reports/<date>/README.md` and link it from `REBUILD_EXECUTION_PLAN.md` Phase 6 section.

7. **Retrospective**
	- If thresholds unmet, open GitHub issues with logs, JSON artifacts, and mitigation ideas.
	- If all checks pass, mark Phase 6 load testing tasks complete and notify PM.

> Tip: Use `STAGING=true` env flag in the harness (supported) to disable aggressive teardown so you can introspect sockets after each scenario.

---

## Metrics & Instrumentation

- **Gateway metrics endpoint**: `GET /internal/realtime/metrics` surfaces `NovelEventsGateway#getGatewayMetrics()` for white-box assertions and is consumed by the harness.
- **Redis publish latency**: the harness records timestamps before publishing and after client receipt to derive percentiles.
- **Log capture**: run the API with `LOG_LEVEL=debug` and pipe output to file for post-run analysis.
- **Resource usage**: optional `docker stats` or Perfetto recording for CPU/memory if we suspect bottlenecks.

---

## Execution Flow

1. Clean environment (`docker compose down -v`) to avoid leftover state.
2. Start dependencies (`docker compose up` for Redis/Mongo). Seed Mongo fixtures when required.
3. Launch API with scenario-specific env file.
4. Run the harness scenario(s) sequentially, collecting JSON result files under `docs/qa/artifacts/<date>/`.
5. Tear down services and archive logs.

Automation hooks (Make/Turbo) remain TODO; the harness CLI above can be scripted when we wire Phase 6 validation into CI.

---

## Reporting

- Summaries and raw JSON outputs will be committed under `docs/qa/load-test-reports/` with a timestamped folder.
- `REBUILD_EXECUTION_PLAN.md` Phase 6 checklist will be updated with a “Load Testing” subsection referencing the latest passing report.
- Any deviations will produce GitHub issues linked from the report.

---

## Open Items

- [x] Expose the gateway metrics via HTTP for the harness (`GET /internal/realtime/metrics`).
- [x] Implement the TypeScript harness (workspace package `@letswriteabook/realtime-load-test`).
- [x] Define Redis/Mongo fixtures for catch-up replay (handled by harness seeding).
- [ ] Wire the harness into CI smoke execution (optional stretch goal).
- [x] Automate idle eviction scenarios once supporting tooling lands.
- [x] Automate catch-up and broadcast scenarios once supporting tooling lands.
- [x] Capture baseline reports for catch-up and broadcast runs after redeploying the gateway.
- [ ] Draft README summary for `docs/qa/load-test-reports/2025-10-11/` before sharing with stakeholders.
