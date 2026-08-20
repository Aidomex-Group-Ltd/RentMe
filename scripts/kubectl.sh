#!/bin/sh
# Prefer real kubectl; fall back to k3s kubectl (common on single-node k3s hosts).
set -eu

if [ -z "${KUBECONFIG:-}" ]; then
  if [ -r "${HOME}/.kube/config" ]; then
    export KUBECONFIG="${HOME}/.kube/config"
  elif [ -r /etc/rancher/k3s/k3s.yaml ]; then
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
  fi
fi

if command -v kubectl >/dev/null 2>&1; then
  exec kubectl "$@"
fi
if [ -x /usr/local/bin/k3s ]; then
  exec /usr/local/bin/k3s kubectl "$@"
fi
if command -v k3s >/dev/null 2>&1; then
  exec k3s kubectl "$@"
fi
echo "ERROR: neither kubectl nor k3s is available" >&2
exit 1
