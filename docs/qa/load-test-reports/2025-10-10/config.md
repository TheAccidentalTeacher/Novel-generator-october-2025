# Staging Realtime Gateway Configuration Snapshot

_Last Updated: 2025-10-10_

Populate the fields below once DevOps/Phase 6 provides the staging deployment details. Keep this file alongside the JSON metrics snapshots for traceability.

---

## Deployment Metadata

- **Gateway Git Commit / Image Tag:** _(fill in)_
- **Harness Commit SHA:** _(fill in)_
- **Deployment Timestamp:** _(fill in)_
- **Operator:** _(fill in)_

## Endpoint References

- **Staging API Base URL:** _(fill in)_
- **WebSocket Path:** _(fill in)_
- **Staging Web App Origin:** _(fill in)_

## Data Stores

- **Mongo URI:**
  - Connection String: _(fill in)_
  - Database: _(fill in)_
  - Replica Set / Notes: _(fill in)_
- **Redis URL:**
  - Connection String: _(fill in)_
  - Username: _(fill in)_
  - Password Location: _(e.g., 1Password vault link)_

## Gateway Environment Overrides

| Variable | Value | Notes |
| --- | --- | --- |
| SOCKET_MAX_CONNECTIONS | _(fill in)_ |  |
| SOCKET_MAX_CONNECTIONS_PER_ORIGIN | _(fill in)_ |  |
| SOCKET_MAX_SUBSCRIPTIONS_PER_CLIENT | _(fill in)_ |  |
| SOCKET_IDLE_TIMEOUT_MS | _(fill in)_ |  |
| SOCKET_CATCH_UP_LIMIT | _(fill in)_ |  |
| SOCKET_BROADCAST_BATCH_SIZE | _(fill in)_ |  |
| SOCKET_REDIS_RESET_SEQUENCE | _(fill in)_ | Match suite config (`options.redisResetSequence`) |
| SOCKET_REDIS_RESET_DELAY_MS | _(fill in)_ | Match suite config (`options.redisResetDelayMs`) |
| REDIS_URL | _(fill in)_ |  |
| MONGODB_URI | _(fill in)_ |  |
| FEATURE_FLAGS | _(fill in)_ | e.g., `realtime.backpressure=true` |

## Contact Points

- **Backend On-call:** _(name / Slack handle)_
- **DevOps:** _(name / Slack handle)_
- **QA Lead:** _(name / Slack handle)_

Document any temporary credential expirations or rotation requirements below.

## Credential Notes

- _(e.g., Redis credentials expire 24 h after issuance — request renewal via #devops)_

## Change Log

| Date | Editor | Summary |
| --- | --- | --- |
| 2025-10-08 | Frontend Engineer | Created scaffold for staging configuration snapshot. |
| 2025-10-10 | Backend Engineer | Added Redis reset configuration placeholders. |
