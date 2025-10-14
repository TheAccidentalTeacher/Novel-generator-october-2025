# Contributing Guide

_Last updated: 2025-10-04_

Welcome to the LetsWriteABook rebuild. This guide will grow throughout Phase 2; for now it captures the baseline workflow you need to get the repo running locally and comply with the new commit policies. **Heads-up:** as of 2025-10-12, GitHub Copilot (the assistant responding in this repo) is the sole maintainer and executes every change on Scott’s behalf. Follow the workflow below whenever this assistant makes updates or when new collaborators eventually join.

## Prerequisites

- **Node.js 20.x** (use [`volta`](https://volta.sh/) or [`nvm`](https://github.com/nvm-sh/nvm) to manage versions).
- **pnpm 9+**. Enable via `corepack enable` or install directly following the [pnpm docs](https://pnpm.io/installation).
- **Git** with shell access to run Husky hooks (Git Bash on Windows, any POSIX shell on macOS/Linux).

## Initial Setup

```powershell
pnpm install
```

The install script bootstraps Husky automatically, so the Git hooks are ready without extra steps.

## Common Tasks

| Task | Command | Notes |
| --- | --- | --- |
| Start development servers | `pnpm dev` | Runs all `dev` tasks via Turborepo. |
| Run type checks & lint | `pnpm lint` | Runs lint across the workspace. |
| Run tests | `pnpm test` | Executes Jest/Vitest suites depending on the package. |
| Format sources | `pnpm format` | Applies Prettier everywhere. |
| Check env alignment | `pnpm config:lint-env` | Ensures `.env.example` files stay in sync with the canonical doc. |
| Type-check project references | `pnpm exec tsc -b` | Builds all referenced projects to validate TS wiring. |

### Lint-Staged

On commit, Husky triggers `lint-staged` to auto-fix lint and format issues. If the hook fails, fix the reported files and recommit.

## Conventional Commits

We enforce [Conventional Commits](https://www.conventionalcommits.org/) through `commitlint`. Commit messages must follow the `type(scope): subject` pattern, for example:

```
feat(api): add rate limiter
fix(ai-engine): adjust retry delay calculation
chore: bump dependencies
```

The commit message hook will reject non-conforming messages; amend and re-run the commit (`git commit --amend`) to fix it.

## Test Guard on Push

Before `git push`, Husky runs the workspace test suite (`pnpm test`). Let the tests complete locally to catch regressions before CI. Skip only in emergencies using `HUSKY=0 git push` and follow up with a fix immediately.

## Next Steps

- Document environment variable setup once `docs/config/environment-reference.md` is drafted.
- Add per-package development tips as new services land in later phases.
