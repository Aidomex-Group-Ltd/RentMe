#!/bin/sh
# ─── PostgreSQL Backup Script ─────────────────────────────
# Runs inside the backup container. Continuously backs up every 24 hours.
# Manual usage: docker compose exec backup /usr/local/bin/backup.sh --once
set -eu

BACKUP_DIR="/backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="${POSTGRES_DB:-rentme}"
DB_USER="${POSTGRES_USER:-rentme}"

perform_backup() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting backup of ${DB_NAME}..."

  BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

  # Wait for database to be ready
  until pg_isready -h db -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
  done

  # Perform backup
  pg_dump -h db -U "${DB_USER}" -d "${DB_NAME}" \
    --no-owner --no-privileges --clean --if-exists \
    | gzip > "${BACKUP_FILE}"

  if [ $? -eq 0 ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"
  else
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: Backup failed or empty"
    rm -f "${BACKUP_FILE}"
    return 1
  fi

  # Clean up old backups (retention policy)
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cleaning backups older than ${RETENTION_DAYS} days..."
  find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print 2>/dev/null | \
    while read f; do
      echo "  Deleted: $f"
    done

  # Show current backups
  BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" | wc -l)
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Current backup count: ${BACKUP_COUNT}"
}

# If --once flag, run once and exit (for manual usage)
if [ "${1:-}" = "--once" ]; then
  perform_backup
  exit 0
fi

# Continuous mode: backup every 24 hours
echo "==> Backup scheduler started. Interval: 24 hours. Retention: ${RETENTION_DAYS} days."
while true; do
  perform_backup
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Next backup in 24 hours."
  sleep 86400 &
  wait $!
done
