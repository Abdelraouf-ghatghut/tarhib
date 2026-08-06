# Tarhib production runbook

## Required secrets

Store these values in the deployment secret manager and EAS Secrets, never in Git or a committed `.env`:

- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`;
- Keycloak client secret and administrator credentials;
- `FIREBASE_SERVICE_ACCOUNT_JSON`;
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`;
- Infobip credentials when Infobip OTP is enabled;
- EAS project, Apple App Store Connect and Google Play credentials;
- `BACKUP_ENCRYPTION_KEY` (PR-2.4, backup encryption passphrase — losing it makes every existing backup unrecoverable, store it with the same rigor as a database credential, in a _different_ secret store than the backups themselves);
- `BACKUP_S3_BUCKET` / `BACKUP_S3_ENDPOINT` (PR-2.4, external backup storage — a second region, never the same provider/account as the primary database).

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

## Rollback procedure

Expanding step 7 above — never delete the previous image/tag until the new revision has been running cleanly for at least one full business day.

**Application-only rollback** (no schema change in the failed release, the common case):

1. Stop routing traffic to the new revision (or scale it to zero).
2. Start the previous backend image tag; confirm `/health/live` and `/health/ready`.
3. Run the smoke suite against the rolled-back revision.
4. Re-promote web/mobile update channels to the previous known-good build if they were already promoted to the failed one.
5. Investigate the failure from logs/metrics (PR-2.1 `/metrics`, `pg_stat_statements` via `apps/backend/scripts/ops-diagnostics.sql`) before attempting the release again.

**Schema-change rollback** (the release included a migration):

1. Do **not** run `migration:revert` reflexively — first check whether the migration's `down()` is actually safe against the data written since it ran (e.g. a column added and then populated by the new code cannot be silently dropped without checking nothing depends on it). Read the specific migration file.
2. If the down migration is safe: roll back the application (steps above) **before** reverting the migration, so no running code expects the new schema while it is being removed. Then `npm run migration:revert -w apps/backend` (same full-toolchain requirement as `migration:run`, see Deployment order step 3).
3. If the down migration is unsafe or destructive (data would be lost): restore from the most recent verified backup instead of reverting (`scripts/verify-postgres-backup.ps1` against the target restore point) — this is why every backup is _verified_, not just taken, per the Backup policy below.
4. Document the incident: which migration, why the down path was unsafe (if applicable), what was actually done, and the resulting RPO impact (see RPO/RTO below) if a restore was required.

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

`scripts/backup-postgres.ps1` (PR-2.4): `pg_dump` (custom format) then AES-256-CBC encrypts the dump (native .NET crypto, no external `openssl`/`gpg` dependency — key derived from `BACKUP_ENCRYPTION_KEY` via PBKDF2-SHA256, 210k iterations; the plaintext dump is deleted immediately after encryption, never left on disk). If `BACKUP_S3_BUCKET` is set, uploads the encrypted file to S3-compatible storage via the AWS CLI (`BACKUP_S3_ENDPOINT` for non-AWS S3-compatible providers); **without it, the script warns loudly and the backup stays local-only** — that is not a complete backup policy (needs the second region above), the warning is intentional, not a bug to silence.

`scripts/verify-postgres-backup.ps1` (PR-2.5): decrypts (if `.enc`) and performs a **real `pg_restore` into a dedicated throwaway database** (`tarhib_restore_verify_<timestamp>`, dropped after verification), then confirms the restored database actually has tables and readable rows — not just that the archive is listable. Reports the wall-clock restore time (RTO input, see below). Verified for real on 2026-08-05: 61 tables, 102 `employees` rows, full decrypt+restore+verify cycle in 4.9s on a ~small dev dataset — re-measure on a production-sized dataset before trusting this figure for RTO planning.

Production scheduling must use the platform secret manager for `BACKUP_ENCRYPTION_KEY`/AWS credentials, never a committed `.env`.

## RPO / RTO (PR-2.6)

**RPO (Recovery Point Objective) — up to 24 hours today.** The current setup takes nightly `pg_dump` snapshots only; it does not do continuous WAL archiving/PITR. In the worst case (incident right before the next scheduled backup), up to a full day of writes is unrecoverable. **This is a known, honest gap** — the original plan called for "PITR/managed snapshots," which this phase did not implement (it requires either a managed PostgreSQL provider's built-in PITR feature, or self-hosted continuous WAL archiving via `archive_command` to S3 — meaningfully more infrastructure than a nightly dump job). Tightening the RPO below 24h is follow-up work, not done here.

**RTO (Recovery Time Objective) — measured, not assumed.** `scripts/verify-postgres-backup.ps1` reports actual restore wall-clock time on every run: **4.9 seconds** for the current dev dataset (61 tables, 102 `employees` rows), measured 2026-08-05. This number will grow with data volume — re-run the verification script against a production-sized copy before quoting an RTO to the business, and record the result here:

| Date       | Dataset size                        | Restore time | Notes                                       |
| ---------- | ----------------------------------- | ------------ | ------------------------------------------- |
| 2026-08-05 | dev (61 tables, 102 employees rows) | 4.9s         | First real measurement, PR-2.5 verification |

Full incident RTO also includes: locating/downloading the encrypted backup from external storage (network-dependent, not measured here), redeploying the application (Deployment order above), and the quarterly restoration exercise (Backup policy) — the 4.9s figure covers only the `pg_restore` step itself.

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

## Redundancy (Phase 3 — conditional, partially implemented)

Phase 3 is explicitly conditional in the plan: only engage it once measurements or business need justify it, and two-processes-on-one-VPS is not high availability. What's actually done vs. what remains real infrastructure work:

**Done and verified for real (2026-08-05):**

- _Socket.IO Redis adapter_ (`src/notifications/redis-io.adapter.ts`, wired in `main.ts`): without it, an event emitted by `emitOrderUpdate` on backend instance A never reaches a socket connected to instance B — each Socket.IO process only knows its own sockets. Verified with two real local backend instances (ports 3000/3001, same Postgres/Redis): a client connected to instance A received `order:new` for an order created via instance B's REST API (`apps/backend/loadtest/test-redis-io-adapter.mjs`, kept as a reusable regression check). No behavior change for a single-instance deployment.
- _Redis Sentinel reference topology_ (`docker-compose.sentinel.yml`, 1 master + 2 replicas + 3 sentinels, isolated from the app's own dev Redis): real automatic failover verified — see the file's header comment for the two failure-injection methods tried (`docker stop` triggers Sentinel's defensive "tilt mode" via DNS teardown and does **not** fail over; `docker pause`, closer to a real hung/crashed process with the host still reachable, **does** fail over correctly in ~30s, and the old master is safely demoted on return, never reclaiming master automatically). **Not wired into the application** — `redis.module.ts` still connects directly to the single dev Redis; adopting this for real means replacing that connection with ioredis's `sentinels: [...]` option, worth doing only if Redis actually becomes a real availability risk.
- _External image storage_: evaluated and **skipped, not applicable** — there is no existing local-disk image upload mechanism to migrate away from (`Product.imageUrl` is a bare string column with no multer/upload endpoint anywhere in the codebase today). Nothing to fix; revisit if an upload feature is ever built.

**Out of reach from a coding session — real infrastructure, not implemented here:**

- _Second VPS in a different failure domain_ — needs an actual second server/provider account.
- _Two backend instances behind a load balancer_ — the Redis adapter above is the code-level prerequisite; the actual load balancer (nginx/HAProxy/cloud LB) and second running instance need real infra.
- _Keycloak redundancy with a shared database_ — needs a second Keycloak node and a shared/replicated database, real infra.
- _PostgreSQL with genuine guaranteed failover_ — needs either a managed provider's failover feature (see D11, still conditional/unvalidated) or self-hosted Patroni/repmgr across multiple real machines.
- _Real node-loss tests_ — pulling power/network on an actual second node; meaningless to simulate with both "nodes" on one dev laptop.

## Mobile release checklist

- validate EN and AR, RTL, light/dark themes and accessibility on supported Android/iOS devices;
- configure APNs and FCM credentials in EAS;
- verify notification permission, foreground/background/killed delivery and deep links;
- provide privacy policy URL, support URL, data-safety declarations and account-deletion procedure;
- upload localized screenshots and store descriptions;
- complete internal testing, staged rollout and rollback rehearsal.

External signing credentials and physical-device acceptance evidence must be supplied by the release owner.
