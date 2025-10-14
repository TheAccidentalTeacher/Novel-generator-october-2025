# Legacy Data Backfill Plan

_Last updated: 2025-10-05_

This plan lays out how we will migrate the historic data from the legacy LetsWriteABook deployment into the Phase&nbsp;5 persistence schema. It assumes we will receive sanitized MongoDB exports (or access to a live replica) from the legacy Railway project.

## Objectives

1. Preserve all prior novels, monitoring metadata, and cost/usage analytics currently stored in the legacy `Job` documents.
2. Populate the new normalized collections (`novel_jobs`, `novel_job_events`, `novel_job_metrics`, `novel_job_metadata`) without breaking existing golden tests or API contracts.
3. Ensure the migration is repeatable, observable, and reversible so we can practice on staging before touching production.

## Data Sources

| Source | Location | Notes |
| --- | --- | --- |
| Legacy Mongo `jobs` collection | Railway production cluster (database name TBD) | Schema defined in `legacy/backend/models/job.js`; single collection holds outline, chapters, metadata, and monitoring details. |
| Legacy monitoring dashboards | Derived directly from the `jobs` collection | No separate collections exist; dashboards pivot off embedded metadata arrays.
| Golden test fixtures | `packages/ai-engine/src/golden-tests` | Useful for validating outline/chapter shapes but do **not** cover every field stored in Mongo. |

## Target Collections

| Target | Source Fields | Transformation Notes |
| --- | --- | --- |
| `novel_jobs` | Core job identity, premise, outline, chapters, quality metrics, progress, model usage, timestamps | Largely 1:1 with legacy document. Need to flatten enum strings to match new domain types and compute derived `progress` totals when missing. |
| `novel_job_events` | `metadata.aiDecisions`, `metadata.enhancementsApplied`, state transitions inferred from chapter status changes | Legacy system does not persist a dedicated event log. We will synthesize domain/generation events from existing arrays and job status audit fields. |
| `novel_job_metrics` | `metadata.costTracking`, `modelUsage` aggregates | Translate totals and per-stage breakdowns. Ensure numeric fields default to `0` when missing. |
| `novel_job_metadata` | `metadata.storyBible`, `metadata.continuityAlerts`, `metadata.enhancementsApplied`, `metadata.aiDecisions`, `metadata.performance` | Map nested structures to the new schema (Maps → plain objects with deterministic keys). Deduplicate `continuityAlerts` by `id`. |

## Migration Phases

### Phase A — Inventory & Export

- [ ] Confirm database name and authentication for the legacy cluster.
- [ ] Capture a `mongodump` snapshot (full `jobs` collection) and store in temporary object storage for safe keeping.
- [ ] Generate profiling report: document counts, average document size, field presence statistics (using `mongo` aggregation to compute `%` of documents containing optional metadata).
- [ ] Document anonymisation strategy if data must be shared outside the core team.

### Phase B — Transformation Toolkit

- [ ] Create a dedicated backfill workspace under `packages/persistence/backfill/` with:
  - TypeScript scripts that read the legacy dump (`bson-stream` or `mongoexport` JSON).
  - Pure functions mapping legacy `Job` documents to the new collection payloads, with unit tests covering tricky embeddings (story bible maps, alert arrays, AI decisions).
- [ ] Provide a configuration layer for environment variables: `LEGACY_MONGODB_URI`, `TARGET_MONGODB_URI`, batch size, dry-run toggle.
- [ ] Add smoke tests using `mongodb-memory-server` to replay a small sample and assert documents land in the expected collections.

### Phase C — Dry Runs & Validation

- [ ] Execute the backfill against a disposable Mongo instance (Docker or Atlas free tier) using a trimmed dump.
- [ ] Validate:
  - Record counts match (`jobs === novel_jobs`).
  - Aggregated cost and token totals align within tolerance.
  - Story bible entries and continuity alerts round-trip without data loss.
  - Synthetic events render correctly in the monitoring dashboard (manual spot-check with local API once repositories expose the new collections).
- [ ] Capture metrics: runtime per 1k documents, peak memory usage, and error rate.
- [ ] Iterate on transformation logic until validations pass.

### Phase D — Production Execution

- [ ] Schedule maintenance window (read-only mode for legacy app during backfill).
- [ ] Run migrations that introduce the new collections/indexes (already scaffolded) if they have not been applied yet.
- [ ] Execute backfill script in batches with progress logging and resume tokens so it can recover from interruptions.
- [ ] Post-import verification:
  - Run repository integration tests against production data in read-only mode.
  - Cross-check sample records via API endpoints.
  - Export counts and checksums to change management docs.
- [ ] Once satisfied, mark legacy collections as read-only/archived and update operational runbooks.

### Phase E — Rollback & Monitoring

- Maintain the legacy dump and transformation logs so we can restore the target collections if issues surface.
- Implement feature flag in the API (`USE_NORMALIZED_PERSISTENCE`) to switch consumers back to the legacy schema if necessary for a limited time.

## Tooling Deliverables

- `packages/persistence/backfill/README.md` – runbook for engineers executing the backfill.
- `packages/persistence/backfill/src/transform.ts` – pure mapping logic with accompanying Jest tests.
- `packages/persistence/backfill/scripts/run-backfill.ts` – command-line entry point supporting dry-run vs. apply modes and resuming from checkpoints.
- Initial scaffolding for these files now exists; implementation tasks track remaining TODOs inside the new README.
- CI task (optional) that validates the transform against synthetic fixtures to prevent regressions once committed.

## Dependencies & Open Questions

- Pending sanitized export or connection string for the legacy cluster.
- Confirm whether any auxiliary collections (`chapters`, `outlines`) exist outside `jobs`—current inspection suggests no, but we should verify during Phase A.
- Determine retention policy for legacy monitoring dashboards—do we need to reconstruct historical charts or only preserve raw data?
- Decide how to handle partially completed jobs (status `recovering` or chapters still generating) at migration time: pause queues or allow dual-write during cutover.

## Acceptance Criteria

- Dry-run backfill succeeds on staging with parity reports attached to the pull request.
- Production runbook documented and reviewed by DevOps + Backend owners.
- Post-migration validation checklist executed without critical discrepancies.
- Rollback plan rehearsed (restore from dump and re-run legacy app).

---
_Once legacy exports arrive, we can replace the unchecked items with dates/owners and break them down into migrate-mongo scripts plus standalone backfill tooling tasks._
