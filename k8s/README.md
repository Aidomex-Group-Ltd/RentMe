# Production k3s notes for RentMe
#
# Prerequisites:
#   - k3s installed (Traefik ingress included)
#   - kubectl configured (export KUBECONFIG=/etc/rancher/k3s/k3s.yaml or copy to ~/.kube/config)
#   - cert-manager installed (for Let's Encrypt)
#   - Secrets created from secret.example.yaml (never commit real secrets)
#
# First-time setup:
#   1. make k3s-secrets          # prompts / uses env to create Secret
#   2. make k3s-cert-manager     # install cert-manager + ClusterIssuer
#   3. make k3s-apply            # apply manifests
#   4. make k3s-migrate          # prisma db push Job
#   5. make k3s-health           # wait for healthy pods
#
# Domain: defaults to rentme.ug. Override hosts in base/ingress.yaml and
# ConfigMap NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL before apply if needed.
#
# Redis: not deployed — NextAuth uses JWT sessions.
# Uploads: Cloudflare R2 (set R2 keys in the Secret).
