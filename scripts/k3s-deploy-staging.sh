#!/bin/sh
# ─── k3s STAGING deploy ───────────────────────────────────
# Stage 13 pipeline:
#   preflight → apply overlay → wait postgres → migration job
#   → backend/frontend rollout → health (port-forward)
#   → ingress verification (Host header) → API contract probes
#   → E2E tests (optional, RUN_E2E=1)
#
# Isolation guarantees:
#   - Namespace rentme-staging only; production (rentme) untouched.
#   - Own Postgres instance + PVC; never references prod DB.
#
# Usage: ./scripts/k3s-deploy-staging.sh [image-tag]
set -eu

NS="${RENTME_NAMESPACE:-rentme-staging}"
PROD_NS="${PROD_NAMESPACE:-rentme}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KUBECTL="${KUBECTL:-${SCRIPT_DIR}/kubectl.sh}"
OVERLAY="${RENTME_OVERLAY:-k8s/overlays/staging}"
IMAGE_REPO="${RENTME_IMAGE_REPO:-ghcr.io/aidomex-group-ltd/rentme}"
TAG="${1:-${RENTME_IMAGE_TAG:-latest}}"
IMAGE="${IMAGE_REPO}:${TAG}"
STAGING_HOST="${STAGING_HOST:-staging.rentme.ug}"
HEALTH_PATH="/api/health"
MAX_WAIT=300

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $1" >&2; exit 1; }

# ─── 0. Preflight ────────────────────────────────────────
log "Step 0: Preflight"
${KUBECTL} get --raw=/healthz >/dev/null 2>&1 || fail "cluster unreachable"
[ -f "${OVERLAY}/kustomization.yaml" ] || fail "overlay missing: ${OVERLAY}"

if [ "${TAG}" != "latest" ]; then
  log "  NOTE: TAG=${TAG} requires updating ${OVERLAY}/kustomization.yaml images.newTag"
fi

${KUBECTL} -n "${NS}" get secret rentme-secrets >/dev/null 2>&1 \
  || fail "rentme-secrets missing in ${NS}. Run: RENTME_NAMESPACE=${NS} ./scripts/k3s-secrets.sh"

# Image pull secret: copy from production namespace if present and not already staged
if ! ${KUBECTL} -n "${NS}" get secret ghcr-pull >/dev/null 2>&1; then
  if ${KUBECTL} -n "${PROD_NS}" get secret ghcr-pull >/dev/null 2>&1; then
    log "  Copying ghcr-pull secret ${PROD_NS} → ${NS}"
    ${KUBECTL} -n "${PROD_NS}" get secret ghcr-pull -o json \
      | jq --arg ns "${NS}" '.metadata.namespace = $ns | .metadata = {"name": .metadata.name, "namespace": $ns}' \
      | ${KUBECTL} apply -f -
  else
    log "  WARN: no ghcr-pull secret found; registry pulls must be public"
  fi
fi
log "  Preflight OK"

# ─── 1. Apply overlay (namespace, postgres, app, ingress) ─
log "Step 1: Applying staging overlay (${OVERLAY})"
${KUBECTL} apply -k "${OVERLAY}"

log "  Waiting for Postgres..."
${KUBECTL} -n "${NS}" rollout status statefulset/postgres --timeout=180s

# ─── 2. Database migration ────────────────────────────────
log "Step 2: Running migrations (${IMAGE})"
${KUBECTL} -n "${NS}" delete job rentme-migrate --ignore-not-found
cat <<EOF | ${KUBECTL} apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: rentme-migrate
  namespace: ${NS}
  labels:
    app.kubernetes.io/name: rentme
    app.kubernetes.io/component: migrate
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app.kubernetes.io/name: rentme
        app.kubernetes.io/component: migrate
    spec:
      restartPolicy: Never
      imagePullSecrets:
        - name: ghcr-pull
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
      containers:
        - name: migrate
          image: ${IMAGE}
          imagePullPolicy: Always
          command: ["node", "node_modules/prisma/build/index.js", "db", "push", "--skip-generate"]
          envFrom:
            - configMapRef:
                name: rentme-config
            - secretRef:
                name: rentme-secrets
EOF

${KUBECTL} -n "${NS}" wait --for=condition=complete job/rentme-migrate --timeout=180s \
  || { ${KUBECTL} -n "${NS}" logs job/rentme-migrate --tail=50 || true; fail "migration failed"; }
log "  Migrations applied"

# ─── 3. Backend / frontend rollout ────────────────────────
log "Step 3: Rolling out ${IMAGE}"
${KUBECTL} -n "${NS}" set image deployment/rentme-app app="${IMAGE}"
${KUBECTL} -n "${NS}" rollout status deployment/rentme-app --timeout="${MAX_WAIT}s" \
  || fail "rollout failed"

# ─── 4. Health check via port-forward (no DNS required) ───
log "Step 4: Health verification"
${KUBECTL} -n "${NS}" port-forward svc/rentme-app 18081:80 >/tmp/rentme-staging-pf.log 2>&1 &
PF_PID=$!
cleanup() { kill "${PF_PID}" 2>/dev/null || true; }
trap cleanup EXIT
sleep 3

HEALTHY=false
for i in $(seq 1 20); do
  RESP=$(curl -sf "http://127.0.0.1:18081${HEALTH_PATH}" 2>/dev/null || echo '{"status":"unreachable"}')
  STATUS=$(echo "${RESP}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ "${STATUS}" = "healthy" ]; then HEALTHY=true; break; fi
  log "  Health attempt ${i}/20: ${STATUS:-waiting}"
  sleep 3
done
[ "${HEALTHY}" = "true" ] || fail "staging health check failed"
log "  Application healthy"

# ─── 5. Ingress verification (Host header via Traefik) ────
log "Step 5: Ingress verification for ${STAGING_HOST}"
LB_IP=$(${KUBECTL} -n kube-system get svc traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
if [ -n "${LB_IP}" ]; then
  INGRESS_CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${STAGING_HOST}" "http://${LB_IP}${HEALTH_PATH}" || echo 000)
  if [ "${INGRESS_CODE}" = "200" ]; then
    log "  Ingress OK (HTTP 200 via ${LB_IP})"
  else
    log "  WARN: ingress returned HTTP ${INGRESS_CODE} — check Traefik entrypoints/firewall"
  fi
else
  log "  WARN: Traefik LB IP not found; skipping ingress probe"
fi

# ─── 6. API contract probes (security smoke) ──────────────
log "Step 6: API contract probes"
probe() { # path expected_code label
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:18081$1" || echo 000)
  [ "${CODE}" = "$2" ] && log "  ✓ $3 ($CODE)" || fail "$3 expected $2 got ${CODE}"
}
probe /api/upload                401 "upload requires auth"
probe /api/conversations         401 "conversations require auth"
probe /api/admin/users           403 "admin API rejects non-admin"
probe /api/properties            200 "public listings readable"

# ─── 7. Integration surface notes ─────────────────────────
log "Step 7: Integration surfaces"
R2_SET=$(${KUBECTL} -n "${NS}" get secret rentme-secrets -o jsonpath='{.data.CLOUDFLARE_S3_ACCESS_KEY_ID}' | base64 -d | grep -c . || true)
if [ "${R2_SET}" = "1" ]; then
  log "  Video/image storage: R2 configured — upload E2E will exercise it"
else
  log "  Video/image storage: NOT configured on staging (uploads return 503 by design)"
  log "    → to enable: RENTME_NAMESPACE=${NS} CLOUDFLARE_*=<staging bucket creds> ./scripts/k3s-secrets.sh"
fi
log "  WebSocket: not applicable — messaging is HTTP-based (verified via conversations probe)"
log "  Maps: no external SDK — property coords + browser geolocation only (no key needed)"

# ─── 8. E2E tests (opt-in) ────────────────────────────────
if [ "${RUN_E2E:-0}" = "1" ]; then
  log "Step 8: E2E suite against http://127.0.0.1:18081"
  node scripts/e2e-auth-listings.mjs http://127.0.0.1:18081
else
  log "Step 8: skipped (RUN_E2E=1 to enable)"
fi

log "════════════════════════════════════════════════════"
log "Staging deploy complete: ${IMAGE} in namespace ${NS}"
log "Local access:   kubectl -n ${NS} port-forward svc/rentme-app 18081:80"
log "Ingress access: curl -H 'Host: ${STAGING_HOST}' http://${LB_IP:-<node-ip>}/api/health"
log "════════════════════════════════════════════════════"
