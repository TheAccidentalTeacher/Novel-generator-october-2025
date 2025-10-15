# Engineering Handoff Guide

Last updated: 2025-10-14
Owner: Tech Lead

This guide gives a new engineer everything needed to run, debug, and continue development without tribal knowledge.

## Snapshot

- Active repository: https://github.com/TheAccidentalTeacher/Novel-generator-october-2025 (branch: `main` at commit `8761e02`)
- Source origin (upstream history): https://github.com/TheAccidentalTeacher/Letswriteabook
- Monorepo: TypeScript-first with pnpm + Turborepo
- Apps
  - `apps/api`: NestJS HTTP + Socket.IO gateway (path `/ws`)
  - `apps/web`: React + Vite frontend (placeholder-friendly when API is offline)
  - `apps/worker`: BullMQ/ioredis job processor
- Shared packages: `packages/*` (config, domain, messaging, persistence, shared-types, ui, ai-engine)

## Prerequisites

- Node.js 20.x, pnpm 9+ (PowerShell on Windows is fine)
- Optional: Docker Desktop (for local MongoDB/Redis using `infra/compose/docker-compose.dev.yml`)

## Environment & Secrets

Single-source reference: `docs/config/environment-reference.md`.

During development, we keep secrets out of Git by using a local, private file at the repo root: `.env.secure` (gitignored). Copy the variables you need from there into each app’s `.env` for quick starts, or use a secrets injector (Doppler/direnv) to avoid per-app copies.

Minimum local env set for a full run:

- API/Worker
  - `MONGODB_URI=mongodb://root:example@localhost:27017/letswriteabook?authSource=admin`
  - `REDIS_URL=redis://localhost:6379`
  - `OPENAI_API_KEY=sk-...` (or run the mock engine; see ai-engine README)
  - `SOCKET_CLIENT_ORIGIN=http://localhost:5173`
  - `PORT=3001`
- Web
  - `VITE_API_BASE_URL=http://localhost:3001`
  - `VITE_REALTIME_SOCKET_URL=http://localhost:3001` (optional; falls back to API base)

Notes

- The websocket path is fixed at `/ws` on the API.
- For production, tighten `SOCKET_CLIENT_ORIGIN` to your web origin.

## Run Locally (Windows)

See the detailed runbook in `docs/ops/runbooks/local-dev-windows.md`. Short version:

1. Install deps

```powershell
pnpm install
```

2. Start infra (optional)

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

3. Set envs (see above) and start all services

```powershell
pnpm dev
```

4. Health checks

- API: http://localhost:3001/health (200 OK)
- Web: http://localhost:5173 (dev server), static preview on http://localhost:4173 after `pnpm --filter @letswriteabook/web build && pnpm --filter @letswriteabook/web preview`

## Realtime Overview

- Socket.IO server at API base with path `/ws`
- Origin enforced via `SOCKET_CLIENT_ORIGIN`
- Web subscribes per-job and receives:
  - `novel.generation-event`
  - `novel.domain-event`
  - `novel.job-status`
- Catch-up replay emits last persisted events after `novel.subscribed`

Details: `docs/web/realtime-integration.md` and `docs/contracts/websocket.md`.

## Known Issues & Workarounds

- ESLint resolution on Windows: running `pnpm --filter @letswriteabook/web run lint` can error with a `jiti`/`eslint` module path mismatch. This is a toolchain issue (not code style). Workarounds:
  - Prefer `pnpm exec eslint` from the workspace root.
  - If a pre-push hook runs tests (which depend on lint via Turborepo), you can bypass in emergencies: `git push --no-verify`. Follow up with a CI-based lint run.
  - Durable fix backlog: pin eslint/jiti, or adjust `turbo.json` to decouple `test` → `lint` for local pushes (keep in CI).

- Placeholder mode: when `VITE_API_BASE_URL` is unreachable, some web views render placeholder data. Set your web `.env` to the running API to exit placeholder mode.

## Deploy (Railway)

Draft runbook: `docs/ops/railway-deployment-guide.md` and checklist `docs/ops/deployment-checklist.md`.

At minimum for a first deploy:

1. Set envs in Railway for API/Worker/Web (see environment reference)
2. Temporarily widen CORS for initial smoke; then re-tighten `SOCKET_CLIENT_ORIGIN`
3. Deploy API and Worker first; start Web after API/Worker are healthy

## Testing & Quality Gates

- Lint: `pnpm lint`
- Unit/integration: `pnpm test`
- Typecheck examples:
  - `pnpm --filter @letswriteabook/api typecheck`
  - `pnpm --filter @letswriteabook/web typecheck`
  - `pnpm --filter @letswriteabook/worker typecheck`

## What’s Next (Backlog)

1. Resolve Windows ESLint toolchain mismatch; enforce lint in CI instead of local pre-push
2. Add CI workflows: lint, typecheck, test, and an optional Railway deploy job
3. Re-tighten Socket.IO CORS to the production web origin post-deploy
4. Add minimal auth for API routes and websocket handshake
5. Instrument basic telemetry (OpenTelemetry traces, Sentry DSN if available)

## Pointers

- Contracts: `docs/contracts/` and `packages/shared-types`, `packages/messaging`
- Persistence: `packages/persistence`
- Domain: `packages/domain`
- AI engine: `packages/ai-engine`

If you get stuck, start at `docs/README.md` for the index and search for your area.
