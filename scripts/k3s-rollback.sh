#!/bin/sh
# Rollback rentme-app Deployment to the previous ReplicaSet.
set -eu
NS="${RENTME_NAMESPACE:-rentme}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KUBECTL="${KUBECTL:-${SCRIPT_DIR}/kubectl.sh}"

echo "Rolling back deployment/rentme-app in ${NS}..."
${KUBECTL} -n "${NS}" rollout undo deployment/rentme-app
${KUBECTL} -n "${NS}" rollout status deployment/rentme-app --timeout=300s

${KUBECTL} -n "${NS}" port-forward svc/rentme-app 18080:80 >/tmp/rentme-pf-rb.log 2>&1 &
PF_PID=$!
trap 'kill ${PF_PID} 2>/dev/null || true' EXIT
sleep 3
curl -sf http://127.0.0.1:18080/api/health | grep -q '"status":"healthy"'
echo "✓ Rollback healthy"
