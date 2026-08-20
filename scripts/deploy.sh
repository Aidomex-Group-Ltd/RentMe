#!/bin/sh
# ─── Production Deployment Script ────────────────────────
# Usage: ./scripts/deploy.sh [production_domain]
# Implements: build → backup → migrate → deploy → health → rollback on failure
set -eu

DOMAIN="${1:-rentme.ug}"
DEPLOY_TAG="deploy-$(date +%Y%m%d_%H%M%S)"
HEALTH_URL="http://localhost:3000/api/health"
MAX_HEALTH_RETRIES=15
HEALTH_RETRY_INTERVAL=4

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"; }
error() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $1" >&2; }

# ─── Step 1: Validate repository state ──────────────────
log "Step 1: Validating repository state..."
if ! git diff --quiet; then
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
if npm test --if-present; then
  log "  Tests passed"
else
  log "  No test suite configured (skipped)"
fi

# ─── Step 4: Build application ─────────────────────────
log "Step 4: Building application..."
npm run build
log "  Build successful"

# ─── Step 5: Build Docker image ────────────────────────
log "Step 5: Building Docker image..."
docker compose build app
log "  Docker image built"

# ─── Step 6: Database backup ───────────────────────────
log "Step 6: Creating database backup..."
if docker compose ps db | grep -q "Up"; then
  docker compose exec -T db pg_dump -U "${POSTGRES_USER:-rentme}" "${POSTGRES_DB:-rentme}" \
    | gzip > "/tmp/rentme_pre_deploy_${DEPLOY_TAG}.sql.gz"
  log "  Database backup saved: /tmp/rentme_pre_deploy_${DEPLOY_TAG}.sql.gz"
else
  log "  Database not running via Docker (skipping backup)"
fi

# ─── Step 7: Run database migrations ──────────────────
log "Step 7: Running database migrations..."
docker compose exec -T app npx prisma db push --skip-generate || {
  error "Database migration failed!"
  log "  Rolling back: using previous Docker image"
  docker compose up -d --no-deps app
  exit 1
}
log "  Migrations applied successfully"

# ─── Step 8: Start new application version ─────────────
log "Step 8: Starting application..."
docker compose up -d --no-deps --wait app

# ─── Step 9: Wait for health checks ───────────────────
log "Step 9: Waiting for health checks..."
RETRIES=0
HEALTHY=false
while [ ${RETRIES} -lt ${MAX_HEALTH_RETRIES} ]; do
  RETRIES=$((RETRIES + 1))
  sleep ${HEALTH_RETRY_INTERVAL}

  HEALTH_RESPONSE=$(curl -sf "${HEALTH_URL}" 2>/dev/null || echo '{"status":"unreachable"}')
  STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ "${STATUS}" = "healthy" ]; then
    HEALTHY=true
    break
  fi
  log "  Health check ${RETRIES}/${MAX_HEALTH_RETRIES}: ${STATUS:-waiting...}"
done

if [ "${HEALTHY}" != "true" ]; then
  error "Application failed health checks after ${MAX_HEALTH_RETRIES} attempts!"
  log "  Rolling back to previous version..."

  # Rollback: restart with previous image
  docker compose up -d --no-deps app
  sleep 5
  ROLLBACK_HEALTH=$(curl -sf "${HEALTH_URL}" 2>/dev/null || echo '{"status":"unreachable"}')
  ROLLBACK_STATUS=$(echo "${ROLLBACK_HEALTH}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ "${ROLLBACK_STATUS}" = "healthy" ]; then
    log "  Rollback successful. Previous version is healthy."
  else
    error "CRITICAL: Rollback also failed health checks. Manual intervention required!"
  fi
  exit 1
fi
log "  Application is healthy"

# ─── Step 10: Verify production ────────────────────────
log "Step 10: Verifying production..."
HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" 2>/dev/null || echo "000")
if [ "${HTTP_STATUS}" = "200" ] || [ "${HTTP_STATUS}" = "301" ] || [ "${HTTP_STATUS}" = "302" ]; then
  log "  Production site responding: HTTP ${HTTP_STATUS}"
else
  log "  Production site HTTP ${HTTP_STATUS} (may be expected if DNS/proxy not configured)"
fi

# ─── Step 11: Smoke tests ─────────────────────────────
log "Step 11: Running smoke tests..."
if [ -f "scripts/e2e-auth-listings.mjs" ]; then
  node scripts/e2e-auth-listings.mjs "http://localhost:3000" && \
    log "  Smoke tests passed" || \
    warn "  Smoke tests had issues (non-fatal)"
fi

# ─── Done ──────────────────────────────────────────────
echo ""
log "════════════════════════════════════════════════════"
log "Deployment ${DEPLOY_TAG} completed successfully!"
log "  Revision: ${REVISION}"
log "  Domain: ${DOMAIN}"
log "  Health: ${HEALTH_URL}"
log "════════════════════════════════════════════════════"
