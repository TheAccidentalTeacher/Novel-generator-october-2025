# Frontend Rebuild Roadmap

_Last Updated: 2025-10-06_  \
_Owner: Frontend Lead_

This roadmap translates the Phase 7 plan in `REBUILD_EXECUTION_PLAN.md` into actionable, vibe-coding-friendly checklists for the web app rebuild. Use it to coordinate scaffolding, component work, and validation before merging into main.

---

## 1. Current Baseline Audit

- ✅ Vite + React placeholder app lives in `apps/web/` with a minimal `App` component.
- ⚠️ Missing pieces:
  - No routing (`react-router-dom`), state management (`@tanstack/react-query`), or websocket hooks.
  - No Tailwind/DaisyUI integration or shared UI tokens package.
  - `.env.example` only contains placeholder API paths; needs expansion for Phase 7 features.
  - No Storybook, testing harnesses, or accessibility linting configured.

---

## 2. Kickoff Prerequisites

1. Confirm backend API endpoints & websocket paths (Phase 4/5 deliverables) and document them in `docs/ui/routing-plan.md` (to be created).
2. Align on design starter kit:
   - Tailwind CSS + DaisyUI for rapid prototyping.
   - `packages/ui-tokens` to own semantic design tokens shared across apps.
3. Provision staging credentials + CORS allowance for the new frontend origin.
4. Decide on logging/telemetry SDK (candidate: Sentry Browser) so observability work (Phase 8) can piggyback.
5. Expand `apps/web/.env.example` with:
   - `VITE_API_URL`
   - `VITE_REALTIME_URL`
   - `VITE_FEATURE_FLAGS` (JSON string)
   - Future toggles for experiments (e.g., `VITE_ENABLE_STYLE_CALIBRATION`).

---

## 3. Scaffold Sprint (Days 1–3)

### Tooling & Project Structure
- [x] Install routing/query/realtime dependencies:
   - `@tanstack/react-query`
   - `react-router-dom`
   - `socket.io-client`
   - _Next_: add `@tanstack/react-query-devtools` + state library (`zustand`).
- [x] Introduce Tailwind + DaisyUI + autoprefixer + postcss config; wire classnames plugin.
- [ ] Create `packages/ui-tokens` workspace with base token definitions and link to Tailwind config.
- [ ] Add Storybook to `apps/web` (`pnpm dlx storybook@latest init`) with React/Vite builder.
- [ ] Set up linting extras: `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-tailwindcss`.
- [ ] Add Vitest setup file for custom matchers, msw hooks (if needed), and jsdom config.

### Application Skeleton
- [x] Establish routing scaffold (`/`, `/jobs/:id`, `/monitoring`).
- [x] Build layout shell with sidebar + main content area; ensure responsive behaviour.
- [x] Implement `QueryClientProvider` and suspense-friendly loaders.
- [x] Stub realtime hook `useRealtimeJobEvents(jobId)` returning mocked data behind feature flag.
- [ ] Create placeholder React Query fetchers for jobs list, job detail, metrics.

---

## 4. Feature Work Streams

1. **Generation Flow**
   - Form for premise inputs (genre, tone, audience, synopsis) with validation and accessible controls.
   - Submit handler triggers API create job endpoint, then routes to progress view.
   - Progress timeline showing events, chapter completions, cost metrics (tap into realtime + REST fallback).

2. **Monitoring Dashboard**
   - Live queue depth & worker health cards (pull from API metrics endpoints once exposed).
   - Job history table with filters (status, created range) and pagination.
   - Error stream panel surfacing `novel.error` events.

3. **Story Review**
   - Chapter accordion with diff viewer (legacy vs. new output) for QA alignment.
   - Export/download actions (PDF, Markdown) gated until Phase 9 verification.

Each stream should produce Storybook entries, unit tests (`describe('happy path')`, `describe('error state')`), and screenshot artifacts (`docs/assets/ui/`).

---

## 5. Quality Gates

- **Lint/Type**: `pnpm --filter web lint` + `tsc --noEmit` remain green.
- **Unit**: `pnpm --filter web test` covers hooks, components, routes.
- **Storybook**: Snapshot/visual regression baseline (future addition) for core components.
- **Accessibility**: Integrate Axe automated checks in Vitest or Playwright; manual keyboard nav verification before milestone sign-off.
- **Bundle Budgets**: Configure Vite bundle analyzer with budget < 200 kB gzipped for main chunk.

---

## 6. Documentation & Knowledge Capture

- Create `docs/ui/routing-plan.md` covering path hierarchy and data-loading strategy.
- Update `docs/ui/design-system.md` with token tables, color palettes, typography scale once tokens are defined.
- Record realtime hook usage examples in `docs/web/realtime-integration.md` (append frontend consumer guidance).
- Maintain a running changelog in `docs/ui/frontend-rebuild-roadmap.md` (this file) as tasks complete (append dated entries).

---

## 7. Risk Watchlist

| Risk | Mitigation |
|------|------------|
| Websocket reconnection loops | Build integration test with mocked gateway; expose dedicated retry policy in hook. |
| Accessibility regressions | Run `npm run lint:a11y` on each PR; enforce keyboard nav requirements in review checklist. |
| Design drift | Weekly review of Storybook with UX lead; snapshot tokens under version control. |
| API contract changes | Subscribe to backend release notes; use TypeScript shared types package when available. |

---

## Change Log

- **2025-10-07** – Tailwind + DaisyUI wired into the web app with design token CSS variables; global styles migrated to utility-first layers and theme badges. Expanded tokens package for brand colors.
- **2025-10-07** – Added routing/layout scaffold, QueryClient providers, and placeholder realtime hook. Updated checklist to reflect completed tooling dependencies.
- **2025-10-06** – Initial roadmap drafted based on Phase 7 plan; added scaffold sprint checklist and risk watchlist.
