# Phase 6 – Messaging & Realtime Layer

_Last Updated: 2025-10-10_<br>
_Owner: Backend Engineer_

## Summary

Phase 6 reintroduces realtime orchestration on top of the rebuilt stack. The API now exposes a hardened Socket.IO gateway backed by Mongo for catch-up replay, while the worker publishes protocol-versioned events through Redis. Guardrails—connection quotas, origin caps, subscription limits, idle eviction—are active and observable via the new metrics endpoint. Documentation, contracts, and tooling were updated to keep clients aligned, and the bespoke load-testing harness is exercising the guardrails continuously.

## Key Changes

- Lifted the realtime protocol into `@letswriteabook/messaging` with versioned event envelopes, schema validation, and helper constructors.
- Hardened the Socket.IO gateway with Mongo-backed catch-up replay, heartbeat handling, and per-socket subscription accounting.
- Implemented Redis-backed event publishing in the worker with exponential backoff reconnect logic in the API subscriber.
- Delivered configurable guardrails (`SOCKET_MAX_CONNECTIONS`, per-origin caps, subscription limits, idle eviction) plus descriptive client errors.
- Exposed gateway metrics via `GET /internal/realtime/metrics`, powering white-box assertions in the load-test harness.
- Authored documentation updates across `docs/contracts/websocket.md`, `docs/api/realtime.md`, and `docs/web/realtime-integration.md` to capture the protocol, catch-up behaviour, and frontend usage guidelines.
- Extended the realtime load-test harness (`@letswriteabook/realtime-load-test`) with automated scenarios, suite orchestration, and metrics snapshotting.

## Validation

- `pnpm build` succeeds across all workspaces, including the messaging and realtime harness packages.
- `pnpm --filter @letswriteabook/messaging test` and `pnpm --filter @letswriteabook/api test` assert event schema integrity and gateway behaviour.
- Guardrail scenarios (`connection-quota`, `origin-quota`, `subscription-cap`, `idle-eviction`) pass locally with artifacts committed under `docs/qa/load-test-reports/2025-10-06/`.
- Staging suite captures baseline and post-run gateway metrics automatically, enabling latency and throughput comparisons between runs.

## Outstanding Work (Blockers to Phase Exit)

| Item | Owner | Target Date | Notes |
| --- | --- | --- | --- |
| Execute staging `catch-up-burst` and `broadcast-burst` runs | Backend Engineer | 2025-10-10 | Requires Mongo and Redis fixtures enabled in staging; artifacts land in `docs/qa/load-test-reports/2025-10-10/`. |
| Document Redis reset reliability drill results | Backend & Frontend Engineers | 2025-10-11 | Simulate outage via harness `--redis-reset-sequence`; capture recovery timing. |
| Record latency SLA baselines | Backend Engineer, QA Lead | 2025-10-11 | Update `docs/qa/realtime-load-testing.md` with P50/P95 latency and replay timings from staging run. |
| Frontend staging smoke against realtime gateway | Frontend Engineer | 2025-10-12 | Validates React Query + Socket.IO client wiring with live payloads. |

## Dependencies & Risks

- Staging must expose Mongo and Redis with representative data; coordinate with DevOps for refreshes before each run.
- Redis outages during testing can affect other teams—announce in `#realtime-qa` 24 hours ahead.
- Protocol changes require synchronized updates to `@letswriteabook/shared-types`; enforce review checklist to avoid schema drift.

## Next Up

- Feed staging latency baselines into the frontend UX polish so toasts and status badges reflect realistic reconnect timings.
- Wire realtime harness results into CI smoke gates once stability is confirmed (Phase 7 stretch objective).
- Begin Phase 7 hand-off by pairing with the frontend team on the monitoring dashboard realtime traces.
