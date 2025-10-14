# Railway Deployment Runbook

_Last Updated: 2025-10-03_<br>
_Owner: DevOps Lead_

## Before You Begin
- Authenticate with Railway (`railway login`) and ensure access to `dev`, `staging`, and `production` environments.
- Install Terraform >= 1.7 and configure backends for remote state.
- Export required environment variables (`RAILWAY_TOKEN`, `TF_VAR_openai_api_key`, etc.) according to `docs/config/environment-reference.md`.

## Steps
1. **Plan Infrastructure**
   - Navigate to `infra/railway`.
   - Run `terraform workspace select <env>`.
   - Execute `terraform plan -out plan.tfplan` and attach output to the deployment ticket.
2. **Apply Infrastructure**
   - After approval, run `terraform apply plan.tfplan`.
   - Verify services (api, worker, web, redis, mongodb) are healthy in Railway dashboard.
3. **Deploy Application Images**
   - Trigger CI/CD pipeline or run `pnpm ci:deploy --env <env>` (to be implemented) which builds and pushes Docker images, then promotes them via Railway CLI.
4. **Post-Deploy Tasks**
   - Run smoke tests using `pnpm ci:smoke --env <env>`.
   - Update `docs/manuals/user-guide.md` with any user-facing changes.
   - Record deployment summary (commit hash, image tags, operator) in this runbook's appendices.

## Validation
- Railway metrics show zero deploy failures.
- Smoke tests and canary checks succeed.
- Observability alerts remain green or acknowledged.

## Rollback
1. Revert application images using `railway deploy --service <name> --build <previous-build-id>`.
2. Switch Terraform workspace to `rollback` snapshot and apply.
3. Restore MongoDB snapshot if data migrations failed.
4. Document the rollback in the incident report and update future mitigation steps.
