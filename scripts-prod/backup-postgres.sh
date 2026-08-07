#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

BACKUP_DIR="/var/backups/tarhib/postgres"
COMPOSE_FILE="/opt/tarhib/docker-compose.prod.yml"
ENV_FILE="/opt/tarhib/.env.production"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

cd /opt/tarhib

POSTGRES_USER="tarhib"

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
