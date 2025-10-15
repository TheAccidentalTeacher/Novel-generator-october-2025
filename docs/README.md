# Documentation Index

Welcome to the LetsWriteABook rebuild knowledge base. This directory mirrors the deliverables listed in `REBUILD_EXECUTION_PLAN.md` and is structured so every phase produces documentation as code.

| Category               | Purpose                                                        | Key Files                                                                  |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Architecture Decisions | Record significant technical choices.                          | `./adrs/`                                                                  |
| Developer Onboarding   | Getting started, tooling requirements, commit policy.          | `./CONTRIBUTING.md`                                                        |
| Handoff                | Pick up the project quickly with current state and next steps. | `./HANDOFF.md`                                                             |
| Phase Notes            | Capture per-phase outcomes & retros.                           | `./phases/`                                                                |
| Operations             | Runbooks, deployment, observability.                           | `./ops/`                                                                   |
| UX & Design            | Design system, customization guidance.                         | `./ui/`                                                                    |
| QA                     | Test plans and reports.                                        | `./qa/` (`final-report.md`, `realtime-load-testing.md`, `test-roadmap.md`) |
| Manuals                | End-user and support guides.                                   | `./manuals/` (`user-guide.md`, `collaboration-guide.md`)                   |
| Learning Prompts       | Gamma-ready teaching briefs that mirror rebuild progress.      | `./manuals/learning/`                                                      |
| Configuration          | Environment references and secrets process.                    | `./config/`                                                                |
| Contracts              | API/WebSocket schemas and compatibility notes.                 | `./contracts/`                                                             |

## How to Contribute

1. Each document must include a `Last Updated` stamp and owning role at the top.
2. Follow the "Before You Begin / Steps / Validation / Rollback" structure for procedural guides.
3. Use relative links to connect related content and update this index whenever new documents are added.
4. Store supporting media in `./assets/` and reference them with descriptive captions.

See also:

- Windows local dev runbook: `./ops/runbooks/local-dev-windows.md`

See the rebuild execution plan for phase-by-phase documentation deliverables and owners.
