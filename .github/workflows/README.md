# CI/CD Workflows

## `ci.yml` — Test, Build, Docker Push, K3s Deploy

Runs on every push/PR to `main`. Three jobs:

| Job | Trigger | What it does |
|-----|---------|--------------|
| **test** | All pushes & PRs | Install → Prisma generate → DB push → Lint → Typecheck → Build → Smoke tests |
| **docker** | `main` push only | Build & push Docker image to GHCR (`ghcr.io/aidomex-group-ltd/rentme`) |
| **deploy-k3s** | `main` push only | Deploy to production k3s cluster (backup → migrate → rollout → health) |

---

## Required GitHub Secrets

Set these in **GitHub → Settings → Secrets and variables → Actions → Secrets**.

| Secret | Required by | Description |
|--------|-------------|-------------|
| `GITHUB_TOKEN` | docker | Auto-provided by GitHub Actions. Used for GHCR push (needs `packages: write`). |
| `KUBE_CONFIG` | deploy-k3s | Kubeconfig for k3s cluster. See setup instructions below. |

### Setting up `KUBE_CONFIG`

From the k3s server:

```bash
# Option 1: raw kubeconfig (recommended — works with azure/k8s-set-context@v5)
cat /etc/rancher/k3s/k3s.yaml

# Option 2: minified + base64
kubectl config view --raw --minify | base64
```

Paste the full output as the `KUBE_CONFIG` secret value in GitHub.

> **Note:** The default `k3s.yaml` uses `127.0.0.1` as the server address.
> For GitHub Actions running externally, replace `127.0.0.1` with your
> cluster's public IP or domain:
>
> ```bash
> sed -i 's/127.0.0.1/YOUR_SERVER_IP/' /etc/rancher/k3s/k3s.yaml
> ```

---

## Required GitHub Variables

Set these in **GitHub → Settings → Secrets and variables → Actions → Variables**.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://rentme.ug` | Public site URL baked into the Docker build |
| `PRODUCTION_DOMAIN` | `rentme.ug` | Domain used by deploy-k3s for health checks |

---

## Required GitHub Environment

The `deploy-k3s` job requires a **GitHub Environment** named `production`.

Create it at **GitHub → Settings → Environments → New environment → `production`**.

Optional protections:
- **Required reviewers**: Add team members who must approve deploys
- **Wait timer**: Add a delay before deployment proceeds
- **Deployment branches**: Restrict to `main` only

---

## Required Kubernetes Secrets

These must exist in the `rentme` namespace on the k3s cluster before deployment.

| Secret | Purpose | Create with |
|--------|---------|-------------|
| `rentme-secrets` | App secrets (DB password, NextAuth, SMTP, R2) | `make k3s-secrets` |
| `ghcr-pull` | GHCR image pull credentials | `make k3s-registry` |

First-time setup:
```bash
export POSTGRES_PASSWORD=... NEXTAUTH_SECRET=...
make k3s-secrets

export GHCR_USER=... GHCR_TOKEN=...
make k3s-registry
```

---

## Action Versions

All actions are pinned to latest major versions with native Node 24 support:

| Action | Version | Notes |
|--------|---------|-------|
| `actions/checkout` | `v4` | Stable; v7 available but has breaking changes for `pull_request_target` |
| `actions/setup-node` | `v7` | Node 24 native runtime |
| `docker/setup-buildx-action` | `v4` | BuildKit builder setup |
| `docker/login-action` | `v4` | GHCR authentication |
| `docker/metadata-action` | `v6` | Image tag/label extraction |
| `docker/build-push-action` | `v7` | Multi-stage Docker build + push |
| `azure/k8s-set-context` | `v5` | Kubeconfig context (Node 24, perm 600) |

---

## Local Validation

```bash
# Lint workflow YAML
actionlint .github/workflows/ci.yml

# Validate kustomize manifests
kubectl kustomize k8s/overlays/production > /dev/null

# Dry-run the deploy script (requires kubectl access)
KUBECTL="kubectl" DRY_RUN=1 ./scripts/k3s-deploy.sh latest
```

## Triggering a Deploy

Push to `main`:

```bash
git push origin main
```

Or manually trigger via the Actions tab → CI/CD Pipeline → Run workflow.
