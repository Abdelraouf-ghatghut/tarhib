# Tarhib production runbook

## Required secrets

Store these values in the deployment secret manager and EAS Secrets, never in Git or a committed `.env`:

- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`;
- Keycloak client secret and administrator credentials;
- `FIREBASE_SERVICE_ACCOUNT_JSON`;
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`;
- Infobip credentials when Infobip OTP is enabled;
- EAS project, Apple App Store Connect and Google Play credentials.

## Deployment order

1. Create a PostgreSQL backup and verify it.
2. Build immutable backend and web images (PR-1.9):
   ```
   docker build -f apps/backend/Dockerfile   -t tarhib-backend:<tag>   .
   docker build -f apps/web-admin/Dockerfile -t tarhib-web-admin:<tag> .
   ```
   Build context is the repo root in both cases (npm workspaces monorepo — the
   Dockerfiles need every workspace's `package.json` to resolve the lockfile,
   even though only their own app is actually compiled/run). Pass
   `--build-arg VITE_API_URL=https://api.example.com` to the web-admin build
   if the backend URL differs from the compiled-in default.
3. Run `npm run migration:run -w apps/backend` as a one-off release job **from
   a full-toolchain environment (CI runner or `deps`/`build` Docker stage),
   not from the slim `runtime` image** — the production image ships only
   `dist/` + production dependencies, no `typescript`/`ts-node`/devDependencies,
   so the TypeORM CLI (which runs against `src/data-source.ts`) cannot execute
   there.
4. Start the new backend revision and check `/health/live` and `/health/ready`.
5. Run the authenticated smoke suite.
6. Promote web and mobile update channels only after the smoke suite succeeds.
7. Keep the previous backend image available for rollback. Database rollback requires an explicitly reviewed down migration or a tested restore; never run automatic destructive rollback.

## One-off ops scripts

Some schema changes cannot run inside a TypeORM migration transaction and ship as standalone `apps/backend/scripts/ops-*.sql`, applied once by hand via `psql` outside a deployment window that needs to block. Applied so far:

- `ops-add-orders-indexes.sql` (PR-1.2) — `CREATE INDEX CONCURRENTLY` on `orders` (company+branch+created_at, employee+created_at, company+created_at). Idempotent (`IF NOT EXISTS`), safe to re-run.

`ops-diagnostics.sql` (PR-2.2) is different in kind — not a one-off change, a repeatable reference for incident response and periodic perf review (top/slow queries via `pg_stat_statements`, blocked sessions, deadlock counters, connection pool saturation). Copy/paste the relevant section into `psql`.

## Backup policy

- nightly custom-format PostgreSQL backup;
- encrypted storage in a second region;
- 30 daily, 12 monthly and 3 yearly restore points;
- quarterly restoration exercise into an isolated database;
- record backup checksum, size, schema migration number and restoration result.

Use `scripts/backup-postgres.ps1`, then `scripts/verify-postgres-backup.ps1` locally. Production scheduling must use the platform secret manager and encrypted object storage.

## Monitoring and alerts

**Application metrics (PR-2.1)**: `GET /metrics` on the backend exposes Prometheus text format — HTTP request duration/count by route+status, Node process metrics (CPU, memory, event loop lag, GC, prefixed `tarhib_`), SQL query duration/errors by operation, Redis command duration/errors, WebSocket connected-client gauge and emitted-event counter. The endpoint is `@Public()` (Prometheus does not send a JWT) — **restrict access at the network layer** (VPS firewall / reverse proxy allow-list for the collector's IP only), never expose it on the public internet.

**Reference observability stack (PR-2.3)**: `docker-compose.observability.yml` (Prometheus + Alertmanager + Grafana + node_exporter). Start alongside the app stack:

```
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Prometheus UI `:9090`, Alertmanager `:9093`, Grafana `:3001` (import a community dashboard by ID for Node Exporter/Prometheus visuals rather than hand-rolling one — e.g. dashboard ID 1860 for Node Exporter Full). Alert rules live in `observability/prometheus/alert.rules.yml`:

| Alert                           | Condition                                | Severity |
| ------------------------------- | ---------------------------------------- | -------- |
| `BackendDown`                   | scrape target down 1min                  | critical |
| `HighErrorRate`                 | 5xx ratio > 5% over 5min                 | critical |
| `HighLatencyP95`                | HTTP p95 > 1s over 5min                  | warning  |
| `AuthFailureSpike`              | `/auth/login` 401 rate > 0.5/s over 5min | warning  |
| `DbQueryErrors`                 | > 5 SQL errors in 5min                   | critical |
| `RedisErrorsElevated`           | > 20 Redis errors in 5min                | warning  |
| `WebsocketClientsDroppedToZero` | WS clients hit 0 after having >5         | warning  |
| `HighCpuUsage`                  | host CPU > 85% for 10min                 | warning  |
| `HighMemoryUsage`               | host RAM > 90% for 10min                 | warning  |
| `LowDiskSpace`                  | free disk < 15% for 10min                | critical |

All thresholds are starting points — retune once real production traffic patterns are known. `observability/alertmanager/alertmanager.yml` ships with a no-op receiver (verifies rules fire, sends nowhere); **replace with a real receiver (email/Slack/PagerDuty) with real credentials before relying on it in production.**

**Known gaps, not covered by this stack** — need separate tooling:

- _TLS certificate expiry_: needs a `blackbox_exporter` probe or the hosting/reverse-proxy provider's own alerting (many auto-renew and alert already).
- _Backup freshness/failure_: no metric is pushed from `backup-postgres.ps1` today — either wire a Prometheus Pushgateway call at the end of the backup job, or rely on the scheduler's own failure notification (cron/Task Scheduler exit-code alerting).
- _node_exporter fidelity on Docker Desktop (dev)_: CPU/RAM/disk numbers reflect the Docker Desktop VM, not the physical host, on Windows/Mac dev machines. On the target VPS (native Linux Docker), the same compose file gives accurate host metrics.

**Also monitor**: PostgreSQL connections/locks and slow queries via `pg_stat_statements` (PR-2.2, `apps/backend/scripts/ops-diagnostics.sql` — copy/paste queries for incident response, not an automated dashboard), queue depth, SLA breaches, failed push/SMS deliveries and mobile crashes (currently manual/log-based, not yet wired into the metrics stack above). Alert on migration failure and backup failure via the deployment/backup job's own exit code until the Pushgateway wiring above exists.

## Mobile release checklist

- validate EN and AR, RTL, light/dark themes and accessibility on supported Android/iOS devices;
- configure APNs and FCM credentials in EAS;
- verify notification permission, foreground/background/killed delivery and deep links;
- provide privacy policy URL, support URL, data-safety declarations and account-deletion procedure;
- upload localized screenshots and store descriptions;
- complete internal testing, staged rollout and rollback rehearsal.

External signing credentials and physical-device acceptance evidence must be supplied by the release owner.
