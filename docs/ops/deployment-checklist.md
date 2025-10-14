# Deployment Checklist

_Last Updated: 2025-10-03_<br>
_Owner: DevOps Lead_

## Before You Begin
- Confirm all Phase 9 QA sign-offs are complete.
- Ensure `pnpm lint`, `pnpm test`, and `pnpm build` pass in CI for the release candidate commit.
- Validate Terraform state is clean and workspaces are locked to the current operator.

## Checklist
1. ✅ Confirm golden tests and regression suites are green.
2. ✅ Verify environment variables match `docs/config/environment-reference.md` for the target environment.
3. ✅ Review Terraform plan for the target Railway workspace; obtain approval.
4. ✅ Promote Docker images from staging to production via Railway CLI.
5. ✅ Execute database migrations with backups confirmed.
6. ✅ Notify stakeholders and schedule canary window.
7. ✅ Monitor key dashboards during canary period (list SLOs).
8. ✅ Capture deployment summary and attach to release notes.

## Validation
- Production smoke tests succeed post-deploy.
- No SLOs breached within the first monitoring window.
- Incident log remains clear.

## Rollback
- Follow `docs/ops/railway-deployment-guide.md` rollback section.
- Restore MongoDB snapshot if migrations introduced issues.
- Communicate rollback completion and lessons learned.
