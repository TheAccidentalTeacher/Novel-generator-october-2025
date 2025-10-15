# Frontend Realtime Integration Guide

_Last Updated: 2025-10-14_<br>
_Owner: Frontend Engineer_

This guide explains how the rebuilt web application should consume the realtime websocket contract exposed by the API. It covers connection setup, subscription lifecycles, event handling, state management, and observability expectations.

---

## Before You Begin

- Ensure the API service is reachable and `SOCKET_CLIENT_ORIGIN` includes the web app URL.
- Populate `.env.local` (or the Vite equivalent) with `VITE_API_BASE_URL` pointing to the API host.
  - The websocket path is always `/ws`; ensure your gateway is reachable at `${VITE_API_BASE_URL}/ws`.
- Install required dependencies in `apps/web`:
  - `socket.io-client`
  - `@tanstack/react-query`
  - `zod` (for runtime validation of payloads, optional but recommended)
- Familiarize yourself with `docs/contracts/websocket.md` and `docs/api/realtime.md` for the latest protocol details.

---

## Connection Helper

Create a shared helper that encapsulates Socket.IO connection logic and enforces the handshake flow.

```typescript
// apps/web/src/lib/realtime/socket.ts
import { io, Socket } from 'socket.io-client';

export interface RealtimeSocketOptions {
  apiBaseUrl: string;
  authToken?: string; // reserved for future auth
}

let socket: Socket | null = null;

export function getRealtimeSocket(options: RealtimeSocketOptions): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(options.apiBaseUrl, {
    path: '/ws',
    transports: ['websocket'],
    withCredentials: true,
    extraHeaders: options.authToken ? { Authorization: `Bearer ${options.authToken}` } : undefined,
  });

  socket.on('connect_error', (error) => {
    console.error('[realtime] connection error', error);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[realtime] socket disconnected', reason);
  });

  return socket;
}
```

---

## Subscription Hook

Wrap the subscription lifecycle in a React hook that coordinates join/leave events and keeps React Query caches in sync.

```typescript
// apps/web/src/features/realtime/useNovelRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime/socket';
import type {
  GenerationRealtimeEvent,
  DomainRealtimeEvent,
  JobStatusRealtimeEvent,
} from '@letswriteabook/messaging';

interface UseNovelRealtimeOptions {
  jobId: string;
  apiBaseUrl: string;
}

export function useNovelRealtime({ jobId, apiBaseUrl }: UseNovelRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;

    const socket = getRealtimeSocket({ apiBaseUrl });

    const handleGeneration = (payload: GenerationRealtimeEvent) => {
      queryClient.setQueryData(['jobs', jobId, 'generation'], (prev = []) => [...prev, payload]);
    };

    const handleDomain = (payload: DomainRealtimeEvent) => {
      queryClient.setQueryData(['jobs', jobId, 'domain-events'], (prev = []) => [...prev, payload]);
    };

    const handleStatus = (payload: JobStatusRealtimeEvent) => {
      queryClient.setQueryData(['jobs', jobId, 'status'], payload);
    };

    socket.emit('subscribe', { jobId });

    socket.on('novel.generation-event', handleGeneration);
    socket.on('novel.domain-event', handleDomain);
    socket.on('novel.job-status', handleStatus);
    socket.on('novel.error', (error) => {
      console.error(`[realtime] subscription error for ${jobId}`, error);
      if (error?.message?.includes('Too many realtime connections')) {
        // Prompt user to retry later.
      }
      if (error?.message?.includes('Disconnected due to inactivity')) {
        // Encourage the user to refresh or re-enter the workflow.
      }
    });

    return () => {
      socket.emit('unsubscribe', { jobId });
      socket.off('novel.generation-event', handleGeneration);
      socket.off('novel.domain-event', handleDomain);
      socket.off('novel.job-status', handleStatus);
    };
  }, [jobId, apiBaseUrl, queryClient]);
}
```

### Handling Catch-up

The gateway automatically replays stored events after `novel.subscribed`, so the hook only needs to ensure the query caches are ready to accept a burst of messages. Initial cache seeds can be loaded via REST endpoints (`/novel/:id/events`, `/status`) to avoid empty UI states while the replay arrives.

If the API is offline or not reachable, the web app will surface placeholder data clearly (tagged as placeholder). Point `VITE_API_BASE_URL` to a live API to exit placeholder mode.

---

## Deriving UI State

React Query selectors or memoized hooks should consume the caches seeded by the realtime hook:

```typescript
// apps/web/src/features/progress/useNovelProgress.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useNovelProgress(jobId: string) {
  const { data: generation = [] } = useQuery({
    queryKey: ['jobs', jobId, 'generation'],
    initialData: [],
  });
  const { data: domainEvents = [] } = useQuery({
    queryKey: ['jobs', jobId, 'domain-events'],
    initialData: [],
  });
  const { data: status } = useQuery({
    queryKey: ['jobs', jobId, 'status'],
  });

  return useMemo(
    () => ({
      generation,
      domainEvents,
      status,
    }),
    [generation, domainEvents, status],
  );
}
```

---

## Validation & Error Handling

- Use runtime guards (e.g., Zod) if additional assurance is required beyond the TypeScript types.
- Surface `novel.error` messages to the UI toast system to inform users when subscriptions fail.
- Handle `disconnect` events by displaying a reconnect banner; Socket.IO reconnects automatically, but the UI should show status.
- Distinguish quota errors:
  - `Too many realtime connections` or `Too many connections from this origin` → show a polite retry-later notice.
  - `Subscription limit reached` → prompt the user to close inactive dashboards or open a new browser tab.
  - `Disconnected due to inactivity` → provide a CTA that re-subscribes (e.g., refresh button).

---

## Data contracts

Phase 7 formalizes how the web app accesses persisted job snapshots alongside realtime streams.

- **Shared DTOs** – The `@letswriteabook/shared-types` package exports `ListNovelJobsResponse`, `NovelJobDetailResponse`, `NovelJobMetricsResponse`, and `NovelJobMetadataResponse`. These give the frontend strong typing around progress snapshots, story bible state, token metrics, and author metadata, aligning with the API presenters.
- **Workspace dependency** – `apps/web/package.json` now declares a dependency on `@letswriteabook/shared-types`, so TypeScript resolves the DTOs directly from the package build artifacts instead of relying only on path aliases. This removes compile-time false negatives when running `pnpm --filter @letswriteabook/web typecheck`.
- **Placeholder strategy** – REST fetchers in `features/jobs/api` produce placeholder results (tagged via `isPlaceholder: true`) when the API is offline. UI components surface these fallbacks clearly, keeping the demo experience intact while signaling missing live data.

## Observability Expectations

- Log subscription successes/failures with the job ID.
- Emit a custom metric (e.g., through PostHog or internal analytics) tracking time-to-first-event after subscription.
- Record client-side latency between consecutive events to detect stalls; feed into frontend telemetry dashboard.
- Capture counts of realtime errors grouped by message to detect when backend quotas are throttling the UI.

---

## Testing Strategy

1. **Unit Tests:**
   - Mock Socket.IO client and assert the hook registers handlers and updates React Query caches.
2. **Integration Tests:**
   - Use MSW to mock REST seeds and a local Socket.IO server to push events.
3. **E2E Tests:**
   - In Playwright, run a mocked backend that emits events and verify dashboard updates.
4. **Load Simulation:**
   - Pair with backend load tests; run multiple browser instances subscribing to the same job to observe UI rendering performance.

---

## Rollback

If realtime issues arise in production:

1. Disable websocket features via feature flag (e.g., hide live progress components).
2. Fall back to polling REST endpoints for status updates.
3. Capture telemetry and file an incident report detailing failure modes.

---

## Related References

- `docs/contracts/websocket.md`
- `docs/api/realtime.md`
- `packages/messaging` README (protocol helpers)
- `packages/domain` event type definitions
