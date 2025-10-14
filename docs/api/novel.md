# Novel API

_Last updated: 2025-10-07_

## Overview

The API module exposes endpoints for creating and inspecting novel-generation jobs. All routes are prefixed with `/api/novel` and respond with JSON payloads. Validation is handled with Zod DTOs and every timestamp is ISO 8601.

## Authentication

> Authentication is not yet enforced for the rebuild skeleton. Add auth middleware once the access model is defined.

## Endpoints

### POST `/api/novel`

Queues a new novel generation job.

**Request Body**

```
{
  "payload": {
    "title": "string",
    "premise": "string",
    "genre": "string",
    "subgenre": "string",
    "targetWordCount": 120000,
    "targetChapters": 36,
    "humanLikeWriting": false
  },
  "clientRequestId": "optional unique id"
}
```

- `targetWordCount` and `targetChapters` are coerced to positive integers.
- `clientRequestId` is optional but capped at 128 characters. When provided and unique it becomes the job id.

**Response** `202 Accepted`

```
{
  "status": "queued",
  "jobId": "12c5e214-...",
  "queue": "novel-generation"
}
```

### GET `/api/novel/:jobId`

Returns the full job document, including outline, chapters, events, domain events, and failures.

**Response** `200 OK`

```
{
  "jobId": "job-123",
  "status": "running",
  "queue": "novel-generation",
  "payload": { ... },
  "requestedAt": "2025-10-04T10:00:00.000Z",
  "createdAt": "2025-10-04T10:00:00.000Z",
  "updatedAt": "2025-10-04T10:05:00.000Z",
  "progress": {
    "outlineComplete": true,
    "chaptersCompleted": 5,
    "chaptersFailed": 0,
    "totalChapters": 20,
    "hasFailures": false
  },
  "summary": {
    "chaptersGenerated": 5,
    "totalChaptersPlanned": 20,
    "totalWordCount": 18000
  },
  "engine": {
    "clientType": "mock"
  },
  "outline": [...],
  "chapters": [...],
  "events": [...],
  "domainEvents": [...],
  "context": {},
  "failures": []
}
```

Returns `404 Not Found` when the job does not exist.

### GET `/api/novel/:jobId/metadata`

Retrieves author-facing configuration and story bible metadata for the specified job. Mirrors `NovelJobMetadataResponse` from `@letswriteabook/shared-types`.

**Response** `200 OK`

```
{
  "jobId": "job-123",
  "storyBible": {
    "characters": {
      "hero": {
        "name": "Avery Quinn",
        "summary": "Rogue pilot leading the resistance",
        "traits": ["resourceful", "sarcastic"],
        "relationships": [
          {
            "characterId": "mentor",
            "description": "Former squadron commander"
          }
        ]
      }
    },
    "metadata": {
      "campaign": "NaNoWriMo 2025"
    },
    "locations": null,
    "themes": ["hope", "found family"]
  },
  "continuityAlerts": [],
  "aiDecisions": [
    {
      "decisionId": "decision-42",
      "decidedAt": "2025-10-04T10:01:12.000Z",
      "type": "tone-adjustment",
      "summary": "Shifted to optimistic narration"
    }
  ],
  "enhancements": [],
  "performance": null,
  "updatedAt": "2025-10-04T10:05:00.000Z"
}
```

### GET `/api/novel/:jobId/metrics`

Returns generation cost and timing metrics derived from worker telemetry. Mirrors `NovelJobMetricsResponse`.

**Response** `200 OK`

```
{
  "jobId": "job-123",
  "cost": {
    "totalUsd": 6.13,
    "analysisUsd": 0.45,
    "outlineUsd": 0.78,
    "chaptersUsd": 4.90
  },
  "tokens": {
    "total": 61000,
    "analysis": 8000,
    "outline": 7000,
    "chapters": 46000
  },
  "latencyMs": {
    "queued": 3200,
    "processing": 295000
  },
  "updatedAt": "2025-10-04T10:05:00.000Z"
}
```

### GET `/api/novel/:jobId/events`

Streams the historical realtime events (generation + domain) persisted for the job. Accepts optional pagination query params:

- `limit` — maximum events to return (default 50, max 250).
- `before` — ISO timestamp cursor; return events emitted strictly before this value.

**Response** `200 OK`

```
{
  "items": [
    {
      "kind": "generation",
      "jobId": "job-123",
      "emittedAt": "2025-10-04T10:00:30.000Z",
      "event": {
        "type": "stage-log",
        "occurredAt": "2025-10-04T10:00:30.000Z",
        "stage": "analysis",
        "level": "info",
        "message": "analysis complete"
      }
    }
  ],
  "count": 1
}
```

### GET `/api/novel`

Lists jobs with optional filtering.

**Query Parameters**

- `limit` — optional positive integer (defaults to `50`, maximum `100`).
- `status` — optional filter; supply once for a single status or multiple times for an array. Supported statuses: `queued`, `running`, `completed`, `failed`.

**Response**

```
{
  "items": [
    {
      "jobId": "job-123",
      "status": "completed",
      "queue": "novel-generation",
      "payload": { ... },
      "requestedAt": "2025-10-04T10:00:00.000Z",
      "createdAt": "2025-10-04T10:00:00.000Z",
      "updatedAt": "2025-10-04T10:05:00.000Z",
      "progress": null,
      "summary": null,
      "engine": null
    }
  ],
  "count": 1
}
```

## Repository Interaction

- Jobs are initialized the moment the worker acknowledges them (`initializeJob`).
- Successful runs persist field-rich snapshots via `saveGenerationResult`.
- Failures funnel through `recordFailure`, preserving history for observability dashboards.

## Next Steps

- Phase 6 will layer websocket broadcasting using the same domain events returned by the detail endpoint.
- Once auth is introduced, document scopes and headers here.
