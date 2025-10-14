# LetsWriteABook Monorepo (Rebuild Track)

Welcome to the greenfield rewrite of LetsWriteABook. This repository is organized as a TypeScript-first monorepo, guided by the phase-by-phase blueprint captured in [`REBUILD_EXECUTION_PLAN.md`](./REBUILD_EXECUTION_PLAN.md). The legacy production implementation lives under [`./legacy/`](./legacy) for historical reference only.

---

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Workspace Commands](#workspace-commands)
- [Running Services](#running-services)
- [Documentation](#documentation)
- [Quality Gates](#quality-gates)
- [Deployment Status](#deployment-status)
- [Contributing](#contributing)

---

## Overview

The rebuild emphasizes strict typing, modern developer ergonomics, and incremental delivery. Every phase couples code changes with documentation updates so future contributors can follow the execution plan without tribal knowledge.

Core principles:

- **Type safety everywhere** – strict TypeScript across apps and packages.
- **Shared contracts** – API, worker, and web consume DTOs exposed from `@letswriteabook/shared-types`.
- **Realtime-first UI** – the frontend combines REST snapshots with Socket.IO event streams.
- **Docs-as-code** – every milestone updates the Markdown guides in [`./docs`](./docs).

### Delivery Team Reality Check

- **Engineering execution:** GitHub Copilot (this automated agent) is currently 100% of the active dev team. Every code change, test, and doc update routes through this assistant.
- **Product owner:** Scott, the non-technical stakeholder, reviews plain-language summaries and approves next steps. See [`docs/manuals/collaboration-guide.md`](./docs/manuals/collaboration-guide.md) for the playbook we follow when communicating updates and decisions.
- **Checkpoints:** Each status note includes “what changed / what’s next / decision needed” so Scott can steer without wading through jargon.

---

## Repository Structure

```
apps/
  api/       # NestJS HTTP + realtime gateway
  web/       # React + Vite frontend
  worker/    # BullMQ novel generation worker

packages/
  ai-engine/     # Prompt orchestration and OpenAI adapters
  config/        # Shared environment loading helpers
  domain/        # Aggregate logic and domain contracts
  messaging/     # Realtime protocols and Socket.IO helpers
  persistence/   # Mongo repositories and schemas
  shared-types/  # DTOs exported to every surface
  ui/            # Shared UI primitives (Storybook ready)
  ui-tokens/     # Tailwind + DaisyUI design tokens

docs/            # Documentation for every phase, API, ops, and UX
infra/           # Terraform + Docker Compose resources
scripts/         # Repo automation (env linting, scaffolds)
legacy/          # Archived production stack (read-only)
```

Turbo tasks (`turbo.json`) orchestrate commands across workspaces so each app builds against the latest shared packages.

---

## Prerequisites

- **Node.js 20.x** (managed with [Volta](https://volta.sh/) or [nvm](https://github.com/nvm-sh/nvm)).
- **pnpm 9+** (`corepack enable` recommended).
- **Docker** (optional) for local MongoDB/Redis via `infra/compose`.
- **Git** with shell support for Husky hooks.

---

## Setup

```powershell
pnpm install
```

The install step wires up Husky so commit/test hooks run automatically. If you pull changes to shared packages, re-run `pnpm install` to refresh generated TypeScript project references.

---

## Workspace Commands

| Task | Command | Notes |
| --- | --- | --- |
| Start everything in dev mode | `pnpm dev` | Runs `dev` targets for API, worker, and web concurrently. |
| Start a single app | `pnpm --filter @letswriteabook/<app> dev` | Replace `<app>` with `api`, `web`, or `worker`. |
| Lint all packages | `pnpm lint` | Delegates to `eslint` across the workspace. |
| Type-check web app only | `pnpm --filter @letswriteabook/web typecheck` | Useful for isolated frontend work. |
| Run tests | `pnpm test` | Executes Jest/Vitest suites; see each package for coverage. |
| Verify env docs | `pnpm config:lint-env` | Ensures `.env.example` files match `docs/config/environment-reference.md`. |

Every command honours Turborepo caching; use `pnpm --force` to bypass cache when debugging.

---

## Running Services

1. **Start infrastructure dependencies (optional but recommended):**
   ```powershell
   docker compose -f infra/compose/docker-compose.dev.yml up -d
   ```
2. **Seed environment variables:** copy the relevant `.env.example` from each app (API, worker, web) and adjust values as needed. Reference [`docs/config/environment-reference.md`](./docs/config/environment-reference.md) for explanations.
3. **Launch services:**
   ```powershell
   pnpm dev
   ```
4. **Shut everything down:**
   ```powershell
   docker compose -f infra/compose/docker-compose.dev.yml down
   ```

The web app expects `VITE_API_BASE_URL` and (optionally) `VITE_REALTIME_SOCKET_URL`; if the realtime gateway is offline it will render placeholder data labelled accordingly.

---

## Documentation

- **Execution plan:** [`REBUILD_EXECUTION_PLAN.md`](./REBUILD_EXECUTION_PLAN.md) tracks phase status, owners, and deliverables.
- **Contract guides:** [`docs/api/`](./docs/api) and [`docs/contracts/`](./docs/contracts) outline REST and realtime schemas.
- **Stakeholder communication:** [`docs/manuals/collaboration-guide.md`](./docs/manuals/collaboration-guide.md) explains how the engineering team should brief Scott (non-technical owner) with recommendations, plain-English summaries, and visible progress checkpoints.
- **Frontend notes:** [`docs/web/realtime-integration.md`](./docs/web/realtime-integration.md) explains how REST snapshots and Socket.IO feed the dashboard.
- **Environment reference:** [`docs/config/environment-reference.md`](./docs/config/environment-reference.md) remains the single source of truth for configuration.

When adding new functionality, update the relevant docs concurrently. `pnpm config:lint-env` will fail if environment references drift.

---

## Quality Gates

CI runs lint, tests, and type checks on every pull request. Locally, aim to keep the following commands green before pushing:

```powershell
pnpm lint
pnpm test
pnpm --filter @letswriteabook/web typecheck
pnpm --filter @letswriteabook/api typecheck
pnpm --filter @letswriteabook/worker typecheck
```

For frontend features, add Vitest or Storybook stories alongside new components, and prefer React Testing Library for hooks that manipulate React Query caches.

---

## Deployment Status

The rebuild is not deployed yet. Production cutover will be coordinated in Phase 10 once all preceding phases exit successfully. Deployment tooling and Terraform definitions live under [`infra/`](./infra); follow the execution plan for sequencing.

---

## Contributing

- Follow the guidelines in [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md).
- Use Conventional Commits; Husky + Commitlint enforce the style.
- Treat documentation as part of every change set.
- Prefer small, reviewable pull requests aligned to the active phase checklist.

Have questions about the next milestone? Start with the execution plan, then browse the relevant docs directory before reaching out to the owning role listed there.
