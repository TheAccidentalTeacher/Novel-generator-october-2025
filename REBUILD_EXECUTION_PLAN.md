# LetsWriteABook Rebuild Execution Plan

> **Repository Status**
> 
> **Primary Repository:** https://github.com/TheAccidentalTeacher/OctoberNovelGenerator  
> **Legacy Reference:** https://github.com/TheAccidentalTeacher/Letswriteabook  
> **Last Sync:** October 3, 2025  
> 
> **Purpose**
> 
> Provide an exhaustive, phase-based blueprint to rebuild the LetsWriteABook application using modern best practices while preserving 100% fidelity to the existing AI generation engine. This document is intended to guide an execution agent end-to-end without requiring tacit knowledge.

---

## 0. Global Context

### 0.1 Objectives
- Preserve all current AI generation behaviour (prompts, sequencing, retries, cost tracking, WebSocket payloads).
- Modernize architecture for maintainability, extensibility, and testability.
- Enable incremental upgrades to AI logic without production regressions.
- Improve security, observability, and developer experience.

### 0.2 Non-Negotiable Constraints
- Do **not** alter AI prompts, temperature, or sequence ordering unless explicitly versioned.
- Existing API contracts (REST + WebSocket event names and payload shape) must remain backwards compatible until a deprecation plan is in place.
- Database content (Mongo `Job` documents) must remain accessible; migrations must be reversible.
- All new code must be TypeScript-typed, linted, and unit tested.

### 0.3 Guiding Principles
1. **Separation of concerns**: isolate domain, infrastructure, and presentation.
2. **Reproducibility**: every environment (local, CI, staging, prod) should be bootstrappable via documented scripts.
3. **Progressive delivery**: ship in safe increments with feature flags or staged deployments.
4. **Observability-first**: logging, tracing, and metrics are required for each new component.
5. **Documentation parity**: update docs as part of each phase ("docs-as-code").

### 0.4 Roles & Responsibilities
- **Tech Lead**: approves architectural decisions, reviews high-risk changes.
- **Backend Engineer**: implements API, worker, persistence layers.
- **AI Engineer**: ports AI pipeline, maintains prompt compatibility tests.
- **Frontend Engineer**: rebuilds UI, ensures realtime dashboards function.
- **DevOps Engineer**: handles CI/CD, infrastructure as code, environment rollout.
- **QA Engineer**: writes automated and manual test plans per phase.
- **Project Manager**: tracks milestones, coordinates cross-team dependencies.

> **Current delivery model (2025-10-12):** GitHub Copilot—the automated assistant running this plan—owns every role above. Treat action items and approvals as coming from a single full-stack engineer unless the execution plan explicitly assigns a new human collaborator.

### 0.5 Default Technical Choices
To minimize ambiguity, the plan assumes the following baseline stack unless an Architecture Decision Record (ADR) revises it:

- **Repository management**: Turborepo with `pnpm` workspaces.
- **Language & typing**: TypeScript across all packages (strict mode enabled).
- **Backend framework**: NestJS (Express adapter) with dependency injection and module structure; acceptable alternative is modular Express with Awilix if ADR logged.
- **Queue & job processing**: BullMQ with Redis; worker services consume queues.
- **Realtime transport**: Socket.IO (WebSocket first, HTTP long-poll fallback) delivering legacy-compatible event names.
- **Database**: MongoDB Atlas (existing cluster) accessed via Mongoose + Typegoose wrappers.
- **Testing frameworks**: Jest for unit/integration in backend packages, Vitest for frontend, Playwright for E2E.
- **Styling system**: Tailwind CSS with DaisyUI component primitives layered over custom design tokens.
- **Deployment target**: Railway multi-service project (web, api, worker, redis, mongodb) with infrastructure defined via Terraform.

Any deviation must be captured in an ADR and reflected in the relevant sections of this plan.

### 0.6 Documentation Expectations
- Treat documentation as a first-class deliverable; every phase must output or update Markdown files in the `docs/` tree.
- Maintain a master index at `docs/README.md` linking to onboarding, architecture, deployment, operations, and UX guides.
- Keep `docs/manuals/learning/gamma-teaching-brief.md` aligned with this plan so Gamma-generated summaries stay current.
- All procedural docs follow the "Before You Begin / Steps / Validation / Rollback" structure.
- Screenshots, diagrams, and configuration manifests are stored under `docs/assets/` with descriptive filenames.
- Version every guide with a `Last Updated` date and owning role.

### 0.7 Environment Variable Governance
- Maintain a single canonical reference at `docs/config/environment-reference.md`; never document env vars solely in READMEs or comments.
- Use `.env.example` files within each app (`apps/api`, `apps/worker`, `apps/web`) that import base values from `packages/config/.env.defaults`.
- Each variable must specify purpose, default (if any), format, and which services consume it.
- Secrets stay in Railway environment dashboards or secret managers; local development uses `doppler` or `direnv` but keep instructions in reference doc.
- Version changes via pull request with impact notes in changelog; breaking env changes require PM communication plan.

| Variable | Description | Format / Allowed Values | Services | Default / Source |
| --- | --- | --- | --- | --- |
| `OPENAI_API_KEY` | Credential for OpenAI completions | Non-empty string, 51 characters | API, Worker | Secret store only |
| `MONGODB_URI` | Connection string for Mongo Atlas cluster | Mongo connection URI with retryWrites | API, Worker | Secret store only |
| `MONGODB_URI` | Connection string for Mongo Atlas cluster | Mongo connection URI with retryWrites | API, Worker | Local default: `mongodb://root:example@localhost:27017/letswriteabook?authSource=admin` |
| `REDIS_URL` | Redis connection for BullMQ queues | `redis://user:pass@host:port` | API, Worker | Local default: `redis://localhost:6379` |
| `PORT` | HTTP port binding | Integer 1024-65535 | API, Web | Local default: `3000` |
| `NODE_ENV` | Runtime mode | `development` \| `staging` \| `production` | All | Local default: `development` |
| `AI_MODEL_OVERRIDES` | Optional JSON string to override model IDs per stage | JSON object | Worker | Empty string |
| `SOCKET_CLIENT_ORIGIN` | Allowed CORS origin for websockets | URL | API | Local default: `http://localhost:5173` |
| `RAILWAY_PROJECT_ID` | Railway project identifier for CI deploy | UUID string | CI/CD tooling | Secret store |
| `SENTRY_DSN` | Observability ingestion DSN | URL | API, Worker, Web | Optional |

> **Action:** Tech Lead owns keeping this table updated; CI should fail if `.env.example` diverges from reference using a custom lint script (add in Phase 2).

---

## 1. Phase Breakdown Overview

| Phase | Name | Primary Owner | Exit Criteria | Status |
| --- | --- | --- | --- | --- |
| 1 | Baseline Capture & Safety Nets | AI Engineer | Golden tests capture current engine outputs. | ✅ **COMPLETED** |
| 2 | Monorepo Scaffolding & Tooling | Tech Lead | Monorepo ready with tooling, no business logic yet. | ✅ **COMPLETED (2025-10-04)** |
| 3 | AI Engine Extraction | AI Engineer | AI logic exists in reusable package, golden tests green. | ✅ **COMPLETED (2025-10-04)** |
| 4 | Application Skeleton (API + Worker) | Backend Engineer | HTTP API + worker scaffold running in dev with fake adapters. | ✅ **COMPLETED (2025-10-05)** |
| 5 | Persistence Layer Refactor | Backend Engineer | Repositories abstracted; Mongo migrations in place. | ✅ **COMPLETED (2025-10-06)** |
| 6 | Messaging & Realtime Layer | Backend Engineer | WebSocket/SSE hub emitting compatible events. | 🚧 In Progress (2025-10-06) |
| 7 | Frontend Rebuild | Frontend Engineer | Feature parity UI with TypeScript + React Query. | ⏳ Blocked on Phase 6 |
| 8 | Observability & Security Hardening | DevOps Engineer | Logging, metrics, security checks implemented. | ⏳ Blocked on Phase 7 |
| 9 | Comprehensive Testing & QA | QA Engineer | Automated suites cover critical flows; manual sign-off complete. | ⏳ Blocked on Phase 8 |
| 10 | Deployment & Cutover | DevOps Engineer | New stack live, rollback plan validated. | ⏳ Blocked on Phase 9 |
| 11 | Post-Launch Stabilization & Roadmap | Project Manager | Runbooks delivered; backlog triaged. | ⏳ Blocked on Phase 10 |

Each phase includes detailed tasks, dependencies, deliverables, and validation gates below.

---

## 2. Detailed Phase Plans

### ✅ Phase 1: Baseline Capture & Safety Nets [COMPLETED]
**Goal:** Freeze current behaviour to prevent regressions during rebuild.

1. **✅ Inventory AI Assets [COMPLETED]**
   - ✅ Export all prompt templates, model choices, temperature settings, and token limits into `prompts/` directory.
   - ✅ Record existing retry/backoff parameters and success/failure thresholds.
   - ✅ Snapshot all OpenAI API interactions from logs for representative jobs (small, medium, large novels).
   - ✅ Captured `advancedHumanWritingRefinements` and `universalHumanWritingFramework` prompts into `packages/ai-engine/src/prompts/` with Jest snapshot coverage.
   - ✅ Captured `humanWritingEnhancements` configuration with matching snapshot tests to preserve toggle fidelity.
   - ✅ Captured `genreInstructions` lookup table with snapshot coverage ensuring category guidance remains unchanged.
   - ✅ Captured premise analysis, outline, and chapter-generation prompt templates in `packages/ai-engine/src/prompts/novelGeneration.ts` with Jest snapshots safeguarding legacy formatting and conditional logic.

2. **✅ Create Golden Test Harness [COMPLETED]**
   - ✅ Mock OpenAI responses to record expected prompts and outputs.
   - ✅ Write snapshot tests for outline generation, chapter generation, cost calculations, WebSocket payload sequences.
   - ✅ Ensure tests run via `npm test` and fail on behavioural drift.
   - ✅ Added legacy job snapshot fixture (`packages/ai-engine/src/golden-tests/fixtures/legacyJobSnapshot.ts`) capturing outline, chapters, token usage, costs, and event logs from the legacy pipeline.
   - ✅ Added parity regression suite (`packages/ai-engine/src/__tests__/golden/legacyParity.test.ts`) that rebuilds prompts and summaries to assert fidelity against the recorded snapshot.
   - ✅ Added failure-mode snapshot (`packages/ai-engine/src/golden-tests/fixtures/legacyFailureSnapshot.ts`) to capture retry exhaustion, partial success metrics, and corresponding WebSocket signals.
   - ✅ Extended golden suite to validate failure prompts and final status parity across multiple retry attempts (`packages/ai-engine/src/__tests__/golden/legacyParity.test.ts`).

3. **⚠️ Document Existing Contracts [PARTIAL]**
   - ⚠️ REST endpoints, request/response schemas.
   - ⚠️ WebSocket event names and payload structures.
   - ⚠️ MongoDB schema (`Job` with metadata subdocuments).

4. **⚠️ Back Up Data & Configs [PARTIAL]**
   - ⚠️ Dump MongoDB collections.
   - ⚠️ Archive `.env` files and deployment configs (Railway, Nixpacks).

**✅ Exit Criteria Met:** Golden tests pass (11 tests, all green); core AI behaviour locked down; repository migrated to https://github.com/TheAccidentalTeacher/OctoberNovelGenerator

**Outstanding Phase 1 Tasks (can be addressed in parallel with Phase 2):**
- Document REST/WebSocket contracts for reference during rebuild
- Create data backup strategy (non-blocking for Phase 2 start)

---

### Phase 2: Monorepo Scaffolding & Tooling
**Goal:** Establish modern project structure without porting logic yet.

1. **Select Tooling**
   - Choose between Nx or Turborepo; document rationale. _(Captured in [ADR-0001](docs/adrs/ADR-0001-monorepo-tooling-baseline.md))_
   - Decide on package manager (pnpm recommended for workspaces).

2. **Initialize Repository Layout**
   - `apps/` (api, worker, web), `packages/` (ai-engine, domain, persistence, messaging, config), `tooling/`.
   - Configure TypeScript project references. ✅ _(Root `tsconfig.json` now references all workspaces; package/app configs include dependency references.)_

3. **Configure Shared Tooling**
   - ESLint + Prettier with strict rules.
   - Husky + lint-staged for pre-commit checks. ✅ _(pre-commit running lint-staged; pre-push runs `pnpm test`.)_
   - Jest + ts-jest (or Vitest) for unit tests.
   - Commitlint + conventional commits. ✅ _(See `commitlint.config.cjs` and Husky commit-msg hook.)_
   - Custom script `pnpm config:lint-env` verifies `.env.example` entries align with `docs/config/environment-reference.md`. ✅ _(Implemented in `scripts/check-env-alignment.ts`.)_
   - Tuned `turbo.json` so the `test` task declares no outputs, silencing cache warnings while preserving CI reproducibility. ✅ _(Validated by rerunning `pnpm test` post-change.)_

4. **Set Up Base CI Pipeline**
   - GitHub Actions workflow running lint + type-check + tests on PR. ✅ `/.github/workflows/ci.yml`
   - Include job invoking `pnpm config:lint-env` to block drift. ✅

5. **Document Developer Onboarding**
   - `docs/CONTRIBUTING.md` with environment setup steps. ✅ _(Initial guide covers pnpm install, Husky hooks, and Conventional Commit policy.)_
   - `docs/config/environment-reference.md` maintained as canonical env table with secrets handling guidance. ✅ _(Scripts and `.env.example` templates stay aligned via `pnpm config:lint-env`.)_

**Exit Criteria:** `pnpm install` + `pnpm lint` + `pnpm test` succeed on CI; directory structure reviewed.

**Status (2025-10-04):** Exit criteria met. CI workflow enforces lint/test/env checks; Turbo warnings resolved via `test.outputs = []`.

---

### ✅ Phase 3: AI Engine Extraction [COMPLETED]
**Goal:** Port AI logic into isolated `packages/ai-engine` with full fidelity.

1. **✅ Create Stage Interfaces [COMPLETED]**
   - ✅ Defined `IAiStage`, `IAiClient`, `GenerationContext`, stage metadata, and structured events.
   - ✅ Scaffolded prompt adapters leveraging Phase 1 assets.

2. **✅ Port Existing Logic [COMPLETED]**
   - ✅ Outline stage orchestrates premise analysis + outline generation with structured logging and context updates.
   - ✅ Chapter stage iterates outline, applies retry/backoff, emits cost/progress events, and updates chapter state.
   - ✅ `generateNovel` wraps `NovelGenerationEngine`, sequences all stages, and surfaces hooks for logging, event emission, and custom clocks.

3. **✅ Implement Client Abstraction**
   - ✅ Mock client available for unit tests and golden snapshots.
   - ✅ OpenAI adapter implemented with configurable models, pricing, and helper factory.

4. **✅ Reinstate Domain Event Hooks**
   - ✅ `generateNovel` accepts a `publishDomainEvent` callback so downstream services can emit websocket-compatible messages in Phase 6.

5. **✅ Run Golden Tests**
   - ✅ Golden regression suite now drives the public `generateNovel` pipeline with the mock client, matching outline/chapter prompts, event ordering, costs, and token usage against legacy fixtures.

**Exit Criteria:** Golden test suite green; code coverage ≥90% for ai-engine; documentation updated.

**Status (2025-10-04):** Public `generateNovel` orchestrates all stages with mock/OpenAI clients; golden snapshots run through the same entry point to guarantee parity; stage interfaces, events, and client abstractions are battle-tested with unit and snapshot coverage above the ≥90% target.

**Post-Phase Follow-ups:**
- Track concurrency and cost-threshold regression scenarios as we introduce persistence and real queues in Phases 4–5.
- Surface configuration guidance (models, retry policy, logging) in the AI engine package README as part of the broader documentation push.

---

### ✅ Phase 4: Application Skeleton (API + Worker) [COMPLETED]
**Goal:** Stand up API gateway and background worker using new structure.

1. **Choose Framework**
   - Express + custom DI or NestJS. Document decision.

2. **API Skeleton**
   - Implement health routes, placeholder for `/api/novel` endpoints.
   - ✅ Health readiness now pings MongoDB and Redis, returning dependency status for probes.
   - Wire request validation with Zod or class-validator.
   - ✅ Promoted a global `ApiConfigModule` so downstream modules consume a single typed configuration provider.

3. **Worker Skeleton**
   - Set up BullMQ/RabbitMQ queue processing.
   - Worker receives job payload, calls the ai-engine via a dedicated processor (mock and OpenAI clients supported).
   - ✅ Worker runtime now delegates to `createNovelJobProcessor`, streaming progress/events and capturing completion payloads with structured logging.
   - ✅ Added targeted unit tests (`novel-job-processor.spec.ts`) that assert progress updates, serialized generation/domain events, and failure propagation.
   - ✅ Added bootstrap tests to guard against missing Redis configuration and verify graceful shutdown handlers.

4. **Shared Config**
   - Centralized configuration package with environment validation.
   - ✅ API imports the shared module instead of re-registering ad-hoc providers, keeping DI consistent across health and novel modules.

5. **Local Orchestration**
   - Docker compose: Mongo, Redis, API, worker.
   - ✅ Added `infra/compose/docker-compose.dev.yml` exposing Mongo (auth defaults) and Redis for `pnpm dev` workflows; documented usage in Phase 4 notes.

**Exit Criteria:** `pnpm dev` spins up API + worker with mock AI, health check passes.

---

### ✅ Phase 5: Persistence Layer Refactor [COMPLETED]
**Goal:** Abstract MongoDB into repositories with migration support.

> **Status Update (2025-10-05):** Worker runtime writes job events, metrics, and metadata through the new Typegoose-backed repositories, and the API now consumes the full repository bundle to expose `/novel/:id/events`, `/metrics`, and `/metadata` read models. Service, controller, and presenter tests cover the new surface. Transactional persistence now wraps job result, metrics, and metadata writes when Mongo sessions are available, with fallback logging and unit tests covering both paths. Mongo migrations are scaffolded with `migrate-mongo`, TypeScript templates, and an initial collection/index bootstrap script. CI now provisions a disposable MongoDB service and runs `migrate up` as part of the quality gate to block schema drift. A dedicated legacy backfill plan outlines how to port historical `Job` documents into the normalized collections once sanitized exports are available.
>
> **Next Step:** Expand integration coverage beyond the initial smoke test and design the legacy data backfill strategy.

1. **✅ Define Domain Entities [COMPLETED 2025-10-05]**
   - Expanded domain contracts to cover job events, metrics deltas, story bible patches, and continuity alerts under `packages/domain`.
   - Synced shared-type snapshots so worker/API agree on serialized job context and chapter payloads.

2. **✅ Implement Repositories [COMPLETED 2025-10-05]**
   - Added Mongo repositories for jobs, events, metrics, and metadata using Typegoose models in `packages/persistence`.
   - Worker now persists status transitions, generation events, cost/token/latency metrics, and continuity alerts via the repository bundle.

3. **✅ Expose Persistence via API [COMPLETED 2025-10-05]**
   - Updated Nest providers to inject the repository bundle into the novel module.
   - Added service methods and REST routes for job events, metrics, and metadata including presenters that normalize persisted documents.
   - Extended Jest suites for controller/service/presenter layers to guard the new behaviour.

4. **✅ Add Transaction Support [COMPLETED 2025-10-05]**
   - Added `withSession` support to the Mongo repositories alongside a shared `runInMongoTransaction` helper.
   - Worker persistence now attempts transactional writes for job result, metrics, and metadata updates with a graceful fallback when sessions are unavailable; Jest coverage asserts transactional execution and logging.

5. **✅ Migration Framework [COMPLETED 2025-10-05]**
   - Standardized on `migrate-mongo` with TypeScript support, CLI wrapper, and workspace scripts for `migrate:status|up|down|create`.
   - Added initial migration establishing collections/indexes plus developer/CI documentation under `docs/persistence/migrations/README.md`.

6. **Integration Tests**
   - Use in-memory Mongo (`mongodb-memory-server`) for repository tests.
   - Harness design captured in `docs/persistence/integration-testing.md` outlining replica set setup and target suites.
   - ✅ Initial integration harness in place (2025-10-05) with migrations bootstrap and `MongoNovelJobRepository` transaction smoke test.
   - ✅ Added metrics repository coverage validating cost/token/latency increments plus reset semantics under replica-set transactions (2025-10-05).
   - ✅ Added metadata repository coverage for story bible upserts, continuity alerts, and AI decisions, including transaction paths (2025-10-06).
   - ✅ Added event repository coverage ensuring append/list behaviour, pagination, and transaction support (2025-10-06).

7. **CI Automation**
   - ✅ GitHub Actions workflow spins up `mongo:7`, exports `MONGODB_MIGRATIONS_URI`, and runs `pnpm --filter "@letswriteabook/persistence" run migrate up` before lint/tests (2025-10-05).
   - ✅ CI now executes the persistence integration suite (`pnpm --filter "@letswriteabook/persistence" run test:integration`) to guard repository behaviour (2025-10-06).

8. **Legacy Backfill Planning**
   - ✅ Authored `docs/persistence/legacy-backfill-plan.md` describing export strategy, transformation tooling, validation steps, and production runbook prerequisites (2025-10-05).
   - ✅ Scaffolded `packages/persistence/backfill` workspace with README, TypeScript config, stub transform, and CLI entry point to accelerate implementation once exports arrive (2025-10-06).

**Exit Criteria:** Repositories tested; migrations documented; API + worker still running with real Mongo.

---

### 🚧 Phase 6: Messaging & Realtime Layer [IN PROGRESS]
**Goal:** Restore websocket functionality through an event-driven abstraction.

> **Status Update (2025-10-06):** Event contracts now live in `@letswriteabook/messaging` with protocol versioning, helper constructors, and schema validation. The worker publishes realtime payloads through the optional Redis publisher, and the API offers a hardened Redis subscriber with exponential backoff plus a persistence-backed Socket.IO gateway that replays stored history on subscription. Backpressure guardrails (connection limits, per-origin quotas, per-socket subscription caps, idle eviction) are implemented with metrics exposure. Documentation refreshed (`docs/contracts/websocket.md`, `docs/api/realtime.md`, `docs/web/realtime-integration.md`) to codify the contract, catch-up expectations, and client guidance. Harness-driven guardrail load tests (connection quota, per-origin quota, subscription cap, idle eviction) passed on 2025-10-06 with JSON artifacts under `docs/qa/load-test-reports/2025-10-06/`. Next focus areas are catch-up/broadcast load validation, production hardening, and frontend resilience polish.

> **Status Update (2025-10-10):** Automated metrics capture now ships with the realtime load-test suite (`tooling/realtime-load-test/src/scripts/run-staging-suite.ts`), producing baseline and post-scenario gateway snapshots by default. Documentation in `docs/qa/realtime-load-testing.md` was refreshed with the new artifact naming and workflow guidance. A full `pnpm build` succeeded across the monorepo, validating all package builds (API, worker, web, domain, messaging, persistence, realtime harness) with Vite production output archived in `apps/web/dist`.

1. **✅ Event Contracts (COMPLETED 2025-10-06)**
   - Versioned TypeScript types, helper constructors, and decode guards exported from `packages/messaging`.
   - WebSocket and API docs updated with envelope, event catalogue, and versioning policy.

2. **✅ Gateway Implementation (COMPLETED 2025-10-06)**
   - Socket.IO gateway enriched with Mongo-backed catch-up replay and heartbeat handling.
   - Gateway tests cover subscription flows, replay scenarios, and failure logging.

3. **✅ Event Bus Integration (COMPLETED 2025-10-06)**
   - Worker publishes to Redis when configured; falls back gracefully when unavailable.
   - API subscriber validates protocol version, retries connections with exponential backoff, and forwards events to sockets.

4. **✅ Backpressure & Cleanup (COMPLETED 2025-10-06)**
   - Implemented connection quotas, per-origin limits, per-socket subscription caps, and idle eviction with descriptive error messaging.
   - Added gateway metrics API exposing connection/subscriber counts and catch-up replay stats for observability.

5. **✅ Load Testing (COMPLETED 2025-10-11)**
   - ✅ Guardrail harness scenarios (connection quota, per-origin quota, subscription cap, idle eviction) executed locally; see `docs/qa/realtime-load-testing.md` and `docs/qa/load-test-reports/2025-10-06/` for results (all passes).
   - ✅ Catch-up throughput and broadcast burst scenarios implemented in the realtime harness (`catch-up-burst`, `broadcast-burst`) with Mongo seeding and Redis publishing.
   - ✅ Staging suite runner enhanced to capture gateway metrics snapshots before the run, after each scenario, and post-suite, ensuring observability evidence accompanies every artifact drop.
   - ✅ **Staging suite executed 2025-10-11** – Catch-up burst replayed 120 persisted events in **157.24 ms** (threshold: 1500 ms); broadcast burst delivered 10,000 messages to 200 subscribers with **p95 latency 115.81 ms** (threshold: 600 ms). Full report and artifacts: [`docs/qa/load-test-reports/2025-10-11/README.md`](./docs/qa/load-test-reports/2025-10-11/README.md).

**Outstanding Tasks Before Phase Exit**
- **✅ 2025-10-11** – Redis reconnect/failover validated in 2025-10-11 staging run; simulated disconnect at sequence 80 with 1500 ms delay achieved 100% delivery (10,000/10,000 messages, zero errors). See [`docs/qa/load-test-reports/2025-10-11/README.md`](./docs/qa/load-test-reports/2025-10-11/README.md).
- **✅ 2025-10-11** – Latency SLA baselines recorded in [`docs/ops/runbooks/realtime-gateway.md`](./docs/ops/runbooks/realtime-gateway.md): catch-up 157 ms (threshold 1500 ms), broadcast p95 115 ms (threshold 600 ms).
- **✅ 2025-10-12** – Frontend smoke automation executed via `pnpm --filter @letswriteabook/mock-staging smoke`, booting a mock staging gateway and validating all five realtime scenarios (connection, event flow, reconnect, error, graceful degradation). Evidence logged in [`docs/qa/realtime-frontend-smoke-test.md`](./docs/qa/realtime-frontend-smoke-test.md).
- **⟳ 2025-10-12** – Manual staging validation still pending gateway access; rerun smoke checklist against real staging endpoints using the updated automation playbook (see `docs/qa/realtime-frontend-smoke-test.md`) and update documentation to remove limitation notes once connectivity is restored.

**Phase 6 Status:** Load testing complete; backpressure guardrails validated; latency baselines documented. Frontend smoke flows automated via mock staging harness, and staging rerun playbook prepared. Awaiting real staging connectivity to execute the remote run before declaring phase exit.

**Exit Criteria:** Frontend test client receives all event types; latency SLAs documented; backpressure guardrails proven in load test results and captured runbook.

---

### Phase 7: Frontend Rebuild
**Goal:** Deliver TypeScript React app with feature parity and improved structure.

> **Status Update (2025-10-07):** Frontend scaffolding now includes a shared `AppProviders` wrapper wired to a Zustand UI store that toggles React Query Devtools in development. Storybook is bootstrapped with custom theming, AppProviders decorators, and accessibility tooling, and a smoke test (`pnpm --filter @letswriteabook/web storybook -- --smoke-test`) runs cleanly. Job List and Job Detail views hydrate metadata, metrics, and story bible snapshots via React Query hooks backed by the shared REST DTOs in `@letswriteabook/shared-types`, with placeholder fallbacks for offline demos. Monitoring snapshot UI is now covered by React Testing Library suites (service, hook, and page) plus a Storybook scene that seeds the React Query cache for design reviews, keeping placeholder messaging visible until the API wiring lands. Job List page behaviour (loading, placeholder, empty, and error flows) now has focused React Testing Library coverage to guard the new shared UI tokens. The realtime job events hook now ships with a socket.io client harness that validates placeholder behaviour, connection lifecycle, error surfacing, and event buffer trimming.

> **Update (2025-10-07, evening):** Job Detail page now ships with Vitest coverage spanning no-selection prompting, placeholder-backed data render, loading skeletons, error surfaces, plus realtime-empty and story bible fallback messaging to lock in the recent React Query wiring.
>
> **Update (2025-10-08):** Extended Job Detail coverage to assert realtime error surfacing and danger-toned status badges when socket connections fail, ensuring UI regressions are caught before Phase 6 hand-off.

> **Update (2025-10-08, evening):** Added Job Detail reconnection coverage verifying the UI clears realtime error messaging, restores the info-toned badge, and replays buffered events once the socket transitions back to `connected`.

**Next Increment (2025-10-11 Update):**
- **✅ Phase 6 load artifacts delivered** – Staging suite results (catch-up + broadcast) captured in [`docs/qa/load-test-reports/2025-10-11/`](./docs/qa/load-test-reports/2025-10-11/) with metrics snapshots and Redis failover validation.
- **⟳ Execute frontend smoke test** – Run checklist at [`docs/qa/realtime-frontend-smoke-test.md`](./docs/qa/realtime-frontend-smoke-test.md) against staging to validate UI reconnect handling and event delivery; document pass/fail in checklist.
- **Remaining Phase 7 tasks:**
  1. **Accessibility audit** – Run axe DevTools against all routes; document findings and remediation plan in `docs/ui/accessibility-report.md`.
  2. **Responsive layout validation** – Test desktop + tablet breakpoints (768px, 1024px, 1440px); capture screenshots for design review.
  3. **Performance optimization** – Bundle analysis with `vite-bundle-visualizer`; ensure main chunk < 200 kB gzipped; document code-splitting strategy.
  4. **Storybook polish** – Complete component coverage for shared UI primitives; publish to static hosting for stakeholder review.
  5. **E2E test baseline** – Author 3–5 Playwright scenarios covering: generation submission, job list navigation, realtime event streaming, error recovery, placeholder mode.
  6. **Documentation refresh** – Update [`docs/ui/frontend-rebuild-roadmap.md`](./docs/ui/frontend-rebuild-roadmap.md) with completed features and remaining polish items.

**Phase 7 Exit Criteria Reminder:**
- Full feature parity with legacy UI (premise entry, progress monitoring, cost visibility, history).
- Responsive layout supporting desktop + tablet.
- Accessibility audit (WCAG 2.1 AA) with documented findings + remediation.
- Reusable component library documented in Storybook.
- E2E tests covering critical user journeys.

**Error Resilience (2025-10-08):** Added proactive token limit warnings to the `GenerationForm` component that alert users when target word counts and chapter counts may exceed AI processing limits. Warnings trigger when average chapter length exceeds 8,000 words or total chapters exceed 40, helping prevent generation failures before they occur. Supporting CSS classes provide distinct styling for validation errors vs. informational warnings.

> **Update (2025-10-09):** Finalized GenerationForm token-limit UX with two dedicated tests asserting warning visibility for over-8k average chapter length and >40 chapters. Imported supporting CSS globally. Web test suite status: 9 files, 36 tests — all passing.

> **Update (2025-10-09, evening):** Wired `useCreateGenerationJobMutation` error mapping into `GenerationForm`, surfacing a submission banner that displays friendly copy for token/size/rate-limit failures. Added CSS styling and a dedicated test asserting the banner renders when submission rejects. Web test suite status: 9 files, 42 tests — all passing.

> **Update (2025-10-10):** Aligned `GenerationPage` with the new form UX by allowing mutation errors to bubble into the form banner while preserving placeholder-mode badges for offline demos. Added page-level Vitest coverage for the navigation success path, placeholder fallback, and submission error propagation. Web test suite status: 10 files, 45 tests — all passing.

1. **Setup**
   - ✅ Vite + React 18 + SWC; absolute imports live via `@/*` alias.
   - ✅ Introduce design system (Tailwind CSS + DaisyUI backed by `packages/ui-tokens`).
   - ✅ Defined theming architecture by expanding `packages/ui-tokens`, synchronising DaisyUI themes (light + dark), and wiring a Storybook theme switcher toolbar (2025-10-07).
   - ✅ Documented customization workflow in `docs/ui/customization-guide.md`, covering token updates, DaisyUI themes, and Storybook QA (2025-10-07).

2. **State Management**
   - React Query baseline ready; Zustand-backed `useUiStore` manages navigation and React Query Devtools toggles (2025-10-07).
   - WebSocket hook updates React Query cache via `useRealtimeJobEvents` with comprehensive unit tests covering placeholder mode, connection lifecycle, and error handling.

3. **Routing & Layout**
   - React Router with guarded routes for monitoring dashboard.

4. **Feature Modules**
   - `features/generation`: form, validators.
   - `features/progress`: progress UI, cost tracker.
   - `features/monitoring`: dashboard tabs with virtualization.

5. **Testing**
   - Unit tests (Vitest + React Testing Library).
   - Storybook stories for components.
   - Playwright E2E scenarios.

**Kickoff Prerequisites**
- Confirm API endpoints for generation, progress reads, metrics, and metadata are stable (Phase 4/5 deliverables signed off).
- Ensure realtime gateway staging URL and auth strategy documented for frontend consumption.
- Align on design starter kit (Tailwind + DaisyUI vs. custom token set) and finalize typography/spacing scale.
- Provision `.env.example` for `apps/web` covering API base URL, websocket path, feature flags.
- Decide on routing baseline (e.g., nested routes for job detail vs. dashboards) and record in `docs/ui/routing-plan.md`.

**Day-1 Sprint Tasks**
1. ✅ Scaffold Vite app with React 18 + SWC, integrate Turborepo pipeline (`pnpm --filter web dev`).
2. ✅ Implement shared UI kit package (`packages/ui`) with initial components (buttons, cards, status badges) — token-driven styling, Storybook coverage, and Vitest suites for Button, Card, and StatusBadge completed on 2025-10-07.
3. ✅ Build realtime hook (`useRealtimeJobEvents`) wrapping Socket.IO client with reconnection/backoff and add Vitest coverage for placeholder, connection, error, and cache-buffer paths (2025-10-07).
4. ✅ Create job list + detail pages pulling from API (React Query) with skeleton/loading states. List route sorts jobs by latest activity, surfaces placeholder messaging, and links into detailed timelines. Detail page merges REST snapshots (metadata, metrics, story bible) with realtime event feeds using placeholder fallbacks when the API is unavailable.
5. ✅ Establish accessibility linting (axe + eslint-plugin-jsx-a11y) and add Storybook accessibility add-on (2025-10-07).
6. ✅ Build monitoring snapshot dashboard powered by React Query with simulated telemetry cards until backend wiring completes.
7. ✅ Add React Query + Testing Library coverage for monitoring service, hook, and page, and capture a placeholder-backed Storybook story for design QA (2025-10-07).

- **Generation Form Module (2025-10-07 Update)**

   - ✅ Expanded shared DTOs with `CreateGenerationJobRequest`/`Response` plus API client helpers for POST submissions.
   - ✅ Added placeholder-aware generation service that gracefully falls back when the API rejects or the network fails.
   - ✅ Implemented `GenerationForm` component bound to Zod validation defaults, numeric parsing, checkbox handling, accessible error messaging, and submission wiring.
   - ✅ Hardened web lint rules around the new feature (import ordering, unused parameters) and aligned API specs with the latest socket configuration contract; `pnpm test` now runs cleanly across the monorepo.
   - ✅ Added React Testing Library coverage for the form, including submission, validation surfacing, correction flows, numeric constraints, and initial state rendering.
   - ✅ Implemented a React Query mutation hook (`useCreateGenerationJobMutation`) with job-list invalidation and a routed generation page that surfaces placeholder fallbacks when the API is offline.
   - ✅ Authored Storybook coverage for the form (default, prefilled, validation error, and submission-in-progress states) to aid review workflows.
   - ⟳ Follow-up: integrate the form with realtime job progress view once the messaging phase exits, and document the end-to-end UX in `docs/ui/generation-flow.md`.
   - ✅ Added targeted Button component unit tests covering loading/disabled states in `packages/ui` to lock in the recent prop sanitisation fix (2025-10-07).

**Dependencies & Coordination Notes**
- Backend must expose CORS origin for new frontend domain before first staging deploy.
- Observability team to advise on frontend logging/telemetry strategy ahead of Phase 8 (e.g., Sentry browser SDK).
- QA to define baseline acceptance criteria for generation flow so UI development targets parity scenarios.

**Exit Criteria Reminder**
- Full feature parity with legacy UI (premise entry, progress monitoring, cost visibility, history).
- Responsive layout supporting desktop + tablet.
- Accessibility audit (WCAG 2.1 AA) with documented findings + remediation.
- Reusable component library documented in Storybook.

6. **Performance**
   - Code splitting with `React.lazy`.
   - Bundle analysis to keep main chunk <200 kB gzipped.
   - Provide guidance on feature flag-driven UI experiments and where to document them.

### Phase 8: Observability & Security Hardening
**Goal:** Ensure production readiness.

1. **Logging**
   - Pino or Winston with JSON output; correlation IDs across API, worker, and socket gateway.

2. **Metrics**
   - Prometheus exporters for request latency, job durations, queue depth.
   - Dashboards in Grafana/Datadog.

3. **Tracing**
   - OpenTelemetry instrumentation across services and AI calls.

4. **Security Enhancements**
   - Strict CSP, HSTS, upgraded CORS configuration.
   - Authentication/authorization for admin endpoints.
   - Secret rotation strategy documented.

5. **Compliance & Auditing**
   - Log retention policies; PII handling review.

**Exit Criteria:** Observability SLOs defined; security checklist completed; pen-test findings addressed.

---

### Phase 9: Comprehensive Testing & QA
**Goal:** Validate end-to-end behaviour and compatibility.

1. **Test Matrix**
   - Unit, integration, contract, snapshot, load, soak tests.

2. **Compatibility Testing**
   - Run side-by-side job generations between legacy and new stack; compare outputs and events.

3. **Performance Regression**
   - Ensure latency within ±10% of current system for comparable workloads.

4. **QA Playbooks**
   - Manual exploratory testing scripts for monitoring dashboard, failure recovery, upload edge cases.
   - Draft `docs/manuals/user-guide.md` covering generation workflow, interpreting progress states, retrying failures, and support escalation.

**Exit Criteria:** All tests pass; QA sign-off; risk register updated.

---

### Phase 10: Deployment & Cutover
**Goal:** Launch new stack safely.

1. **Infrastructure as Code**
   - Author Terraform modules in `infra/railway` provisioning services: `api`, `worker`, `web`, `redis`, `mongodb`, `network`.
   - Map environment variables from `docs/config/environment-reference.md` to Terraform `railway_environment_variable` resources; store sensitive values in Railway secrets.
   - Generate per-environment workspaces (`dev`, `staging`, `prod`) with backend state in Terraform Cloud or S3-compatible storage.

2. **CI/CD Pipeline**
   - Build, test, containerize, deploy via Railway CLI with staged promotion (`dev` → `staging` → `prod`).
   - Add pipeline step to validate Terraform plan and require manual approval before apply.
   - Publish deployment artifacts (`docs/ops/railway-deployment-guide.md`) after each successful run describing image tags, git commit, and applied workspace.

3. **Data Migration**
   - Apply necessary migrations; run sanity checks.
   - Document fallback strategy in deployment guide including Mongo point-in-time restore commands.

4. **Canary & Monitoring**
   - Route small percentage of traffic; monitor error budgets using Railway metrics dashboards and Grafana alerts.
   - Update `docs/manuals/user-guide.md` with instructions for triggering and verifying generation jobs post-deploy (include screenshots).

5. **Rollback Plan**
   - Document steps to revert to legacy system, including Terraform workspace `rollback` procedure and Railway deployment rollback using previous image tags.
   - Embed quick-reference checklist in `docs/ops/deployment-checklist.md`.

**Exit Criteria:** Production traffic fully on new stack; rollback validated.

---

### Phase 11: Post-Launch Stabilization & Roadmap
**Goal:** Consolidate learnings and plan future enhancements.

1. **Runbooks & On-Call**
   - Incident response playbooks; escalation paths.

2. **Knowledge Transfer**
   - Brown-bag sessions; recorded walkthroughs.

3. **Backlog Grooming**
   - Identify future AI enhancements, dashboard improvements, cost optimizations.

4. **Retrospective**
   - Evaluate process, adjust practices for ongoing development.

**Exit Criteria:** Operational readiness confirmed; roadmap approved.

---

## 3. Cross-Phase Checklists

### 3.1 Quality Gates (Every Phase)
- ✅ Lint + test suite passing.
- ✅ Documentation updated (`docs/phase-N.md`).
- ✅ ADR (Architecture Decision Record) filed for major decisions.
- ✅ Security review status recorded.

### 3.2 Stakeholder Reviews
- Phase kickoff meeting notes stored in project wiki.
- Demo or walkthrough at end of each phase.
- Acceptance sign-off captured in issue tracker.

### 3.3 Risk Management
- Maintain risk register with probability/impact and mitigation strategies.
- Review risk register at weekly project sync.

---

## 4. Deliverables Inventory

| Deliverable | Location | Owner | Due |
| --- | --- | --- | --- |
| Golden test suite | `packages/ai-engine/__tests__/golden` | AI Engineer | Phase 1 exit |
| Prompt registry | `packages/ai-engine/prompts/` | AI Engineer | Phase 1 exit |
| ADRs | `docs/adrs/ADR-*.md` | Tech Lead | Ongoing |
| Docker compose stack | `tooling/docker-compose.yml` | DevOps | Phase 4 exit |
| Migration scripts | `packages/persistence/migrations` | Backend | Phase 5 exit |
| WebSocket contract doc | `docs/contracts/websocket.md` | Backend | Phase 6 exit |
| Design system guidelines | `docs/ui/design-system.md` | Frontend | Phase 7 exit |
| UX customization playbook | `docs/ui/customization-guide.md` | Frontend | Phase 7 exit |
| Observability playbook | `docs/ops/observability.md` | DevOps | Phase 8 exit |
| QA report | `docs/qa/final-report.md` | QA | Phase 9 exit |
| QA test roadmap | `docs/qa/test-roadmap.md` | QA Lead | Updated weekly |
| Deployment checklist | `docs/ops/deployment-checklist.md` | DevOps | Phase 10 exit |
| Railway deployment runbook | `docs/ops/railway-deployment-guide.md` | DevOps | Phase 10 exit |
| Environment variable reference | `docs/config/environment-reference.md` | Tech Lead | Phase 2 exit |
| End-user operations manual | `docs/manuals/user-guide.md` | Project Team | Phase 10 exit |
| Runbooks | `docs/ops/runbooks/` | Project Team | Phase 11 exit |

---

## 5. Timeline & Milestones (Indicative)

| Week | Milestone |
| --- | --- |
| 1 | Phase 1 complete (baseline captured) |
| 2 | Phase 2 complete (monorepo ready) |
| 3 | Phase 3 complete (ai-engine ported) |
| 4 | Phase 4 complete (API/worker skeleton) |
| 5 | Phase 5 complete (persistence refactor) |
| 6 | Phase 6 complete (messaging layer) |
| 7 | Phase 7 complete (frontend) |
| 8 | Phase 8 complete (observability & security) |
| 9 | Phase 9 complete (testing) |
| 10 | Phase 10 complete (cutover) |
| 11 | Phase 11 complete (stabilization) |

> Adjust timeline based on team capacity; each phase requires formal go/no-go review.

---

## 6. Glossary
- **Golden Test**: Regression test capturing exact current behaviour to prevent unintended changes.
- **ADR**: Architecture Decision Record; documents rationale for significant choices.
- **SLO**: Service Level Objective (latency and reliability targets).
- **Canary Deployment**: Gradual rollout to subset of users to validate new release.

---

## 7. Appendices

### Appendix A: Phase Kickoff Template
1. Objectives.
2. Inputs/Prerequisites met.
3. Risks & mitigations.
4. Definition of done.
5. Assigned tasks & owners.

### Appendix B: Review Checklist
- Behavioural parity verified against golden tests.
- Security review conducted.
- Documentation updated.
- Monitoring dashboards updated.
- Stakeholders sign-off captured.

---

**End of Plan**
