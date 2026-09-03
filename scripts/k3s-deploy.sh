#!/bin/sh
# ─── k3s production deploy ────────────────────────────────
# Sequence: backup → migrate → rolling update → health → rollback on failure
# Usage: ./scripts/k3s-deploy.sh [image-tag]
set -eu

NS="${RENTME_NAMESPACE:-rentme}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KUBECTL="${KUBECTL:-${SCRIPT_DIR}/kubectl.sh}"
OVERLAY="${RENTME_OVERLAY:-k8s/overlays/production}"
IMAGE_REPO="${RENTME_IMAGE_REPO:-ghcr.io/aidomex-group-ltd/rentme}"
TAG="${1:-${RENTME_IMAGE_TAG:-latest}}"
IMAGE="${IMAGE_REPO}:${TAG}"
DOMAIN="${PROD_DOMAIN:-erikot.site}"
HEALTH_PATH="/api/health"
MAX_WAIT=300

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1"; }
error() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ERROR: $1" >&2; }

PREVIOUS_IMAGE=$(${KUBECTL} -n "${NS}" get deploy rentme-app -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")

log "Deploying ${IMAGE} to namespace ${NS}"

# ─── 1. Pre-deploy backup ────────────────────────────────
log "Step 1: Database backup Job..."
${KUBECTL} -n "${NS}" delete job rentme-backup-manual --ignore-not-found
cat <<EOF | ${KUBECTL} apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: rentme-backup-manual
  namespace: ${NS}
  labels:
    app.kubernetes.io/name: rentme
    app.kubernetes.io/component: backup
    app.kubernetes.io/part-of: rentme
spec:
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app.kubernetes.io/name: rentme
        app.kubernetes.io/component: backup
        app.kubernetes.io/part-of: rentme
    spec:
      restartPolicy: Never
      containers:
        - name: backup
          image: postgres:15-alpine
          env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: rentme-secrets
                  key: POSTGRES_PASSWORD
            - name: POSTGRES_USER
              valueFrom:
                configMapKeyRef:
                  name: rentme-config
                  key: POSTGRES_USER
            - name: POSTGRES_DB
              valueFrom:
                configMapKeyRef:
                  name: rentme-config
                  key: POSTGRES_DB
          command:
            - /bin/sh
            - -c
            - |
              set -eu
              FILE="/backups/\${POSTGRES_DB}_pre_deploy_\$(date +%Y%m%d_%H%M%S).sql.gz"
              until pg_isready -h postgres -U "\${POSTGRES_USER}" -d "\${POSTGRES_DB}"; do sleep 2; done
              pg_dump -h postgres -U "\${POSTGRES_USER}" -d "\${POSTGRES_DB}" | gzip > "\${FILE}"
              ls -lh "\${FILE}"
          volumeMounts:
            - name: backups
              mountPath: /backups
      volumes:
        - name: backups
          persistentVolumeClaim:
            claimName: postgres-backups
EOF

${KUBECTL} -n "${NS}" wait --for=condition=complete job/rentme-backup-manual --timeout=180s \
  || { error "Backup failed"; exit 1; }
log "  Backup complete"

# ─── 2. Apply overlay + run migrate with target image ────
log "Step 2: Running migrations..."
${KUBECTL} -n "${NS}" delete job rentme-migrate --ignore-not-found
${KUBECTL} apply -k "${OVERLAY}"
cat <<EOF | ${KUBECTL} apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: rentme-migrate
  namespace: ${NS}
  labels:
    app.kubernetes.io/name: rentme
    app.kubernetes.io/component: migrate
    app.kubernetes.io/part-of: rentme
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 600
  template:
    metadata:
      labels:
        app.kubernetes.io/name: rentme
        app.kubernetes.io/component: migrate
        app.kubernetes.io/part-of: rentme
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
  || { error "Migration failed — not updating app"; exit 1; }
log "  Migrations applied"

# ─── 3. Rolling update app (start-first: maxUnavailable=0) ─
log "Step 3: Rolling update to ${IMAGE}..."
${KUBECTL} -n "${NS}" set image deployment/rentme-app app="${IMAGE}"
${KUBECTL} -n "${NS}" rollout status deployment/rentme-app --timeout="${MAX_WAIT}s" \
  || {
    error "Rollout failed — rolling back"
    if [ -n "${PREVIOUS_IMAGE}" ]; then
      ${KUBECTL} -n "${NS}" set image deployment/rentme-app app="${PREVIOUS_IMAGE}"
      ${KUBECTL} -n "${NS}" rollout status deployment/rentme-app --timeout="${MAX_WAIT}s" || true
    else
      ${KUBECTL} -n "${NS}" rollout undo deployment/rentme-app || true
    fi
    exit 1
  }

# ─── 4. Health check via port-forward ────────────────────
log "Step 4: Health verification..."
${KUBECTL} -n "${NS}" port-forward svc/rentme-app 18080:80 >/tmp/rentme-pf.log 2>&1 &
PF_PID=$!
cleanup() { kill "${PF_PID}" 2>/dev/null || true; }
trap cleanup EXIT
sleep 3

HEALTHY=false
for i in $(seq 1 20); do
  RESP=$(curl -sf "http://127.0.0.1:18080${HEALTH_PATH}" 2>/dev/null || echo '{"status":"unreachable"}')
  STATUS=$(echo "${RESP}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || true)
  if [ "${STATUS}" = "healthy" ]; then
    HEALTHY=true
    break
  fi
  log "  Health attempt ${i}/20: ${STATUS:-waiting}"
  sleep 3
done

if [ "${HEALTHY}" != "true" ]; then
  error "Health check failed — rolling back"
  if [ -n "${PREVIOUS_IMAGE}" ]; then
    ${KUBECTL} -n "${NS}" set image deployment/rentme-app app="${PREVIOUS_IMAGE}"
  else
    ${KUBECTL} -n "${NS}" rollout undo deployment/rentme-app
  fi
  ${KUBECTL} -n "${NS}" rollout status deployment/rentme-app --timeout="${MAX_WAIT}s" || true
  exit 1
fi
log "  Application healthy"

# ─── 5. Public smoke (best-effort) ───────────────────────
log "Step 5: Public smoke check https://${DOMAIN}${HEALTH_PATH}"
PUBLIC=$(curl -sf "https://${DOMAIN}${HEALTH_PATH}" 2>/dev/null || echo "")
if echo "${PUBLIC}" | grep -q '"status":"healthy"'; then
  log "  Public health OK"
else
  log "  WARN: public health not verified (DNS/TLS may still be provisioning)"
fi

log "════════════════════════════════════════════════════"
log "k3s deploy complete: ${IMAGE}"
log "════════════════════════════════════════════════════"
