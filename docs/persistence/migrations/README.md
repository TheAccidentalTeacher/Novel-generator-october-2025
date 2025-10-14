# Mongo Migration Workflow

_Last updated: 2025-10-05_

This guide documents how to manage MongoDB schema migrations for the persistence layer. The project standardizes on [`migrate-mongo`](https://github.com/seppevs/migrate-mongo) with TypeScript support.

## Directory Layout

```
packages/persistence/
  migrate-mongo-config.ts   # shared configuration sourced from environment variables
  migrations/               # migration scripts (TypeScript)
  scripts/migrate-cli.ts    # wrapper around migrate-mongo programmatic API
```

Each migration exports `up` and `down` functions using the raw MongoDB driver so we can create collections, indexes, and perform data backfills.

## Environment Requirements

| Variable | Purpose | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Default connection string used everywhere in the stack. | Must include the default database name (e.g. `mongodb://localhost:27017/letswriteabook`). |
| `MONGODB_MIGRATIONS_URI` | Optional override for migration commands. | Useful for pointing at admin connections in CI/CD. |
| `MONGODB_MIGRATIONS_DATABASE` | Optional database name override when the URI omits it. | Falls back to `MONGODB_DATABASE` or `MONGODB_DATABASE_NAME` if present. |

> **Tip:** During local development, copy the connection string from `.env.example` or Docker Compose and ensure the database segment is present so the config can derive it automatically.

## Common Commands

All commands run from the repository root using `pnpm` filters:

```powershell
# Show applied vs pending migrations
pnpm --filter "@letswriteabook/persistence" run migrate:status

# Apply the next batch of migrations
pnpm --filter "@letswriteabook/persistence" run migrate:up

# Roll back the most recent batch
pnpm --filter "@letswriteabook/persistence" run migrate:down
```

To scaffold a new migration (files land in `packages/persistence/migrations`):

```powershell
pnpm --filter "@letswriteabook/persistence" run migrate:create add-story-bible-indexes
```

Choose a descriptive, kebab-case suffix so the generated filename is self-documenting. The CLI returns the absolute path to the new migration file.

## CI/CD Integration

1. Provision a MongoDB instance for the pipeline. In GitHub Actions we run a `mongo:7` service container with a health check so migrations only start once the server is accepting connections.
2. Export `MONGODB_MIGRATIONS_URI` (or `MONGODB_URI`) within the job. The CI workflow pins it to `mongodb://localhost:27017/letswriteabook_ci` so the pipeline uses an isolated database.
3. Invoke the migration runner before lint/tests to surface schema issues early:
  ```powershell
  pnpm --filter "@letswriteabook/persistence" run migrate up
  ```
4. Capture migration logs for observability—`migrate-cli.ts` prints applied file names, which land in the CI log stream.
5. For ephemeral review environments, pair `migrate:up` with `migrate:down` during teardown to keep databases tidy.

Long-running data migrations (backfilling historic jobs into the normalized schema) are tracked separately in [`docs/persistence/legacy-backfill-plan.md`](../legacy-backfill-plan.md).

## Authoring Guidelines

- Reuse helpers like `ensureCollection` and `ensureIndexes` (see the initial migration) to keep scripts idempotent.
- Always provide a `down` implementation that safely reverses the `up` logic. When the action isn’t reversible, document it clearly and throw inside `down` to block accidental rollback.
- For data migrations, prefer batching or aggregation pipelines to avoid memory pressure on large collections.
- Add accompanying tests using `mongodb-memory-server` to validate complex transformations (tracked in the integration testing plan).

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `MONGODB_URI must be defined` | Required environment variable missing. | Export `MONGODB_URI` or `MONGODB_MIGRATIONS_URI` before running commands. |
| `Unable to determine Mongo database name from URI` | Connection string omits database segment. | Supply `MONGODB_MIGRATIONS_DATABASE` or append `/database` to the URI. |
| `Authentication failed` | Account used for migrations lacks privileges. | Use a dedicated admin user for migrations; rotate credentials via secrets manager. |

For more background on persistence architecture, see [`docs/persistence/persistence-design.md`](../persistence-design.md).
