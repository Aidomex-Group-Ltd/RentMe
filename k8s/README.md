# Production k3s notes for Erikot Properties
#
# Prerequisites:
#   - k3s installed (Traefik ingress included)
#   - kubectl configured (export KUBECONFIG=/etc/rancher/k3s/k3s.yaml or copy to ~/.kube/config)
#   - cert-manager installed (for Let's Encrypt)
#   - rentme-secrets + ghcr-pull created (never commit real secrets)
#
# First-time setup:
#   1. make k3s-secrets          # POSTGRES_PASSWORD + NEXTAUTH_SECRET (+ optional R2/SMTP)
#   2. make k3s-registry         # GHCR_USER + GHCR_TOKEN (read:packages)
#   3. make k3s-cert-manager     # install cert-manager + ClusterIssuer
#   4. make k3s-apply            # apply manifests
#   5. make k3s-migrate          # prisma db push Job
#   6. make k3s-health           # wait for healthy pods
#
# Optional HTTP→HTTPS redirect (after TLS cert is Issued):
#   kubectl apply -f k8s/base/ingress-redirect.yaml.example
#
# Domain: defaults to erikot.site. Override hosts in base/ingress.yaml and
# ConfigMap NEXT_PUBLIC_SITE_URL / NEXTAUTH_URL / PRODUCTION_DOMAIN before apply.
#
# Redis: not deployed — NextAuth uses JWT sessions.
# Uploads: Cloudflare R2 (set R2 keys in the Secret).
# Email: optional SMTP_* / ADMIN_EMAIL in the Secret (notifications no-op if unset).
