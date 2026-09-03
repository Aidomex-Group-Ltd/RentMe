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
| `KUBE_CONFIG` | deploy-k3s | **openssl base64** of the kubeconfig (single line). See below. |

### Setting up `KUBE_CONFIG`

CI decodes the secret with `openssl base64 -d -A`. From a machine that can reach the cluster API (or on the k3s server after rewriting the server address):

```bash
# Prefer minified kubeconfig; replace 127.0.0.1 with the public API host first if needed
kubectl config view --raw --minify \
  | sed 's/127.0.0.1/YOUR_SERVER_IP/' \
  | openssl base64 -A
```

Or from the k3s server file:

```bash
sed 's/127.0.0.1/YOUR_SERVER_IP/' /etc/rancher/k3s/k3s.yaml \
  | openssl base64 -A
```

Paste that **single-line** openssl base64 string as the `KUBE_CONFIG` secret in GitHub → Settings → Secrets → Actions.

> Do **not** paste raw YAML into `KUBE_CONFIG` — the workflow always openssl-decodes it.

---

## Required GitHub Variables

Set these in **GitHub → Settings → Secrets and variables → Actions → Variables**.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://erikot.site` | Public site URL baked into the Docker build |
| `PRODUCTION_DOMAIN` | `erikot.site` | Domain used by deploy-k3s for health checks |

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
| (deploy) | `openssl base64 -d -A` | Decodes `KUBE_CONFIG` into `KUBECONFIG` |

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
