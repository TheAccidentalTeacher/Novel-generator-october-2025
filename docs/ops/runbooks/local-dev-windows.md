# Local Development Runbook (Windows)

Last updated: 2025-10-14
Owner: DX Lead

This runbook gets you from clone → running API/Worker/Web on Windows PowerShell.

## Prerequisites

- Node.js 20.x
- pnpm 9+
- Optional: Docker Desktop (for local MongoDB + Redis)

## One-time Setup

```powershell
# From repo root
pnpm install
```

Optional infra containers:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

## Environment Variables

Use a private root-level `.env.secure` (gitignored) to store secrets and copy what you need into app-level `.env` files, or use a secrets injector.

Minimum for an end-to-end local run:

- apps/api/.env and apps/worker/.env
  - `MONGODB_URI=mongodb://root:example@localhost:27017/letswriteabook?authSource=admin`
  - `REDIS_URL=redis://localhost:6379`
  - `OPENAI_API_KEY=sk-...` (or switch engine to mock)
  - `SOCKET_CLIENT_ORIGIN=http://localhost:5173`
  - `PORT=3001`
- apps/web/.env
  - `VITE_API_BASE_URL=http://localhost:3001`
  - `VITE_REALTIME_SOCKET_URL=http://localhost:3001`

## Start Services

```powershell
# All services (API, Worker, Web)
pnpm dev
```

Health checks:

- API: `Invoke-WebRequest -UseBasicParsing http://localhost:3001/health`
- Web (dev): browse to http://localhost:5173

Preview static build of web:

```powershell
pnpm --filter @letswriteabook/web build
pnpm --filter @letswriteabook/web preview
# Then open http://localhost:4173
```

## Troubleshooting

- ESLint error related to `jiti`/`eslint` paths on Windows in web package:
  - Workaround: run from workspace root with `pnpm exec eslint .`
  - Or push with `--no-verify` in emergencies and let CI run lint
  - Long-term fix: pin eslint/jiti or adjust `turbo.json` to decouple test→lint locally

- API shows placeholder data in the web:
  - Ensure `apps/web/.env` points to the running API `http://localhost:3001`
  - Ensure API `SOCKET_CLIENT_ORIGIN` includes `http://localhost:5173`

- Socket connection fails:
  - Path must be `/ws`
  - Check CORS origin (`SOCKET_CLIENT_ORIGIN`)
  - Verify Redis and Mongo are reachable for catch-up replay

- Ports busy:
  - Kill stray Node/Vite processes: `Get-Process node | Stop-Process -Force`

## Useful Commands

```powershell
# Type checks
pnpm --filter @letswriteabook/api typecheck
pnpm --filter @letswriteabook/web typecheck
pnpm --filter @letswriteabook/worker typecheck

# Run API only
dotenv -f apps\api\.env -- pnpm --filter @letswriteabook/api dev
# (or manually cd into apps\api and run pnpm dev)
```

## Next Steps

- Add PowerShell scripts to start/stop API and preview web safely (see `apps/api/*.ps1` examples)
- Integrate Doppler/direnv if preferred for local secrets
