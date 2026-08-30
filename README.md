# Rent Mesh

Next.js 14 rental marketplace for Uganda. **UI is unchanged** by infrastructure work.

## Local development

```bash
npm install
npm run dev
```

Optional Dockerized Postgres:

```bash
docker compose -f docker-compose.dev.yml up
```

## Production orchestrator: k3s

Primary production target is **k3s** (Kubernetes) with Traefik ingress and cert-manager TLS.

| Component | Implementation |
|-----------|----------------|
| App | Deployment (2 replicas, rolling, non-root) |
| DB | PostgreSQL 15 StatefulSet + PVC |
| Ingress | Traefik + security headers + rate limit |
| TLS | cert-manager Let's Encrypt |
| Backups | CronJob `pg_dump` (7-day retention) |
| Uploads | Cloudflare R2 (existing app behavior) |
| Sessions | NextAuth JWT (no Redis) |

```bash
# One-time
export POSTGRES_PASSWORD=... NEXTAUTH_SECRET=...
# optional: CLOUDFLARE_* SMTP_* ADMIN_EMAIL
make k3s-secrets
export GHCR_USER=... GHCR_TOKEN=...   # PAT with read:packages
make k3s-registry
make k3s-cert-manager
make k3s-apply
make k3s-migrate

# Ongoing
make build
docker push ghcr.io/aidomex-group-ltd/rentme:latest   # or CI
make k3s-deploy TAG=latest
make k3s-health
make k3s-rollback   # if needed
```

Domain defaults to `rentme.ug` (override in ConfigMap / Ingress if DNS differs). Current Vercel preview remains `rent-me-seven.vercel.app` and is separate from k3s.

Docker Compose (`make prod`) remains available for single-node / lab use; **production deploy defaults to k3s**.

## Validation

```bash
npm ci
npm test
npm run build
docker build -t rentme:local .
docker compose config
kubectl kustomize k8s/overlays/production
```

## Secrets

Never commit real secrets. Use `.env.example` locally and `k8s/base/secret.example.yaml` / `make k3s-secrets` for the cluster. CI needs `KUBE_CONFIG`, a one-time `ghcr-pull` secret on the cluster (`make k3s-registry`), and optional `PRODUCTION_DOMAIN`.
