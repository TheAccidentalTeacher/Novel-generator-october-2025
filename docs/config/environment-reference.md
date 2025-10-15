# Environment Variable Reference

_Last Updated: 2025-10-14_<br>
_Owner: Tech Lead_

This document is the canonical source of truth for all environment variables used across the LetsWriteABook monorepo. Keep `.env.example` files in sync by running `pnpm config:lint-env`.

| Variable                              | Description                                                                         | Format / Allowed Values                     | Services         | Default / Source                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`                      | Credential for OpenAI completions.                                                  | Non-empty string, 51 characters.            | API, Worker      | Secret store only                                                                       |
| `MONGODB_URI`                         | Mongo Atlas connection string.                                                      | Valid MongoDB URI with retryWrites.         | API, Worker      | Local default: `mongodb://root:example@localhost:27017/letswriteabook?authSource=admin` |
| `REDIS_URL`                           | Redis connection for BullMQ queues.                                                 | `redis://user:pass@host:port`.              | API, Worker      | Local default: `redis://localhost:6379`                                                 |
| `PORT`                                | HTTP port binding.                                                                  | Integer 1024-65535.                         | API              | Local default: `3001`                                                                   |
| `NODE_ENV`                            | Runtime mode.                                                                       | `development` \| `staging` \| `production`. | All services     | Local default: `development`                                                            |
| `AI_MODEL_OVERRIDES`                  | Optional JSON string overriding model IDs per stage.                                | JSON object string.                         | Worker           | Empty string                                                                            |
| `SOCKET_CLIENT_ORIGIN`                | Allowed CORS origin for WebSockets.                                                 | URL.                                        | API              | Local default: `http://localhost:5173`                                                  |
| `SOCKET_MAX_CONNECTIONS`              | Hard cap on concurrent realtime socket connections (0 disables limit).              | Integer ≥ 0.                                | API              | Local default: `0`                                                                      |
| `SOCKET_MAX_CONNECTIONS_PER_ORIGIN`   | Maximum concurrent connections allowed per origin (0 disables limit).               | Integer ≥ 0.                                | API              | Local default: `0`                                                                      |
| `SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT` | Maximum unique job subscriptions permitted per socket.                              | Integer ≥ 1.                                | API              | Local default: `20`                                                                     |
| `SOCKET_IDLE_TIMEOUT_MS`              | Idle timeout before disconnecting silent sockets (0 disables timeout).              | Integer ≥ 0 (milliseconds).                 | API              | Local default: `300000`                                                                 |
| `API_LOG_LEVELS`                      | Comma-separated NestJS log levels. Controls console verbosity.                      | `log,error,warn,debug,verbose` subset.      | API              | Local default: `log,error,warn`                                                         |
| `WORKER_LOG_LEVELS`                   | Comma-separated worker log levels. Enables JSON `debug` traces.                     | `info,warn,error,debug` subset.             | Worker           | Local default: `info,warn,error`                                                        |
| `VITE_API_BASE_URL`                   | Frontend base URL for API calls.                                                    | URL.                                        | Web              | Local default: `http://localhost:3001`                                                  |
| `VITE_REALTIME_SOCKET_URL`            | WebSocket endpoint for realtime job streaming. Falls back to API base when omitted. | URL.                                        | Web              | Local default: `http://localhost:3001`                                                  |
| `RAILWAY_PROJECT_ID`                  | Railway project identifier for CI deploy.                                           | UUID string.                                | CI/CD tooling    | Secret store                                                                            |
| `SENTRY_DSN`                          | Observability ingestion DSN.                                                        | URL                                         | API, Worker, Web | Optional                                                                                |

## Secrets Management

- **Production**: Store secrets in Railway's environment manager. Rotate keys quarterly.
- **Development**: Use `doppler run` or `direnv` to inject local secrets without committing them.
- **Audit**: Track changes via pull requests that update this file; include impact notes.

Windows tip: In PowerShell, set per-process env vars with `$env:VAR='value'`. Prefer app-level `.env` files to avoid quoting issues during script execution.

## Change Process

1. Submit PR updating this reference and `.env.example` templates.
2. Tag Tech Lead and DevOps for review.
3. Communicate breaking changes via PM-led release notes.
