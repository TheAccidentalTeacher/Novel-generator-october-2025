# ADR-0001: Monorepo Tooling Baseline

- **Status:** Accepted
- **Date:** 2025-10-04
- **Deciders:** Tech Lead (LetsWriteABook Rebuild)
- **Consulted:** AI Engineer, Backend Engineer, DevOps Engineer
- **Related Phases:** [Phase 2 – Monorepo Scaffolding & Tooling](../../REBUILD_EXECUTION_PLAN.md#phase-2-monorepo-scaffolding--tooling)

## Context

Phase 2 of the rebuild requires a consistent developer experience before any new business logic is ported. The repository already contains a Turborepo-based layout with `apps/` and `packages/` workspaces, TypeScript configuration wiring, and golden tests captured in Phase 1. We need to lock in our choices for the monorepo orchestrator, package manager, project reference wiring, and baseline tooling so subsequent phases can build with confidence and CI can enforce guardrails.

The decision must account for:

- Preserving fast feedback for dozens of packages while running golden tests.
- Ensuring deterministic installs across Windows, macOS, and CI runners.
- Allowing incremental builds and TypeScript project references as the codebase grows.
- Integrating with GitHub Actions and pre-commit automation (Husky, lint-staged, commitlint).
- Enabling environment contract checks (`pnpm config:lint-env`) that keep `.env` files and docs aligned.

## Decision

1. **Keep Turborepo as the monorepo orchestrator.**
   - Use `turbo run {task}` as the single entry point for `dev`, `build`, `lint`, and `test` pipelines.
   - Leverage task graph caching once heavier builds and tests arrive in later phases.
2. **Standardize on `pnpm` (v9) for workspace and dependency management.**
   - Enforce the existing `packageManager` field in the root `package.json`.
   - Require developers to install pnpm globally (or via `corepack enable`) in onboarding docs.
3. **Maintain strict TypeScript project references.**
   - Use `tsconfig.base.json` for shared compiler options and path aliases.
   - Ensure every package/app owns a `tsconfig.json` (and `tsconfig.build.json` where applicable) extending the base and opting into `composite` builds to enable incremental compilation.
4. **Centralize shared tooling in the root configuration.**
   - ESLint + Prettier definitions remain in `/.eslintrc.cjs` and `/.prettierrc` with package-level task scripts delegating to `turbo run lint`.
   - Root scripts remain authoritative: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm config:lint-env`.
5. **Adopt commit hygiene automation.**
   - Install Husky with a pre-commit hook running `pnpm lint --filter ... --cache-dir .turbo` and `pnpm test --filter ... --cache-dir .turbo` (scoped by staged files via lint-staged).
   - Add Commitlint with the Conventional Commits config to guard history quality.
6. **Codify CI expectations in GitHub Actions.**
   - Create a single `ci.yml` workflow that installs pnpm, caches Turbo artifacts, and runs `pnpm install`, `pnpm lint`, `pnpm test`, and `pnpm config:lint-env` on push and PR.

## Alternatives Considered

- **Nx** – rich generators and plugins, but adds learning overhead, slower cold starts, and diverges from the repo structure already scaffolded with Turborepo. Nx also introduces opinions about layering that conflict with our execution plan.
- **Yarn Berry (Plug'n'Play)** – offers strong workspaces, but PnP requires custom tooling adapters (Jest, ts-node) and conflicts with some Phase 1 scripts. pnpm already delivers the dedupe benefits we need without extra patches.
- **Single-package npm workspace** – simpler setup initially, but scales poorly for the multi-service architecture and prevents isolated builds/tests per package.

## Consequences

**Positive**

- Developers share a single command surface (`pnpm` + `turbo`), reducing onboarding friction.
- Caching via Turborepo keeps lint/test cycles fast once CI caching is configured.
- Strict TypeScript project references guarantee clean dependency boundaries between packages.
- Pre-commit automation and CI enforce the guardrails required by Phase 2 exit criteria.

**Negative**

- Contributors must install pnpm locally; the onboarding guide must highlight Windows/macOS installation steps.
- Husky introduces Git hook management; we need to ensure scripts are cross-shell compatible (PowerShell, bash).
- Turbo cache restores require careful cache priming in CI to avoid redundant work.

## Implementation Notes & Follow-Up Tasks

- Add Husky, lint-staged, and commitlint packages in the root `package.json`, configure hooks, and commit the `.husky/` directory.
- Update `scripts/check-env-alignment.ts` (or equivalent) once the environment reference doc is populated; wire it into CI.
- Author `.github/workflows/ci.yml` implementing the decision above with pnpm setup and Turbo caching.
- Ensure every workspace (`apps/*`, `packages/*`, `tooling/*`) declares explicit runtime dependencies, `tsconfig` references, and placeholder test/lint commands that integrate with Turborepo.
- Update `docs/CONTRIBUTING.md` and `docs/config/environment-reference.md` during this phase to reflect tooling requirements.

## References

- `REBUILD_EXECUTION_PLAN.md` – Phase 2 objectives and exit criteria.
- `package.json` – root scripts and package manager lock-in.
- `turbo.json`, `tsconfig.base.json`, `pnpm-workspace.yaml` – existing baseline scaffolding.
