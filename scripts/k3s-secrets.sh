#!/bin/sh
# Create / update rentme-secrets in the rentme namespace from environment variables.
# Usage:
#   export POSTGRES_PASSWORD=... NEXTAUTH_SECRET=... (and optional R2 vars)
#   ./scripts/k3s-secrets.sh
set -eu

NS="${RENTME_NAMESPACE:-rentme}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KUBECTL="${KUBECTL:-${SCRIPT_DIR}/kubectl.sh}"

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:?Set NEXTAUTH_SECRET}"
POSTGRES_USER="${POSTGRES_USER:-rentme}"
POSTGRES_DB="${POSTGRES_DB:-rentme}"
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public}"

${KUBECTL} get ns "${NS}" >/dev/null 2>&1 || ${KUBECTL} create namespace "${NS}"

${KUBECTL} -n "${NS}" create secret generic rentme-secrets \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=CLOUDFLARE_R2_ENDPOINT="${CLOUDFLARE_R2_ENDPOINT:-}" \
  --from-literal=CLOUDFLARE_S3_ACCESS_KEY_ID="${CLOUDFLARE_S3_ACCESS_KEY_ID:-}" \
  --from-literal=CLOUDFLARE_S3_SECRET_ACCESS_KEY="${CLOUDFLARE_S3_SECRET_ACCESS_KEY:-}" \
  --from-literal=CLOUDFLARE_R2_BUCKET="${CLOUDFLARE_R2_BUCKET:-}" \
  --from-literal=CLOUDFLARE_R2_PUBLIC_URL="${CLOUDFLARE_R2_PUBLIC_URL:-}" \
  --dry-run=client -o yaml | ${KUBECTL} apply -f -

echo "✓ Secret rentme-secrets applied in namespace ${NS}"
