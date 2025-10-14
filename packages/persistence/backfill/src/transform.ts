export interface LegacyJobDocument extends Record<string, unknown> {
  readonly _id?: string;
  readonly jobId?: string;
  readonly status?: string;
}

export interface NormalizedBackfillResult {
  readonly job: Record<string, unknown>;
  readonly events: ReadonlyArray<Record<string, unknown>>;
  readonly metrics?: Record<string, unknown> | null;
  readonly metadata?: Record<string, unknown> | null;
}

/**
 * Converts a legacy `Job` document from the Railway deployment into payloads that fit the Phase 5 collections.
 *
 * The implementation intentionally throws for now—once the sanitized export lands we will replace this stub with
 * full transformation logic plus exhaustive tests (see packages/persistence/backfill/README.md).
 */
export function mapLegacyJobDocument(_legacy: LegacyJobDocument): NormalizedBackfillResult {
  throw new Error('mapLegacyJobDocument is not implemented yet. Track progress in packages/persistence/backfill/README.md.');
}
