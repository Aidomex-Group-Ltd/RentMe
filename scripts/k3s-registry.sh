#!/bin/sh
# Create / update ghcr-pull imagePullSecret for private GHCR packages.
# Usage:
#   export GHCR_USER=your-github-username
#   export GHCR_TOKEN=ghp_...   # classic PAT with read:packages (or fine-grained Packages read)
#   ./scripts/k3s-registry.sh
#
# Alternative (node-wide): configure /etc/rancher/k3s/registries.yaml on each node.
set -eu

NS="${RENTME_NAMESPACE:-rentme}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
KUBECTL="${KUBECTL:-${SCRIPT_DIR}/kubectl.sh}"

GHCR_USER="${GHCR_USER:?Set GHCR_USER (GitHub username or org bot)}"
GHCR_TOKEN="${GHCR_TOKEN:?Set GHCR_TOKEN (PAT with read:packages)}"
GHCR_EMAIL="${GHCR_EMAIL:-${GHCR_USER}@users.noreply.github.com}"

${KUBECTL} get ns "${NS}" >/dev/null 2>&1 || ${KUBECTL} create namespace "${NS}"

${KUBECTL} -n "${NS}" create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username="${GHCR_USER}" \
  --docker-password="${GHCR_TOKEN}" \
  --docker-email="${GHCR_EMAIL}" \
  --dry-run=client -o yaml | ${KUBECTL} apply -f -

echo "✓ Secret ghcr-pull applied in namespace ${NS}"
