#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_DIR="/var/backups/tarhib/postgres"
COMPOSE_FILE="/opt/tarhib/docker-compose.prod.yml"
ENV_FILE="/opt/tarhib/.env.production"
RESTIC_ENV="/home/tarhibadmin/.config/tarhib/restic-r2.env"
POSTGRES_USER="tarhib"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

source "$RESTIC_ENV"

cronitor_ping() {
  local state="$1"

  curl \
    --fail \
    --silent \
    --show-error \
    --max-time 20 \
    "${CRONITOR_BACKUP_URL}?state=${state}" \
    >/dev/null || true
}

handle_failure() {
  local exit_code=$?
  trap - ERR
  cronitor_ping fail
  exit "$exit_code"
}

trap handle_failure ERR

cronitor_ping run

cd /opt/tarhib

for DATABASE_NAME in tarhib keycloak; do
  TARGET="$BACKUP_DIR/${DATABASE_NAME}_${TIMESTAMP}.dump"

  docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    exec -T postgres \
    pg_dump -U "$POSTGRES_USER" -d "$DATABASE_NAME" -Fc > "$TARGET"

  test -s "$TARGET"
done

find "$BACKUP_DIR" -type f -name '*.dump' -mtime +7 -delete

restic backup \
  /var/backups/tarhib/postgres \
  /opt/tarhib/.env.production \
  /opt/tarhib/Caddyfile \
  /opt/tarhib/docker-compose.prod.yml \
  /opt/tarhib/deployment/keycloak/tarhib-realm.json \
  /opt/tarhib/deployment/postgres/01-create-keycloak.sql \
  /opt/tarhib/scripts-prod/backup-postgres.sh \
  /etc/systemd/system/tarhib-postgres-backup.service \
  /etc/systemd/system/tarhib-postgres-backup.timer \
  --tag tarhib-production

restic forget \
  --tag tarhib-production \
  --keep-daily 30 \
  --keep-weekly 8 \
  --keep-monthly 12 \
  --prune

cronitor_ping complete
trap - ERR
