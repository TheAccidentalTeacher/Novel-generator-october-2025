# Phase 4 – Application Skeleton (API + Worker)

_Last Updated: 2025-10-04_<br>
_Owner: Backend Engineer_

## Summary

The worker service now boots with a BullMQ runtime, loads strongly-typed configuration from `@letswriteabook/config`, and delegates job execution to the ai-engine via a dedicated `createNovelJobProcessor`. Structured logging, progress signalling, and graceful shutdown are in place, backed by targeted unit tests that assert progress updates, serialized events, and failure handling. The API exposes a `POST /api/novel` endpoint that validates requests and queues novel-generation jobs using the shared `NovelGenerationJobData` contract so the worker can execute the full AI orchestration path.

## Key Changes

- Added a BullMQ worker that subscribes to the `novel-generation` queue defined in the shared config package.
- Implemented connection parsing for `REDIS_URL` (supporting `redis://` and `rediss://`).
- Introduced a structured JSON logger with stage-aware metadata and signal handlers (`SIGINT`, `SIGTERM`) for clean runtime teardown.
- Built a dedicated bootstrap entrypoint to keep `startWorker` reusable by tests and thin adapters.
- Created a `novel-job-processor` module that bridges BullMQ jobs to `generateNovel`, serializes progress/events, and records completion payloads.
- Normalized novel job payloads through `@letswriteabook/shared-types` so API and worker share the same queue contract.
- Added unit coverage around both the worker bootstrap and the novel job processor (`novel-job-processor.spec.ts`) to enforce Redis configuration, graceful shutdown wiring, progress updates, event/domain-event serialization, and failure rethrow semantics.
- Implemented the initial API endpoint for novel generation requests, validating input with Zod and enqueueing jobs with stable IDs.
- Shared Redis connection parsing utilities across services to ensure consistent configuration handling.
- Added a development Docker Compose file (`infra/compose/docker-compose.dev.yml`) provisioning Redis and Mongo for local API/worker runs.
- Upgraded the API readiness endpoint to actively ping MongoDB and Redis, exposing dependency status for downstream probes.
- Promoted a shared `ApiConfigModule` so all API modules consume a single typed configuration provider, removing duplicated factories.

## Validation

- `pnpm --filter @letswriteabook/worker dev` starts the worker and stays connected when Redis is available.
- `pnpm --filter @letswriteabook/worker build` succeeds after building shared packages (`config`).
- `pnpm --filter @letswriteabook/worker test` exercises the bootstrap lifecycle (missing `REDIS_URL`, signal handlers) and the novel job processor coverage (progress updates, event serialization, failure propagation).
- `pnpm --filter @letswriteabook/api test` covers the queue service path with a unit test.
- `pnpm --filter @letswriteabook/api lint` verifies the new dependency injection wiring stays clean.
- `docker compose -f infra/compose/docker-compose.dev.yml up -d` launches Redis + Mongo, unblocking local `pnpm dev` workflows.
- `GET http://localhost:3001/health/ready` reports dependency health (Mongo/Redis) when local services are running.

### Local orchestration

1. Start infrastructure services:
	```bash
	docker compose -f infra/compose/docker-compose.dev.yml up -d
	```
2. Export environment variables (or copy `.env.example` files) so API/worker resolve the local services:
	- `MONGODB_URI=mongodb://root:example@localhost:27017/letswriteabook?authSource=admin`
	- `REDIS_URL=redis://localhost:6379`
3. In a separate terminal, run the application processes:
	```bash
	pnpm dev
	```
4. When finished, tear down the infrastructure:
	```bash
	docker compose -f infra/compose/docker-compose.dev.yml down
	```

## Next Up

- Persist novel-generation progress and results to Mongo once Phase 5 repositories are available.
- Expose worker-emitted domain events to the API WebSocket gateway in Phase 6.
- Replace the local structured logger with the standardized observability stack defined in Phase 8.
- Backfill integration tests that push synthetic jobs through Redis after persistence adapters are finalized.
