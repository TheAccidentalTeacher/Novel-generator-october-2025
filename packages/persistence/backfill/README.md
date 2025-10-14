# Persistence Backfill Toolkit

_Last updated: 2025-10-06_

This workspace hosts the tooling that will migrate legacy `Job` documents into the normalized Phase 5 collections (`novel_jobs`, `novel_job_events`, `novel_job_metrics`, and `novel_job_metadata`). Nothing here is wired into production yet—we are scaffolding the modules so implementation can start as soon as the sanitized export arrives.

## Layout

```
packages/persistence/backfill/
  README.md                 # This guide
  tsconfig.json             # TypeScript build settings for the toolkit
  src/
    index.ts                # Re-exports the transformation API
    transform.ts            # Pure mapping helpers (legacy → normalized)
  scripts/
    run-backfill.ts         # CLI entry point (dry-run + apply modes)
  fixtures/                 # (todo) Sample legacy payloads for tests
  __tests__/                # (todo) Unit tests for transformation logic
```

## Immediate Next Steps

- [ ] Create synthetic legacy fixtures (small, medium, large) under `fixtures/` for repeatable tests.
- [ ] Implement `mapLegacyJobDocument` in `src/transform.ts` to project a legacy `Job` document into the new collection payloads.
- [ ] Write Jest tests that validate each collection payload matches the schemas in `packages/persistence/src/models`.
- [ ] Flesh out the CLI in `scripts/run-backfill.ts` so it can:
  - Accept `LEGACY_MONGODB_URI` / `TARGET_MONGODB_URI` via env vars or CLI flags
  - Run in dry-run mode (log summary only)
  - Resume from saved checkpoints
- [ ] Wire the toolkit into CI (smoke test against fixtures) once transformation logic is ready.

## Stretch Goals

- Stream processing mode that reads from `mongoexport --jsonArray` dumps to minimize memory.
- Progress reporting suitable for long-running production imports (percentage, ETA, current batch).
- Metrics export (e.g., histogram of cost deltas between legacy and recomputed totals).

For full context, see [`docs/persistence/legacy-backfill-plan.md`](../../docs/persistence/legacy-backfill-plan.md).
