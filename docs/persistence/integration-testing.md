# Persistence Integration Testing Plan

_Last updated: 2025-10-05_

This document captures the initial plan for exercising the persistence layer against a real MongoDB instance spun up with [`mongodb-memory-server`](https://github.com/Automattic/mongodb-memory-server).

## Goals

1. Validate repository behaviour (including transactions) end-to-end against MongoDB.
2. Ensure migrations are runnable and idempotent before hitting shared environments.
3. Provide fixtures that future integration-style worker/API tests can reuse.

## Target Test Suites

| Area | Focus | Notes |
| --- | --- | --- |
| Novel job lifecycle | Creating jobs, updating status fields, ensuring transactional commits roll back on error. | Cover happy path and simulated transaction failures. |
| Metrics aggregation | Incrementing cost/token counters and verifying unique index enforcement. | Check index preconditions created by migrations. |
| Metadata continuity | Story bible updates, continuity alerts, AI decisions. | Validate nested array updates and concurrent session usage. |
| Migrations smoke suite | Applying `migrate:up`/`migrate:down` on a fresh in-memory server. | Blocks PRs when new migrations fail. |

## Proposed Test Harness

- **Jest project extension:** create a dedicated config (e.g. `jest.mongodb.config.ts`) that spins up `MongoMemoryReplSet` so transactions are supported.
- **Global setup/teardown:**
  1. Start the in-memory replica set.
  2. Run `pnpm --filter "@letswriteabook/persistence" run migrate:up` programmatically via the CLI helper.
  3. Expose the connection string through a well-known token (`process.env.TEST_MONGODB_URI`).
  4. Tear down the replica set and reset environment variables after the suite.
- **Per-test utilities:** helper to obtain repositories wired with sessions or direct `mongoose` connection (`connectToDatabase` already supports custom URIs).

## CI Hooks

- The primary GitHub Actions workflow provisions a disposable `mongo:7` service, sets `MONGODB_MIGRATIONS_URI`, and runs `pnpm --filter "@letswriteabook/persistence" run migrate up` before lint/tests. This guarantees migrations stay runnable with every PR.
- Next milestone: execute the full `test:integration` suite in CI once runtime and resource usage are validated locally.

## Near-Term Tasks

- [x] Scaffold the dedicated Jest config and global setup file.
- [x] Port an existing repository test (`mongo-novel-job-repository.test.ts`) to the integration harness as a reference.
- [x] Add `MongoNovelJobMetricsRepository` integration coverage for cost/token/latency increments and reset semantics.
- [x] Add `MongoNovelJobMetadataRepository` integration coverage for story-bible upserts, continuity alerts, and AI decisions.
- [x] Add `MongoNovelJobEventRepository` integration coverage for generation/domain/status events and pagination.
- [x] Add CI job to execute the integration suite in parallel with unit tests.
- [ ] Document data seeding helpers for complex fixtures (chapters, metadata).

## Running the Suite

```powershell
pnpm --filter "@letswriteabook/persistence" run test:integration
```

The command spins up a replica-set-backed `mongodb-memory-server`, runs migrations via the local `migrate-mongo` helper, and executes all tests under `packages/persistence/src/__tests__/integration`.

## Open Questions

- Do we want to generate realistic legacy data snapshots to validate migrations? (Likely yes—blocked until legacy exports are finalized.)
- Should integration tests live in `packages/persistence/src/__tests__/integration` or under a new `tests/` root? (Lean toward co-locating under `__tests__/integration` for now.)
- How do we balance runtime (memory server can be slow on Windows CI) with coverage? Consider grouping heavy migration tests into a separate job.

Follow-ups will flesh out this plan as migration work and repository contracts evolve.
