# Deployment Checklist

_Last Updated: 2025-10-14_<br>
_Owner: DevOps Lead_

## Before You Begin

- Target repository: https://github.com/TheAccidentalTeacher/Novel-generator-october-2025 (branch `main`).
- Ensure `pnpm lint`, `pnpm test`, and type checks pass in CI for the release candidate commit.
- Validate Terraform state is clean and workspaces are locked to the current operator.

## Checklist

1. ✅ Confirm golden tests and regression suites are green.
2. ✅ Verify environment variables match `docs/config/environment-reference.md` for the target environment.
   - For first deploy, consider temporarily widening `SOCKET_CLIENT_ORIGIN` to your staging web URL; re-tighten immediately after smoke tests.
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
