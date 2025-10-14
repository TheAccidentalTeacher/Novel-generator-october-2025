# Observability Playbook

_Last Updated: 2025-10-03_<br>
_Owner: DevOps Lead_

## Before You Begin
- Verify Grafana, Prometheus, and Sentry (or equivalent) are provisioned per `infra/railway` Terraform outputs.
- Ensure service-level objectives (SLOs) are defined and approved by stakeholders.

## Steps
1. **Instrument services** using OpenTelemetry SDKs within `apps/api`, `apps/worker`, and `apps/web`.
2. **Configure exporters** to send traces, metrics, and logs to the observability stack.
3. **Dashboards**: Create or update Grafana dashboards and link snapshots in `docs/assets/observability/`.
4. **Alerting**: Define alert rules, channels, and rotation schedule; document them in `docs/ops/runbooks/`.
5. **Validation**: Run synthetic transactions and chaos drills; record results in Phase 8 documentation.

## Validation
- All services emit traces with correlation IDs.
- Critical alerts are tested via PagerDuty/Teams/Slack integration.
- Observability checklist in `REBUILD_EXECUTION_PLAN.md` Phase 8 marked complete.

## Rollback
- Disable new instrumentation modules in feature flags.
- Revert Terraform changes impacting observability resources.
- Communicate with on-call regarding visibility gaps.
