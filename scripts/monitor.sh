#!/bin/sh
# ─── Erikot Properties Production Monitor ──────────────────
# Usage: ./scripts/monitor.sh [base_url]
set -eu

BASE_URL="${1:-http://127.0.0.1:3000}"
PROD_URL="${PROD_URL:-https://erikot.site}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo "${GREEN}✓${NC} $1"; }
fail() { echo "${RED}✗${NC} $1"; }
warn() { echo "${YELLOW}⚠${NC} $1"; }

ISSUES=0

echo "╔══════════════════════════════════════════════════╗"
echo "║       Erikot Properties Production Monitor Report ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ─── 1. Application Health ──────────────────────────────
echo "── Application Health ──"
HEALTH_RESPONSE=$(curl -sf "${BASE_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
HEALTH_STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

if [ "${HEALTH_STATUS}" = "healthy" ]; then
  pass "Application health: healthy"
elif [ "${HEALTH_STATUS}" = "degraded" ]; then
  warn "Application health: degraded"
  ISSUES=$((ISSUES + 1))
else
  fail "Application health: unreachable"
  ISSUES=$((ISSUES + 1))
fi

if echo "${HEALTH_RESPONSE}" | grep -q '"database".*"status":"healthy"\|"status":"healthy".*"latencyMs"'; then
  pass "Database connectivity: healthy"
elif echo "${HEALTH_RESPONSE}" | grep -q '"status":"unhealthy"'; then
  fail "Database connectivity: unhealthy"
  ISSUES=$((ISSUES + 1))
else
  # Fallback: parse database.status from nested JSON loosely
  if echo "${HEALTH_RESPONSE}" | grep -q '"latencyMs"'; then
    pass "Database connectivity: responding"
  else
    warn "Database connectivity: unknown"
  fi
fi

# ─── 2. Container / Pod Status ──────────────────────────
echo ""
echo "── Orchestrator Status ──"
if command -v kubectl >/dev/null 2>&1 && kubectl -n rentme get deploy rentme-app >/dev/null 2>&1; then
  pass "k3s namespace rentme reachable"
  kubectl -n rentme get deploy,po,svc,ingress 2>/dev/null || true
  READY=$(kubectl -n rentme get deploy rentme-app -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  DESIRED=$(kubectl -n rentme get deploy rentme-app -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")
  if [ "${READY}" = "${DESIRED}" ] && [ "${READY}" != "0" ]; then
    pass "Deployment ready: ${READY}/${DESIRED}"
  else
    fail "Deployment not ready: ${READY:-0}/${DESIRED:-0}"
    ISSUES=$((ISSUES + 1))
  fi
elif command -v docker >/dev/null 2>&1; then
  CONTAINERS=$(docker compose ps --format "{{.Name}} {{.Status}}" 2>/dev/null || echo "")
  if [ -n "${CONTAINERS}" ]; then
    echo "${CONTAINERS}" | while read -r name status; do
      if echo "${status}" | grep -qi "up\|running"; then
        pass "${name}: ${status}"
      else
        fail "${name}: ${status}"
      fi
    done
  else
    warn "No k3s rentme deploy and no compose containers"
  fi
else
  warn "Neither kubectl rentme nor Docker compose available"
fi

# ─── 3. Redis (not required by current app) ─────────────
echo ""
echo "── Redis ──"
warn "Redis not used (NextAuth JWT sessions). Skipped."

# ─── 4. Disk Usage ──────────────────────────────────────
echo ""
echo "── Disk Usage ──"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "${DISK_USAGE}" -lt 80 ]; then
  pass "Disk usage: ${DISK_USAGE}%"
elif [ "${DISK_USAGE}" -lt 90 ]; then
  warn "Disk usage: ${DISK_USAGE}% (high)"
else
  fail "Disk usage: ${DISK_USAGE}% (critical)"
  ISSUES=$((ISSUES + 1))
fi

# ─── 5. Memory Usage ────────────────────────────────────
echo ""
echo "── Memory Usage ──"
if command -v free >/dev/null 2>&1; then
  MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
  if [ "${MEM_USAGE}" -lt 80 ]; then
    pass "Memory usage: ${MEM_USAGE}%"
  elif [ "${MEM_USAGE}" -lt 90 ]; then
    warn "Memory usage: ${MEM_USAGE}% (high)"
  else
    fail "Memory usage: ${MEM_USAGE}% (critical)"
    ISSUES=$((ISSUES + 1))
  fi
else
  warn "free not available"
fi

# ─── 6. SSL Certificate Expiry ──────────────────────────
echo ""
echo "── SSL Certificate ──"
DOMAIN=$(echo "${PROD_URL}" | sed 's|https://||' | sed 's|/.*||')
CERT_EXPIRY=$(echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")

if [ -n "${CERT_EXPIRY}" ]; then
  EXPIRY_EPOCH=$(date -d "${CERT_EXPIRY}" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  if [ "${DAYS_LEFT}" -gt 30 ]; then
    pass "SSL certificate expires in ${DAYS_LEFT} days (${CERT_EXPIRY})"
  elif [ "${DAYS_LEFT}" -gt 7 ]; then
    warn "SSL certificate expires in ${DAYS_LEFT} days - renew soon"
  else
    fail "SSL certificate expires in ${DAYS_LEFT} days - URGENT"
    ISSUES=$((ISSUES + 1))
  fi
else
  warn "Could not check SSL certificate for ${DOMAIN}"
fi

# ─── 7. Recent Application Logs ─────────────────────────
echo ""
echo "── Recent Errors (last 50 log lines) ──"
if command -v docker >/dev/null 2>&1; then
  ERRORS=$(docker compose logs --tail=50 app 2>/dev/null | grep -icE "error|fatal|exception" || echo "0")
  ERRORS=$(echo "${ERRORS}" | tr -d '[:space:]')
  if [ "${ERRORS}" -gt 10 ]; then
    fail "Found ${ERRORS} error entries in recent logs"
    ISSUES=$((ISSUES + 1))
  elif [ "${ERRORS}" -gt 0 ]; then
    warn "Found ${ERRORS} error entries in recent logs"
  else
    pass "No significant errors in recent logs"
  fi
else
  warn "Docker not available - cannot check application logs"
fi

# ─── 8. Deployment Status ───────────────────────────────
echo ""
echo "── Deployment Status ──"
if docker compose ps --status running app >/dev/null 2>&1; then
  pass "Docker Compose app service is configured"
fi
if [ -f ".vercel/project.json" ]; then
  warn "Vercel project metadata present (app may also deploy via Vercel)"
fi

echo ""
echo "════════════════════════════════════════════════════"
if [ "${ISSUES}" -eq 0 ]; then
  pass "All checks passed. No issues detected."
else
  fail "${ISSUES} issue(s) detected. Review above."
fi
echo "════════════════════════════════════════════════════"

exit "${ISSUES}"
