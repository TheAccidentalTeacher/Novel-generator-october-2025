# Phase 8 Preparation: Observability & Security Hardening

**Created:** 2025-10-11  
**Owner:** DevOps + Backend Team  
**Status:** Pre-kickoff (Phase 7 in progress)

---

## Overview

This document outlines the preparation tasks for Phase 8 to enable rapid kickoff once Phase 7 exits. The goal is to implement production-grade logging, metrics, tracing, and security controls across the API, worker, and web surfaces.

---

## Prerequisites (Phase 7 Exit Gates)

Before Phase 8 can begin:
- [ ] Frontend smoke test sign-off received
- [ ] Accessibility audit complete with remediation plan
- [ ] E2E test baseline established (3+ Playwright scenarios passing)
- [ ] Performance benchmarks documented (bundle size, Lighthouse scores)

---

## Phase 8 Deliverables

### 1. Structured Logging

**Goal:** JSON-formatted logs with correlation IDs across all services.

**Tasks:**
- [ ] **API + Worker:** Replace console.log with Pino logger; configure JSON output in production mode.
- [ ] **Correlation IDs:** Generate `x-request-id` in API middleware; propagate through worker queue metadata.
- [ ] **Log levels:** Define guidelines: DEBUG (dev), INFO (startup/config), WARN (retries), ERROR (failures).
- [ ] **Sensitive data redaction:** Mask OpenAI API keys, Mongo URIs, user PII in log output.
- [ ] **Sampling:** Implement log sampling for high-volume events (e.g., websocket heartbeats) to reduce noise.

**Acceptance:**
- All services emit structured JSON logs in production.
- Correlation IDs present in 100% of request logs.
- No secrets appear in logs.

**Estimated Effort:** 2 days

---

### 2. Metrics Exporters

**Goal:** Expose Prometheus-compatible metrics for monitoring dashboards.

**Tasks:**
- [ ] **API metrics:**
  - HTTP request latency (histograms by route + method)
  - Active connections (gauge)
  - WebSocket subscription count (gauge)
  - Queue enqueue rate (counter)
- [ ] **Worker metrics:**
  - Job processing duration (histogram by stage: outline, chapter)
  - Queue depth (gauge)
  - OpenAI API latency (histogram)
  - Cost accumulation (counter)
- [ ] **Infrastructure metrics:**
  - Redis connection pool usage
  - MongoDB connection pool usage
  - Memory/CPU usage (via Railway built-in metrics)
- [ ] **Endpoint:** Expose `/metrics` on API + worker (protected by internal-only network policy or secret token).

**Acceptance:**
- Prometheus scrape succeeds against `/metrics` endpoints.
- All key performance indicators (KPIs) defined in observability SLOs are captured.

**Estimated Effort:** 3 days

---

### 3. Distributed Tracing

**Goal:** End-to-end request tracing with OpenTelemetry instrumentation.

**Tasks:**
- [ ] **SDK integration:** Add `@opentelemetry/sdk-node` to API + worker; configure OTLP exporter.
- [ ] **Auto-instrumentation:** Enable HTTP, MongoDB, Redis, and BullMQ spans.
- [ ] **Custom spans:** Wrap AI generation stages (outline, chapter) to measure prompt latency separately.
- [ ] **Trace context propagation:** Inject trace ID into WebSocket events and job queue metadata.
- [ ] **Backend selection:** Choose trace collector (Jaeger for staging, Datadog/Honeycomb for production).
- [ ] **Sampling strategy:** 100% traces in staging; 10% sampling in production (configurable via env var).

**Acceptance:**
- Full request traces visible from API ingress → worker processing → OpenAI call → persistence → WebSocket emission.
- Trace IDs present in structured logs for correlation.

**Estimated Effort:** 4 days

---

### 4. Security Enhancements

**Goal:** Harden production deployment against common attack vectors.

**Tasks:**
- [ ] **HTTPS enforcement:** Ensure Railway services use HTTPS; redirect HTTP → HTTPS.
- [ ] **CORS policy:** Lock down `Access-Control-Allow-Origin` to approved frontend domains (no `*` wildcards).
- [ ] **CSP headers:** Define Content-Security-Policy for web app; whitelist only trusted CDNs and API origins.
- [ ] **HSTS:** Enable `Strict-Transport-Security` header with 1-year max-age.
- [ ] **Rate limiting:** Implement express-rate-limit on API routes:
  - `/api/novel` (POST): 10 requests/hour/IP
  - `/api/novel/:id` (GET): 100 requests/hour/IP
  - `/internal/realtime/metrics` (GET): 20 requests/minute (internal only)
- [ ] **Authentication/authorization:** Add bearer token auth for admin endpoints (`/internal/*`); store tokens in Railway secrets.
- [ ] **Dependency scanning:** Enable Dependabot alerts; schedule quarterly security audit reviews.
- [ ] **Secret rotation strategy:** Document process for rotating MongoDB, Redis, OpenAI credentials; test rotation in staging.

**Acceptance:**
- Security checklist scorecard: 100% compliance with Railway best practices.
- No high/critical vulnerabilities in dependency scan.
- Pen-test report (optional: engage third-party audit).

**Estimated Effort:** 5 days

---

### 5. Compliance & Auditing

**Goal:** Ensure regulatory compliance and establish audit trail.

**Tasks:**
- [ ] **Log retention policy:** Configure Railway log retention (30 days staging, 90 days production).
- [ ] **PII handling review:** Audit codebase for user data storage; ensure minimal PII collection (job params only).
- [ ] **Data export capability:** Implement `/api/novel/:id/export` endpoint for GDPR compliance (JSON dump of all job data).
- [ ] **Audit log:** Record admin actions (manual job retries, config changes) in separate MongoDB collection.
- [ ] **Compliance documentation:** Publish `docs/ops/compliance-checklist.md` covering GDPR, SOC 2 readiness gaps.

**Acceptance:**
- Audit trail captures 100% of admin actions.
- PII inventory documented; no unnecessary data retained.
- Data export endpoint functional.

**Estimated Effort:** 2 days

---

## Observability SLOs (Service Level Objectives)

Define measurable targets for monitoring alerts:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API response time (p95) | < 500 ms | > 800 ms |
| Worker job processing time (p95) | < 5 minutes/chapter | > 10 minutes |
| WebSocket catch-up replay | < 1500 ms | > 2000 ms |
| Broadcast event latency (p95) | < 600 ms | > 1000 ms |
| Error rate | < 1% requests | > 2% |
| Queue depth | < 50 jobs | > 100 jobs |
| Uptime | > 99.5% | < 99.0% |

**Dashboards:**
- **Grafana/Datadog:** Create 3 dashboards:
  1. **API Health:** Request latency, error rate, connection count, queue enqueue rate.
  2. **Worker Performance:** Job duration, stage breakdown, OpenAI API latency, cost accumulation.
  3. **Realtime Gateway:** Active subscriptions, catch-up replay stats, broadcast latency, Redis pub/sub lag.

---

## Tooling & Infrastructure

**Selected Stack:**
- **Logging:** Pino (structured JSON) → Railway logs → export to S3/Datadog for long-term retention.
- **Metrics:** Prometheus exporters → Grafana Cloud or Datadog agent.
- **Tracing:** OpenTelemetry → OTLP exporter → Jaeger (staging) / Datadog (production).
- **Security:** Helmet.js for HTTP headers; express-rate-limit for throttling; Dependabot for vulnerability scanning.

**Environment Variables (additions):**

| Variable | Purpose | Default (Dev) | Production Source |
|----------|---------|---------------|-------------------|
| `LOG_LEVEL` | Logging verbosity | `debug` | `info` |
| `OTLP_EXPORTER_ENDPOINT` | Trace collector URL | `http://localhost:4318` | Railway secret |
| `METRICS_AUTH_TOKEN` | `/metrics` endpoint bearer token | (empty) | Railway secret |
| `SENTRY_DSN` | Error tracking endpoint | (empty, optional) | Railway secret |

---

## Coordination Notes

- **DevOps Lead:** Owns Grafana dashboard setup and Railway infrastructure config.
- **Backend Engineer:** Implements Pino, Prometheus, OpenTelemetry instrumentation.
- **Security Reviewer:** Audits CORS/CSP/HSTS configurations and reviews dependency scan results.
- **QA Engineer:** Validates observability data accuracy; tests rate limiting and auth tokens.

**Kickoff Meeting Agenda:**
1. Review Phase 7 exit criteria sign-off.
2. Assign task owners from checklist above.
3. Set Phase 8 sprint timeline (target: 10 days).
4. Schedule mid-sprint checkpoint to review metric dashboards.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| OpenTelemetry overhead impacts API latency | Medium | Medium | Implement 10% sampling in production; benchmark before/after. |
| Grafana Cloud cost exceeds budget | Low | High | Start with free tier; evaluate self-hosted Grafana if usage spikes. |
| Secret rotation disrupts production | Low | Critical | Test full rotation in staging; document rollback steps. |
| PII audit reveals excessive data retention | Medium | High | Conduct pre-audit sweep; delete unnecessary fields before Phase 10. |

---

## Documentation Deliverables

At Phase 8 exit:
- [ ] `docs/ops/observability.md` – Logging, metrics, tracing architecture and dashboard links.
- [ ] `docs/ops/security-checklist.md` – HTTPS, CORS, CSP, rate limiting, secret rotation procedures.
- [ ] `docs/ops/compliance-checklist.md` – PII handling, log retention, audit trail, GDPR export.
- [ ] Update `docs/config/environment-reference.md` with new observability variables.
- [ ] Update `REBUILD_EXECUTION_PLAN.md` Phase 8 section with completion status.

---

## Next Steps (Pre-Phase 8)

1. **Frontend team:** Complete Phase 7 accessibility audit and E2E baseline.
2. **DevOps lead:** Provision Grafana Cloud workspace; generate API keys for Railway integration.
3. **Backend engineer:** Spike Pino integration in API (1-day prototype); share structured log samples.
4. **Security reviewer:** Draft initial CORS/CSP policy based on current frontend domain.

**Target Phase 8 Kickoff:** 2025-10-13 (assuming Phase 7 exits by 2025-10-12).

---

**End of Preparation Document**
