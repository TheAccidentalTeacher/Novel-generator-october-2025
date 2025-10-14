# Persistence Layer Design (Phase 5)

_Last updated: 2025-10-05_

## Objectives

Phase 5 focuses on replacing the legacy MongoDB schema with a structured, well-tested persistence layer that serves both the API and worker services. Key goals:

- Preserve the complete novel job lifecycle: initialization, progress, completion, failures, and historical insights.
- Support monitoring dashboards (continuity alerts, AI decisions, cost tracking) without bloating primary job documents.
- Provide repository abstractions with deterministic typing and transactional safety for multi-write operations.
- Establish a migration and testing strategy that keeps production data accessible while enabling forward evolution.

## Current State

- `packages/persistence` already exposes `MongoNovelJobRepository` backed by a `novel_jobs` collection. It stores payload snapshots, generation results, and failure history.
- Advanced metadata from the legacy stack (story bible, cost breakdown, AI decision logs) is not yet modelled.
- There is no migration framework; schema changes require manual Mongo commands.
- Tests cover repository basics using `mongodb-memory-server`, but only verify the minimal interface.

## Proposed Collection Layout

| Collection | Purpose | Read Patterns | Write Patterns |
|------------|---------|---------------|----------------|
| `novel_jobs` | Canonical job document (status, payload, outline, chapters, summary) | API detail view, worker load, dashboards | Worker upserts (initialize, save result), API reads, failure updates |
| `novel_job_events` | Append-only log of realtime/domain events (flattened) | Dashboard timelines, auditing, replay | Worker appends; API may paginate |
| `novel_job_metrics` | Aggregated cost/usage metrics updated per stage | Monitoring charts | Worker increments, API reads |
| `novel_job_metadata` | Story bible, continuity alerts, AI decision records | Monitoring dashboards, admin tooling | Worker updates discrete sections, API toggles flags |

Splitting metadata into auxiliary collections avoids Mongo's 16MB document size limit and keeps the primary job fetch lightweight.

### Schema Summaries

#### `novel_jobs`

- `_id` (ObjectId) — primary key.
- `jobId` (string, unique) — business identifier.
- `queue` (string) — queue name.
- `status` (`queued`\|`running`\|`completed`\|`failed`).
- `payload` — original request payload.
- `requestedAt`, `receivedAt`, `startedAt`, `completedAt` (ISO strings).
- `durationMs` (number).
- `outline` (`NovelOutlineChapterSnapshot[]`).
- `chapters` (`NovelChapterSnapshot[]`).
- `analysis`, `summary`, `engine`, `context` (serialized snapshots).
- `events` (`SerializedGenerationEvent[]`) — capped to most recent N (e.g., 50) for quick inspection; full history in `novel_job_events`.
- `domainEvents` (`SerializedDomainEvent[]`).
- `failures` (`NovelJobFailureRecord[]`).
- `progress` (derived fields cached for dashboards: `outlineComplete`, `chaptersCompleted`, etc.).
- Timestamps: `createdAt`, `updatedAt`.

_Indexes_
- `{ jobId: 1 }` unique.
- `{ status: 1, createdAt: -1 }` for active job queries.
- `{ updatedAt: -1 }` for recent history.

#### `novel_job_events`

- Composite index `{ jobId: 1, emittedAt: -1 }`.
- Discriminator `kind` (`generation`\|`domain`\|`job-status`).
- Payload stored as `event` (generation/domain) or `status/snapshot`.
- Supports pagination and replay without touching the main job document.

#### `novel_job_metrics`

Document per job, updated with `$inc`:

```json
{
  "jobId": "job-123",
  "cost": {
    "totalUsd": 1.23,
    "analysisUsd": 0.12,
    "outlineUsd": 0.30,
    "chaptersUsd": 0.81
  },
  "tokens": {
    "total": 45678,
    "analysis": 1234,
    "outline": 5678,
    "chapters": 38766
  },
  "latencyMs": {
    "analysis": 11000,
    "outline": 24000,
    "chapters": 180000
  },
  "updatedAt": "2025-10-05T09:45:00Z"
}
```

_Indexes_: `{ jobId: 1 }` unique, `{ updatedAt: -1 }` for recency dashboards.

#### `novel_job_metadata`

Structure focuses on modular subdocuments to avoid unbounded arrays:

- `storyBible.characters` (Map<string, CharacterEntry>) with capped arrays for `traits`, `relationships`.
- `continuityAlerts` (array of capped size with TTL for resolved alerts).
- `enhancements` (array of last N entries, default 50).
- `aiDecisions` stored separately with summary fields (`type`, `confidence`, `impact`).
- `performance` (aggregated counters).

_Indexes_:
- `{ jobId: 1 }` unique.
- Partial indexes for unresolved alerts: `{ jobId: 1, "continuityAlerts.resolved": 1 }`.

## Repository Surface (v2)

Extend `NovelJobRepository` into dedicated interfaces to keep the main job repository focused:

```ts
export interface NovelJobRepository {
  initializeJob(...): Promise<NovelJobAggregate>;
  transitionToRunning(...): Promise<void>;
  saveGenerationResult(...): Promise<NovelJobAggregate>;
  recordFailure(...): Promise<NovelJobAggregate>;
  appendGenerationEvent(jobId: string, event: SerializedGenerationEvent): Promise<void>;
  appendDomainEvent(jobId: string, event: SerializedDomainEvent): Promise<void>;
  updateProgress(jobId: string, progress: NovelJobSnapshot['progress']): Promise<void>;
  findByJobId(jobId: string): Promise<NovelJobAggregate | null>;
  listActiveJobs(options?): Promise<NovelJobAggregate[]>;
}

export interface NovelJobMetricsRepository {
  incrementCosts(jobId: string, delta: CostDelta): Promise<NovelJobMetrics>;
  incrementTokens(jobId: string, delta: TokenDelta): Promise<NovelJobMetrics>;
  getMetrics(jobId: string): Promise<NovelJobMetrics | null>;
}

export interface NovelJobMetadataRepository {
  upsertStoryBible(jobId: string, update: StoryBiblePatch): Promise<void>;
  addContinuityAlert(jobId: string, alert: ContinuityAlertInput): Promise<void>;
  resolveContinuityAlert(jobId: string, alertId: string): Promise<void>;
  appendAiDecision(jobId: string, decision: AiDecisionInput): Promise<void>;
}

export interface NovelJobEventRepository {
  append(jobId: string, event: NovelRealtimeEvent): Promise<void>;
  list(jobId: string, options: { limit?: number; before?: string }): Promise<NovelRealtimeEvent[]>;
}
```

The API service will depend primarily on `NovelJobRepository` + `NovelJobEventRepository` for detail views; the worker will use all repositories to record metrics and metadata as the job runs.

## Transactions & Consistency

- Use Mongo sessions for operations that update multiple collections: e.g., when completing a job, wrap `novel_jobs` update, `novel_job_metrics` finalization, and event log append in a single transaction.
- Provide helper `withMongoTransaction(session => ...)` in `packages/persistence` to centralize error handling.
- Expose idempotent methods so the worker can retry safely if the process crashes mid-transaction.

## Migration Strategy

1. Standardize on `migrate-mongo` under `packages/persistence/migrations`, wrapping the CLI with pnpm scripts (`pnpm persistence:migrate up/down`).
  - Keep configuration in `migrate-mongo-config.ts`, sourcing the connection string from `MONGODB_URI` (or `MONGODB_MIGRATIONS_URI` override) and deriving the database name from the URI path.
  - Register `ts-node` so migrations can be authored in TypeScript alongside repository models.
2. Initial migration creates the three new collections with indexes and backfills from existing `novel_jobs` documents.
3. Provide documentation for running migrations locally and in CI/CD (
  - `pnpm --filter "@letswriteabook/persistence" run migrate:up` before starting services, `down` to roll back a batch
  - automated check to ensure migrations have been applied
  - developer workflow captured in `docs/persistence/migrations/README.md`).
4. Add regression tests that spin up migrations against `mongodb-memory-server` to verify idempotency.

## Testing Plan

- **Unit tests**: cover repository methods with happy paths and failure cases, using stubs/mocks for sessions.
- **Integration tests**: extend `mongo-novel-job-repository.test.ts` and add suites for metrics/events/metadata repositories to validate transaction behaviour.
- **Contract fixtures**: snapshot expected Mongo documents to guard against accidental schema drift.

## Documentation & Developer Experience

- Update `docs/config/environment-reference.md` if new environment variables (e.g., migration connection strings) are added.
- Provide a quickstart in `docs/persistence/README.md` once implementations exist (commands to run migrations, connect to Mongo shell, interpret schemas).
- Enhance `REBUILD_EXECUTION_PLAN.md` Phase 5 exit criteria with references to the new repositories and migration tooling.

## Next Steps

1. Implement additional repository classes (`MongoNovelJobEventRepository`, `MongoNovelJobMetricsRepository`, `MongoNovelJobMetadataRepository`) using Typegoose models per the schemas above.
2. Introduce a shared transaction helper and wrap multi-collection writes.
3. Scaffold the migration framework and seed initial migration scripts.
4. Update API/worker services to consume the new repositories and publish metrics/metadata in real time.
5. Extend docs/tests per the plan.
