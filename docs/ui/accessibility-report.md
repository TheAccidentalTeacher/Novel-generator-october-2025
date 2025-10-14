# Frontend Accessibility Audit Plan

**Last Updated:** 2025-10-12  
**Owner:** Frontend Team (GitHub Copilot acting)  
**Scope:** `apps/web` (Job List, Job Detail, Generation Form, Storybook primitives)

---

## Objectives

1. Achieve WCAG 2.1 AA parity across the rebuilt frontend prior to launch.
2. Provide a repeatable audit workflow that fits into Phase 7 deliverables.
3. Capture remediation tasks with clear ownership and measurable acceptance criteria.

---

## Tooling & Resources

- **axe DevTools (Browser Extension):** Manual spot-checks per route.
- **@axe-core/react (Vitest integration):** Automated regression assertions for key components.
- **Storybook a11y addon:** Component-level checks in isolation.
- **Keyboard navigation checklist:** Tab sequence, focus rings, skip links.
- **Screen reader testing:** NVDA (Windows) baseline; VoiceOver (macOS) when available.
- **Color contrast analyzer:** Ensure minimum 4.5:1 for text, 3:1 for UI components.

---

## Audit Phases

1. **Baseline Capture (Day 1)**
   - [ ] Run axe DevTools on Job List (`/jobs`) and Job Detail (`/jobs/:id`).
   - [ ] Record issues with screenshots and axe output JSON.
   - [ ] Export Storybook a11y report for shared UI primitives.

2. **Remediation Sprint (Day 2–3)**
   - [ ] Prioritize High/Serious issues (color contrast, missing labels, role mismatches).
   - [ ] Implement keyboard navigation fixes (focus traps, skip links, tab order).
   - [ ] Validate form accessibility (Generation Form error messaging, aria-live updates).

3. **Regression Automation (Day 4)**
   - [ ] Add `@axe-core/react` checks to key Vitest suites.
   - [ ] Enable Storybook a11y addon in CI smoke (`pnpm --filter @letswriteabook/web storybook --smoke-test`).
   - [ ] Document recurring checks in Turborepo task pipeline.

4. **Sign-off (Day 5)**
   - [ ] Re-run manual axe sweep and screen reader spot checks.
   - [ ] Update this report with resolved issues and residual risk log.
   - [ ] Attach evidence to `docs/ui/design-system.md` and Phase 7 exit criteria.

---

## Current Findings (2025-10-12)

**Automated baseline (Playwright + axe-core)**

| Route | Result | Notes |
| --- | --- | --- |
| `/jobs` | ✅ Pass | Placeholder dataset renders without WCAG 2.1 A/AA violations. |
| `/jobs/demo-placeholder` | ✅ Pass | Job detail fallback (offline placeholder) passes axe scan. |

**Artifacts:** Generated via `pnpm --filter @letswriteabook/web accessibility:baseline`, which spins up `vite preview` on port 4173 and runs axe-core against the designated routes.

**Storybook smoke (2025-10-12)**

- `pnpm --filter @letswriteabook/web storybook -- --smoke-test`
- Manager + preview booted successfully; no accessibility addon failures were reported during smoke run.

**Manual follow-up:** Still need NVDA screen reader smoke and keyboard traversal walkthrough (scheduled for Day 2).

---

## Pending Tasks & Owners

| Category | Task | Owner | Status |
| --- | --- | --- | --- |
| Baseline | Capture axe results for Job List | Frontend | Completed (2025-10-12) |
| Baseline | Capture axe results for Job Detail | Frontend | Completed (2025-10-12) |
| Baseline | Export Storybook a11y report | Frontend | Completed (2025-10-12 via `storybook --smoke-test`) |
| Remediation | Address button/link role mismatches | Frontend | Pending |
| Remediation | Ensure focus outline visible for all interactive elements | Frontend | Pending |
| Remediation | Provide aria-live feedback for realtime errors | Frontend | Pending |
| Automation | Integrate `@axe-core/react` into Vitest | Frontend | Pending |
| Automation | Enable Storybook a11y addon in CI | Frontend | Pending |
| Sign-off | Screen reader smoke (NVDA) | QA | Pending |
| Sign-off | Accessibility sign-off summary | Frontend | Pending |

---

## Blockers / Risks

- Real staging environment still inaccessible; final validation must include production-like data once available.
- Screen reader coverage limited to NVDA until macOS test environment provisioned.

---

## Next Steps (Week of 2025-10-13)

1. Schedule 2-hour session for baseline axe walkthrough.
2. Add `@axe-core/react` dependency and draft helper for Vitest integration.
3. Coordinate with QA to define acceptance rubric and sign-off criteria.
4. Update Phase 7 roadmap with accessibility milestones and dependencies.

---

## Changelog

| Date | Author | Notes |
| --- | --- | --- |
| 2025-10-12 | GitHub Copilot | Initial plan drafted; pending baseline execution |
