#!/bin/sh
# ─── Production Deployment Script ────────────────────────
# Usage: ./scripts/deploy.sh [production_domain]
# Sequence: validate → test → build → backup → migrate → start → health → smoke
# On failure: roll back to the previously tagged image.
set -eu

DOMAIN="${1:-${PROD_DOMAIN:-erikot.site}}"
DEPLOY_TAG="deploy-$(date +%Y%m%d_%H%M%S)"
PREVIOUS_TAG="rentme:previous"
CURRENT_TAG="${RENTME_IMAGE:-rentme:local}"
HEALTH_URL="http://127.0.0.1:3000/api/health"
MAX_HEALTH_RETRIES=15
HEALTH_RETRY_INTERVAL=4

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"; }
error() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $1" >&2; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN: $1" >&2; }

# ─── Step 1: Validate repository state ──────────────────
log "Step 1: Validating repository state..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  error "Working tree is not clean. Commit or stash changes first."
  exit 1
fi
REVISION=$(git rev-parse --short HEAD)
log "  Commit: ${REVISION}"

# ─── Step 2: Install dependencies ──────────────────────
log "Step 2: Installing dependencies..."
npm ci

# ─── Step 3: Run tests ─────────────────────────────────
log "Step 3: Running tests..."
npm test
log "  Tests passed"

# ─── Step 4: Build application (local verification) ────
log "Step 4: Building application..."
npm run build
log "  Build successful"

# ─── Step 5: Tag previous image for rollback ───────────
log "Step 5: Preserving previous image for rollback..."
if docker image inspect "${CURRENT_TAG}" >/dev/null 2>&1; then
  docker tag "${CURRENT_TAG}" "${PREVIOUS_TAG}" || true
  log "  Tagged ${CURRENT_TAG} as ${PREVIOUS_TAG}"
else
  warn "No existing ${CURRENT_TAG} image to preserve"
fi

# ─── Step 6: Build Docker image ────────────────────────
log "Step 6: Building Docker image..."
RENTME_IMAGE="${CURRENT_TAG}" docker compose build app
docker tag "${CURRENT_TAG}" "rentme:${DEPLOY_TAG}"
log "  Docker image built: ${CURRENT_TAG} and rentme:${DEPLOY_TAG}"

# ─── Step 7: Database backup ───────────────────────────
log "Step 7: Creating database backup..."
mkdir -p backups
if docker compose ps --status running db 2>/dev/null | grep -q db; then
  BACKUP_FILE="backups/rentme_pre_${DEPLOY_TAG}.sql.gz"
  docker compose exec -T db pg_dump -U "${POSTGRES_USER:-rentme}" "${POSTGRES_DB:-rentme}" \
    | gzip > "${BACKUP_FILE}"
  log "  Database backup saved: ${BACKUP_FILE}"
else
  warn "Database not running via Docker (skipping backup)"
fi

# ─── Step 8: Run database migrations safely ────────────
log "Step 8: Running database migrations..."
docker compose run --rm --no-deps \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-rentme}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-rentme}?schema=public" \
  app npx prisma db push --skip-generate || {
  error "Database migration failed!"
  if docker image inspect "${PREVIOUS_TAG}" >/dev/null 2>&1; then
    docker tag "${PREVIOUS_TAG}" "${CURRENT_TAG}"
    RENTME_IMAGE="${CURRENT_TAG}" docker compose up -d --no-deps app
  fi
  exit 1
}
log "  Migrations applied successfully"

# ─── Step 9: Start new application version first ───────
log "Step 9: Starting new application version..."
RENTME_IMAGE="${CURRENT_TAG}" docker compose up -d --no-deps --force-recreate app

# ─── Step 10: Wait for health checks ───────────────────
log "Step 10: Waiting for health checks..."
RETRIES=0
HEALTHY=false
while [ "${RETRIES}" -lt "${MAX_HEALTH_RETRIES}" ]; do
  RETRIES=$((RETRIES + 1))
  sleep "${HEALTH_RETRY_INTERVAL}"

  HEALTH_RESPONSE=$(curl -sf "${HEALTH_URL}" 2>/dev/null || echo '{"status":"unreachable"}')
  STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

  if [ "${STATUS}" = "healthy" ]; then
    HEALTHY=true
    break
  fi
  log "  Health check ${RETRIES}/${MAX_HEALTH_RETRIES}: ${STATUS:-waiting...}"
done

if [ "${HEALTHY}" != "true" ]; then
  error "Application failed health checks after ${MAX_HEALTH_RETRIES} attempts!"
  log "  Rolling back to previous version..."

  if docker image inspect "${PREVIOUS_TAG}" >/dev/null 2>&1; then
    docker tag "${PREVIOUS_TAG}" "${CURRENT_TAG}"
    RENTME_IMAGE="${CURRENT_TAG}" docker compose up -d --no-deps --force-recreate app
    sleep 5
    ROLLBACK_HEALTH=$(curl -sf "${HEALTH_URL}" 2>/dev/null || echo '{"status":"unreachable"}')
    ROLLBACK_STATUS=$(echo "${ROLLBACK_HEALTH}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
    if [ "${ROLLBACK_STATUS}" = "healthy" ]; then
      log "  Rollback successful. Previous version is healthy."
    else
      error "CRITICAL: Rollback also failed health checks. Manual intervention required!"
    fi
  else
    error "No previous image available for rollback."
  fi
  exit 1
fi
log "  Application is healthy"

# ─── Step 11: Reload nginx (if running) ────────────────
if docker compose ps --status running nginx 2>/dev/null | grep -q nginx; then
  docker compose exec nginx nginx -s reload || true
fi

# ─── Step 12: Verify production URL ────────────────────
log "Step 12: Verifying production..."
HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/health" 2>/dev/null || echo "000")
if [ "${HTTP_STATUS}" = "200" ]; then
  log "  Production health OK: HTTP ${HTTP_STATUS}"
else
  LOCAL_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
  warn "Public https://${DOMAIN}/api/health returned ${HTTP_STATUS}; local health ${LOCAL_STATUS}"
fi

# ─── Step 13: Smoke tests ──────────────────────────────
log "Step 13: Running smoke tests..."
if [ -f "scripts/e2e-auth-listings.mjs" ]; then
  if node scripts/e2e-auth-listings.mjs "http://127.0.0.1:3000"; then
    log "  Smoke tests passed"
  else
    error "Smoke tests failed — rolling back"
    if docker image inspect "${PREVIOUS_TAG}" >/dev/null 2>&1; then
      docker tag "${PREVIOUS_TAG}" "${CURRENT_TAG}"
      RENTME_IMAGE="${CURRENT_TAG}" docker compose up -d --no-deps --force-recreate app
    fi
    exit 1
  fi
fi

echo ""
log "════════════════════════════════════════════════════"
log "Deployment ${DEPLOY_TAG} completed successfully!"
log "  Revision: ${REVISION}"
log "  Domain: ${DOMAIN}"
log "  Health: ${HEALTH_URL}"
log "════════════════════════════════════════════════════"
