# Debugging Playbook

_Last Updated: 2025-10-13_<br>
_Owner: DX Lead_

This playbook describes how to capture actionable diagnostics across the monorepo when a novel generation, automated test, or deployment fails. It complements the [Observability Playbook](./observability.md) by focusing on hands-on debugging tools available to every developer.

---

## 1. Mindset and Checklist

When something breaks, capture the following before retrying:

1. **Exact trigger** – command, URL, or user flow and the timestamp.
2. **Frontend symptoms** – console errors, failed requests, UI state.
3. **Backend response** – API logs, worker logs, queue metrics, database availability.
4. **Correlated IDs** – job IDs, request IDs, or Redis channels mentioned in the logs.
5. **Environment variables** – confirm which configuration file / Railway env was active.

Recording this detail up front makes hand-offs to QA or Ops far faster.

---

## 2. Frontend (apps/web) Debugging

### 2.1 Launching with rich diagnostics

```powershell
# Default dev server with Vite overlays and React Fast Refresh
yarn --cwd apps/web dev

# Focused type-only run (great for suspected TS issues)
pnpm --filter @letswriteabook/web typecheck
```

> **Tip:** When reproducing deployment parity issues, launch against the staging API: set `VITE_API_BASE_URL` and `VITE_REALTIME_SOCKET_URL` in `.env` before running `pnpm dev`.

### 2.2 Browser tooling (Chrome / Edge F12)

| Tab | What to capture | Notes |
| --- | --- | --- |
| **Console** | React warnings, runtime errors, `socket.io-client` events | Enter `localStorage.debug = 'socket.io-client:socket'` and refresh to surface WebSocket diagnostics. |
| **Network** | 4xx/5xx responses, payload validation errors | Filter by `novel` or `ws` to isolate relevant calls. Right-click → *Copy as cURL* for backend reproduction. |
| **Sources** | Set breakpoints, leverage async stacks | Combine with `pnpm --filter @letswriteabook/web dev -- --host` to debug across devices. |
| **Application** | Local Storage / IndexedDB | Inspect cached novel drafts, feature flags, and React Query cache keys. |
| **Performance** | CPU/Memory spikes during long generations | Capture traces when the UI becomes unresponsive. |
| **React DevTools** | Component props and hooks | Install the browser extension; inspect the `GenerationDashboard` tree to verify derived state. |

### 2.3 Console logging conventions

- Prefer `console.debug()` for noisy traces; enable them selectively with the DevTools logging level drop-down.
- Use structured logs (`console.table`, `console.groupCollapsed`) when dumping collections (e.g., chapter timelines).
- Keep high-volume logging behind guard clauses:
  ```ts
  if (import.meta.env.DEV && window.localStorage.getItem('ui.debug') === 'true') {
    console.debug('Realtime payload', payload);
  }
  ```

### 2.4 WebSocket validation

1. Open DevTools → **Network** → **WS**.
2. Click the `/ws` connection and watch the **Messages** panel.
3. Look for `NovelEvents` messages. If none appear, confirm:
   - The connection status is `101 Switching Protocols` (CORS/Origin mismatches show as 403).
   - `socket.io` ping/pong frames occur every 25s (otherwise the gateway may be throttling).
   - The `SOCKET_CLIENT_ORIGIN` env variable matches the site’s domain.

---

## 3. API Service (apps/api) Debugging

### 3.1 Quick start commands

| Goal | Command (PowerShell) | Notes |
| --- | --- | --- |
| Watch mode | `pnpm --filter @letswriteabook/api dev` | Uses Nest CLI with buffered logs. |
| Inspectable session | `$env:NODE_OPTIONS='--inspect=0.0.0.0:9229'; pnpm --filter @letswriteabook/api dev` | Attach VS Code debugger to `localhost:9229`. |
| Verbose socket.io traces | `$env:DEBUG='socket.io:*'; pnpm --filter @letswriteabook/api dev` | Combine with the inspector command above. |
| Run e2e load test against local API | `pnpm --filter @letswriteabook/realtime-load-test run -- --scenario catch-up-burst` | Generates WebSocket + REST traffic. |

### 3.2 Log levels (new)

- Configure via `API_LOG_LEVELS` (comma-separated). Defaults to `log,error,warn`.
- Add `debug` to trace resolver timing, or `verbose` to surface dependency injection details.
- Example `.env` override:
  ```dotenv
  API_LOG_LEVELS=log,error,warn,debug
  ```
- Logs include service names; filter with `Select-String` or `jq`:
  ```powershell
  pnpm --filter @letswriteabook/api dev | ForEach-Object { $_ } | Select-String 'Bootstrap'
  ```

### 3.3 Common failure signatures

| Symptom | Where to inspect | Likely cause |
| --- | --- | --- |
| `400 Validation failed` | API console output with `zod` error details | Payload mismatch from web client or load test harness |
| `Error: REDIS_URL is required` | Startup exception before "API listening" log | Environment variables missing or misnamed |
| CORS 403 | Browser Network tab & API logs | `SOCKET_CLIENT_ORIGIN` misconfigured |
| Stalled novel generation | API logs lack `NovelEventsRedisSubscriber` messages | Worker offline, Redis creds invalid, or queue name mismatch |

---

## 4. Worker Service (apps/worker) Debugging

### 4.1 Quick start commands

| Goal | Command (PowerShell) | Notes |
| --- | --- | --- |
| Watch mode | `pnpm --filter @letswriteabook/worker dev` | Spins the queue processor with ts-node. |
| Inspect worker | `$env:NODE_OPTIONS='--inspect=0.0.0.0:9230'; pnpm --filter @letswriteabook/worker dev` | Attach debugger to 9230.
| Enable debug logs | `$env:WORKER_LOG_LEVELS='info,warn,error,debug'; pnpm --filter @letswriteabook/worker dev` | Terse JSON now includes `debug` events (job lifecycle). |
| Tail & pretty-print | `pnpm --filter @letswriteabook/worker dev | jq` | Requires `jq`; great for correlating job IDs. |

### 4.2 Log fields

Worker logs are JSON with the following keys:

- `level` – `info`, `warn`, `error`, or `debug`.
- `service` – always `worker` (useful when tailing multiple processes).
- `message` – human-readable summary.
- Context fields such as `jobId`, `queue`, `error`, `signal`, etc.

### 4.3 Failure hotspots

| Message | Action |
| --- | --- |
| `Failed to start worker` | Verify Mongo & Redis URLs, ensure the services are reachable (use `Test-NetConnection`). |
| `Realtime publisher unavailable` | WebSocket broadcasting degraded; confirm Redis credentials & firewall. |
| `Unhandled promise rejection` | Open the job ID in Mongo (`novel_jobs` collection) to inspect the stored stack trace. |

### 4.4 Graceful shutdown

Send `Ctrl+C` or SIGTERM; the worker now logs each phase of shutdown. If the process hangs, check pending Redis connections with `redis-cli CLIENT LIST` and look for stuck queues.

---

## 5. Shared Tooling & Shortcuts

### 5.1 Combined startup script

Use separate terminals and run:

```powershell
# Pane 1: API (debug inspector)
$env:NODE_OPTIONS='--inspect=0.0.0.0:9229'; pnpm --filter @letswriteabook/api dev

# Pane 2: Worker with debug logs
$env:WORKER_LOG_LEVELS='info,warn,error,debug'; pnpm --filter @letswriteabook/worker dev

# Pane 3: Web against staging API (if needed)
$env:VITE_API_BASE_URL='https://your-api.up.railway.app'; pnpm --filter @letswriteabook/web dev
```

### 5.2 Queue visibility

- `pnpm --filter @letswriteabook/realtime-load-test run -- --scenario broadcast-burst`<br>Stresses Redis pub/sub + BullMQ. Watch for dropped messages.
- Connect to Redis and inspect queue depth:
  ```powershell
  redis-cli -u $env:REDIS_URL llen bull:novel-generation:wait
  ```
- Use Mongo shell / Compass to read the `novel_job_events` collection when debugging timeline glitches.

### 5.3 Automated test debugging

| Layer | Command | Notes |
| --- | --- | --- |
| Unit (API) | `pnpm --filter @letswriteabook/api test -- --watch` | Use `--runInBand` if hitting concurrency race conditions. |
| Unit (Worker) | `pnpm --filter @letswriteabook/worker test -- --runInBand` | BullMQ mocks log queue names. |
| Playwright | `pnpm --filter @letswriteabook/web test:e2e:ui` | Opens UI mode for step-by-step replay. |
| Responsive automation | `pnpm --filter @letswriteabook/web test:e2e -- --grep @responsive` | Ensure the responsive script is functioning before regression runs. |

### 5.4 Capturing artifacts

- Chrome DevTools: **Export HAR** for failing sessions.
- Playwright: set `PWDEBUG=console` to keep browser open after failure.
- Worker/API logs: redirect to timestamped files (`... > logs/api-$(Get-Date -Format 'yyyyMMdd-HHmmss').log`).

---

## 6. Troubleshooting Decision Tree

1. **UI shows spinner forever**
   - Check WebSocket frames; if absent → verify Redis + worker.
   - If frames exist but UI ignores them → inspect React state (React DevTools) for stale cache.
2. **Job fails immediately**
   - Worker log `Failed to start` → credentials. Otherwise inspect job metadata in Mongo.
3. **Only staging deploy fails**
   - Compare `.env.secure` entries with Railway variables using the [Railway CLI](https://docs.railway.app/cli).
   - Ensure `SOCKET_CLIENT_ORIGIN` matches the deployed web URL.
4. **Load tests collapse**
   - Run `broadcast-burst`; check API logs for rate limiting, worker for `Realtime publisher unavailable`.
   - Inspect system metrics (CPU, memory) per Observability Playbook.

---

## 7. Next Steps / Enhancements

- Integrate VS Code launch configurations for API & worker inspectors.
- Automate log prettifying via a shared `pnpm tail:worker` script.
- Wire Sentry to capture both frontend and backend stack traces.
- Add BullMQ dashboard (e.g., [Arena](https://github.com/bee-queue/arena)) for live queue introspection.

Document improvements or issues in `docs/ops/debugging-playbook.md` and tag the DX owner.
