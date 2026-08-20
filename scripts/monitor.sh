#!/bin/sh
# ─── RentMe Production Monitor ───────────────────────────
# Usage: ./scripts/monitor.sh [base_url]
# Reports: app health, container status, database, Redis, disk, memory, SSL
set -eu

BASE_URL="${1:-http://localhost:3000}"
PROD_URL="${PROD_URL:-https://rentme.ug}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo "${GREEN}✓${NC} $1"; }
fail() { echo "${RED}✗${NC} $1"; }
warn() { echo "${YELLOW}⚠${NC} $1"; }

ISSUES=0

echo "╔══════════════════════════════════════════════════╗"
echo "║       RentMe Production Monitor Report          ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ─── 1. Application Health ──────────────────────────────
echo "── Application Health ──"
HEALTH_RESPONSE=$(curl -sf "${BASE_URL}/api/health" 2>/dev/null || echo '{"status":"unreachable"}')
HEALTH_STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "${HEALTH_STATUS}" = "healthy" ]; then
  pass "Application health: healthy"
elif [ "${HEALTH_STATUS}" = "degraded" ]; then
  warn "Application health: degraded"
  ISSUES=$((ISSUES + 1))
else
  fail "Application health: unreachable"
  ISSUES=$((ISSUES + 1))
fi

# DB status from health endpoint
DB_STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | tail -1 | cut -d'"' -f4)
if [ "${DB_STATUS}" = "healthy" ]; then
  pass "Database connectivity: healthy"
else
  fail "Database connectivity: ${DB_STATUS:-unknown}"
  ISSUES=$((ISSUES + 1))
fi

# ─── 2. Container Status ────────────────────────────────
echo ""
echo "── Container Status ──"
if command -v docker >/dev/null 2>&1; then
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
    warn "Could not list containers (not running via docker compose?)"
  fi
else
  warn "Docker not available"
fi

# ─── 3. Disk Usage ──────────────────────────────────────
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

# ─── 4. Memory Usage ────────────────────────────────────
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

# ─── 5. SSL Certificate Expiry ──────────────────────────
echo ""
echo "── SSL Certificate ──"
DOMAIN=$(echo "${PROD_URL}" | sed 's|https://||' | sed 's|/.*||')
CERT_EXPIRY=$(echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")

if [ -n "${CERT_EXPIRY}" ]; then
  EXPIRY_EPOCH=$(date -d "${CERT_EXPIRY}" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "${CERT_EXPIRY}" +%s 2>/dev/null || echo "0")
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

# ─── 6. Recent Application Logs ─────────────────────────
echo ""
echo "── Recent Errors (last 50 log lines) ──"
if command -v docker >/dev/null 2>&1; then
  ERRORS=$(docker compose logs --tail=50 app 2>/dev/null | grep -ic "error\|fatal\|exception" || echo "0")
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

# ─── 7. Deployment Status ───────────────────────────────
echo ""
echo "── Deployment Status ──"
if [ -f ".vercel/project.json" ]; then
  pass "Vercel deployment configured"
else
  warn "No Vercel deployment detected"
fi

# ─── Summary ────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
if [ ${ISSUES} -eq 0 ]; then
  pass "All checks passed. No issues detected."
else
  fail "${ISSUES} issue(s) detected. Review above."
fi
echo "════════════════════════════════════════════════════"

exit ${ISSUES}
