# QA Test Roadmap

_Last Updated: 2025-10-10_<br>
_Owner: QA Lead_

## Summary

This roadmap tracks the remaining validation work across the rebuild phases, highlighting who owns each effort, when it must run, and which artifacts prove completion. It complements the phase notes and live test plans so we can quickly spot schedule risks and unblock dependent teams.

## Near-Term Commitments (Week of 2025-10-10)

| Test | Phase | Owner | Target Date | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Realtime catch-up burst (staging) | 6 | Backend Engineer | 2025-10-10 | Scheduled | `docs/qa/load-test-reports/2025-10-10/catch-up-burst-staging.json` |
| Realtime broadcast burst (staging) | 6 | Backend Engineer | 2025-10-10 | Scheduled | `docs/qa/load-test-reports/2025-10-10/broadcast-burst-staging.json` |
| Redis reset reliability drill | 6 | Backend + Frontend | 2025-10-11 | Planned | `docs/qa/load-test-reports/2025-10-10/reliability-drill.log` |
| Frontend realtime smoke (staging fixtures) | 7 | Frontend Engineer | 2025-10-12 | Planned | Vitest snapshot updates + Storybook notes |
| Storybook accessibility sweep | 7 | Frontend Engineer | 2025-10-13 | Planned | `docs/ui/design-system.md` accessibility addendum |
| Observability synthetic checks bootstrap | 8 | DevOps Engineer | 2025-10-14 | Planned | Grafana dashboard link + `docs/ops/observability.md` update |

## Upcoming Milestones (Weeks of 2025-10-14 and 2025-10-21)

| Milestone | Description | Owners | Target Week | Dependencies |
| --- | --- | --- | --- | --- |
| Frontend regression bundle | Execute full Vitest + Playwright run against staging data to baseline performance budgets. | Frontend Engineer, QA Lead | 2025-10-14 | Phase 6 staging endpoints stable |
| Messaging failover soak | Run 60-minute broadcast soak with simulated Redis outage to quantify reconnection jitter. | Backend Engineer | 2025-10-15 | Reliability drill results |
| Observability alert rehearsal | Trigger SLO breach drills (latency, error rate) and capture dashboard evidence. | DevOps Engineer | 2025-10-16 | Synthetic checks online |
| Golden parity side-by-side | Compare legacy vs. rebuild job outputs on curated prompts. | AI Engineer, QA Lead | 2025-10-21 | Persistence fixtures finalized |
| Phase 9 contract suite | Execute REST + WebSocket contract regression suite. | QA Lead | 2025-10-22 | Messaging failover soak |

## Deliverable Expectations

- **Artifacts** must land under `docs/qa/load-test-reports/<date>/` (for load testing) or in the relevant package `__tests__/__snapshots__` directories.
- **Summaries** go into the originating doc (`docs/qa/realtime-load-testing.md`, `docs/ui/design-system.md`, etc.) with explicit pass/fail callouts.
- **Issues** created for any failure should be linked back in the evidence column so the roadmap tracks remediation.

## Coordination Notes

- Notify the #realtime-qa channel 24 hours before running any load or soak tests that touch staging.
- Frontend staged smoke requires Mongo and Redis fixtures; coordinate with Backend to refresh seeds on 2025-10-11.
- Synthetic checks need Railways API tokens; DevOps to distribute via the shared secret manager and update `docs/config/environment-reference.md` if new env vars are introduced.

## Review Cadence

- QA Lead reviews this roadmap during the Tuesday rebuild sync and updates statuses immediately after each run.
- After Phase 6 exit, merge the near-term table into the Phase 7 kickoff deck and archive completed rows in `docs/qa/load-test-reports/<date>/README.md` summaries.
