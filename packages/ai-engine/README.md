# @letswriteabook/ai-engine

A standalone TypeScript package that encapsulates the LetsWriteABook novel generation pipeline. It provides stage abstractions, an orchestrating engine, and OpenAI client adapters while preserving legacy prompt and event semantics. The package is consumed by the API and worker services in later rebuild phases.

## Quick Start

```ts
import {
	generateNovel,
	OpenAiClient,
	type GenerationContext,
} from '@letswriteabook/ai-engine';

const context: GenerationContext = {
	job: {
		jobId: 'job-2025-10-04T00:00:00Z',
		title: 'A Tale of Two Refactors',
		premise: 'Two engineers rebuild a legacy AI system before NaNoWriMo.',
		genre: 'Literary Fiction',
		subgenre: 'Modern',
		targetWordCount: 60000,
		targetChapters: 12,
		humanLikeWriting: true,
	},
	analysis: null,
	outline: [],
	chapters: [],
	metadata: {},
};

const client = new OpenAiClient({
	apiKey: process.env.OPENAI_API_KEY!,
});

const result = await generateNovel(context, {
	client,
	emit: (event) => {
		// Forward to WebSocket/event bus as needed
		console.log('generation-event', event.type);
	},
});

console.log(result.chapters.length); // => 12 when successful
```

The helper accepts additional options (`stages`, `publishDomainEvent`, `logger`, `now`) for advanced scenarios. If you omit them, the engine wires sensible defaults while still requiring an explicit AI client.

## Architecture Overview

The engine executes a deterministic sequence of *stages* that operate on a shared `GenerationContext`:

| Stage | Responsibilities | Default implementation |
| --- | --- | --- |
| `outline-stage` | Invoke premise analysis when needed, request the detailed chapter outline, enrich context metadata, emit outline progress events. | `OutlineStage` |
| `chapter-stage` | Iterate outline entries, call OpenAI for each chapter with retry + backoff, emit granular progress, cost, and failure summaries. | `ChapterStage` |
| Engine wrapper | Orchestrate the registered stages, merge metadata, compute final statistics, emit legacy-compatible job updates. | `NovelGenerationEngine` |

Stages receive a `StageServices` object containing the AI client, event emitter, optional clock override, structured logger, and an optional `publishDomainEvent` hook for normalized domain events. Custom stages can be added while retaining the same contracts.

## Key Configuration Points

### OpenAI Client

`OpenAiClient` wraps the OpenAI Chat Completions API and supports granular customisation through `OpenAiClientOptions`:

| Option | Purpose | Default |
| --- | --- | --- |
| `models.analysis` | Model used for premise analysis. | `gpt-4o-mini` |
| `models.outline` | Model used for outline generation. | `gpt-4o-mini` |
| `models.chapter` | Model used for chapter drafting. | `gpt-4o` |
| `systemPrompts.*` | Override per-stage system prompt. | High-context defaults matching legacy behaviour. |
| `pricing` | Map of `{ model: { input, output } }` token prices used for cost estimation. | Internal table for `gpt-4o` and `gpt-4o-mini`. |
| `defaultTemperature` | Baseline sampling temperature if none supplied in call metadata. | `0.8` |

At runtime the worker may inject overrides via environment configuration (see `AI_MODEL_OVERRIDES` in the global env reference). The adapter also:

- Accepts per-call metadata (`options.metadata.temperature`) to tweak temperature per request.
- Supports abort signals for streaming cancellation.
- Normalises usage counters and cost calculations, returning zero when a model lacks pricing data.

### Chapter Stage

`ChapterStage` exposes `ChapterStageOptions`:

| Option | Description | Default |
| --- | --- | --- |
| `maxAttemptsPerChapter` | Maximum retries before surfacing a failure. | `3` |
| `retryDelayMs` | Delay between attempts. | `0` (no delay) |
| `computeWordCount` | Custom word counting function for generated chapters. | Utility that splits on whitespace. |

The stage records cost and retry metadata, emits legacy job-update strings, and throws `ChapterStageFailureError` with a `ChapterStageFailureSummary` describing partial progress.

### Novel Generation Engine

`NovelGenerationEngine` accepts:

- `stages`: ordered list of `IAiStage` instances (defaults to `[new OutlineStage(), new ChapterStage()]`).
- `services`: partial `StageServices` with DI-friendly client, emitter, clock, and logger overrides.

On completion the engine emits success or failure job updates mirroring the historical WebSocket payloads and forwards equivalent *domain events* through `publishDomainEvent` when provided. These domain events power new transports (e.g. WebSockets, message buses) without changing the legacy event contract. The payloads include:

- Computed quality metrics (average chapter length, completion rate, target accuracy).
- Progress snapshots that include failed chapter numbers and estimated completion when retries are pending.
- Engine metadata describing stage history and completion timestamp.

### Logging & Telemetry

Every stage invocation receives a `StageServices.logger` instance with the following shape:

| Method | Typical payload | Purpose |
| --- | --- | --- |
| `debug(meta)` | `{ jobId, stage, phase, details }` | Verbose troubleshooting output (disabled by default). |
| `info(meta)` | `{ jobId, stage, phase }` | Lifecycle breadcrumbs for observability dashboards. |
| `warn(meta)` | `{ jobId, stage, phase, error }` | Soft failures, retries, degraded modes. |
| `error(meta)` | `{ jobId, stage, phase, error }` | Hard failures that bubble to consumers. |

By default the engine injects a no-op logger so tests stay silent. Downstream services should provide a structured logger (e.g. Pino, Winston) that timestamps messages, attaches correlation IDs, and forwards logs to the central pipeline. Common patterns:

- In the worker service, pass a logger scoped to the job ID so retries and failures correlate naturally.
- In the API, forward the same logger into `StageServices` while wrapping `publishDomainEvent` to fan-out observability events.
- Override `StageServices.now` when deterministic timestamps are required (e.g. tests or replay tooling).

Document the logger choice and correlation strategy in the service README so observability remains consistent across environments.

## Testing & Golden Parity

The package ships with two complementary test suites:

1. **Behavioural unit tests** covering prompts, stages, the OpenAI client, and the orchestration engine.
2. **Golden regression tests** under `src/__tests__/engine/novelGenerationEngine.golden.test.ts` that replay captured legacy transcripts (`src/golden-tests/fixtures`). These fail fast on any deviation from event ordering, payloads, token accounting, or final job summaries.

### Running Tests

```bash
pnpm --filter ai-engine test
```

### Coverage Target

The engine must maintain ≥90% statement coverage to guard against regressions.

```bash
pnpm --filter ai-engine exec -- jest --coverage
```

Coverage reports are output to `packages/ai-engine/coverage/` when run with `--coverage`.

## Extending the Engine

- **Additional stages**: implement `IAiStage`, return enriched context + metadata, and append to the engine’s stage list.
- **Alternate AI providers**: implement `IAiClient` and inject via `StageServices.client`. Golden tests should be expanded to cover provider-specific behaviours without modifying prompt structure.
- **Event transport**: the engine emits structured `GenerationEvent` objects and, when `publishDomainEvent` is supplied, mirrors them as domain events declared in `src/core/domainEvents.ts`. Downstream layers can subscribe to the domain-event stream for new transports while preserving backwards compatibility. Do not mutate the event schema without updating the legacy parity fixtures and documentation.

### Domain Event Hooks

- Implement `StageServices.publishDomainEvent` to receive typed events such as `job-status-updated`, `chapter-progress`, `chapter-cost-tracked`, and engine-level lifecycle notifications.
- Domain events are already emitted by the outline and chapter stages, as well as the `NovelGenerationEngine`, alongside the existing `emit` calls. This preserves legacy behaviour while enabling rebuild targets to consume strongly typed events.
- Refer to `src/core/domainEvents.ts` for the canonical contract. Tests under `src/core/stages/__tests__` and `src/__tests__/engine` assert parity to prevent regressions.

## Documentation & Maintenance

- Configuration knobs and defaults for downstream services should be mirrored in `docs/config/environment-reference.md`.
- When introducing new prompts or models, update the relevant fixtures and snapshot tests alongside explanatory ADRs.
- Keep this README in sync with the actual defaults and behaviour—Phase 3 exit criteria includes documentation parity.
