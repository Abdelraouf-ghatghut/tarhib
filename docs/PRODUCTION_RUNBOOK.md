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

## Backup policy

- nightly custom-format PostgreSQL backup;
- encrypted storage in a second region;
- 30 daily, 12 monthly and 3 yearly restore points;
- quarterly restoration exercise into an isolated database;
- record backup checksum, size, schema migration number and restoration result.

Use `scripts/backup-postgres.ps1`, then `scripts/verify-postgres-backup.ps1` locally. Production scheduling must use the platform secret manager and encrypted object storage.

## Monitoring and alerts

Monitor HTTP latency/error rate, `/health/ready`, PostgreSQL connections/locks, Redis availability, queue depth, SLA breaches, failed push/SMS deliveries and mobile crashes. Alert on sustained 5xx, readiness failure, migration failure, backup failure, authentication spikes and stock/order transition errors.

## Mobile release checklist

- validate EN and AR, RTL, light/dark themes and accessibility on supported Android/iOS devices;
- configure APNs and FCM credentials in EAS;
- verify notification permission, foreground/background/killed delivery and deep links;
- provide privacy policy URL, support URL, data-safety declarations and account-deletion procedure;
- upload localized screenshots and store descriptions;
- complete internal testing, staged rollout and rollback rehearsal.

External signing credentials and physical-device acceptance evidence must be supplied by the release owner.
