.PHONY: help build dev prod deploy logs health backup monitor \
        ssl-init ssl-renew ssl-enable rollback db-push db-migrate db-seed \
        compose-up compose-down compose-ps clean lint test \
        k3s-apply k3s-deploy k3s-rollback k3s-secrets k3s-migrate \
        k3s-health k3s-logs k3s-status k3s-cert-manager k3s-dry-run k3s-backup

KUBECTL ?= ./scripts/kubectl.sh
RENTME_NAMESPACE ?= rentme

# ─── Default ─────────────────────────────────────────────
help: ## Show this help message
	@echo "RentMe Operations (Docker Compose + k3s)"
	@echo "========================================"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ─── Build & Run ─────────────────────────────────────────
build: ## Build production Docker image
	docker build -t $${RENTME_IMAGE:-rentme:local} .

dev: ## Start development environment (Docker DB + hot reload app)
	docker compose -f docker-compose.dev.yml up

prod: ## Start local production stack via Docker Compose (optional)
	docker compose up -d

clean: ## Stop compose stacks and remove volumes (DESTRUCTIVE)
	docker compose -f docker-compose.dev.yml down -v
	docker compose down -v

# ─── k3s (primary production orchestrator) ───────────────
k3s-dry-run: ## Validate manifests (client-side kustomize build)
	$(KUBECTL) kustomize k8s/overlays/production >/dev/null
	@echo "✓ kustomize OK"

k3s-secrets: ## Create/update rentme-secrets from env vars
	./scripts/k3s-secrets.sh

k3s-cert-manager: ## Install cert-manager + Let's Encrypt ClusterIssuers
	$(KUBECTL) apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.5/cert-manager.yaml
	@echo "Waiting for cert-manager webhook..."
	$(KUBECTL) -n cert-manager wait --for=condition=Available deploy/cert-manager-webhook --timeout=180s
	$(KUBECTL) apply -f k8s/overlays/production/cluster-issuer.yaml

k3s-apply: ## Apply k3s manifests (kustomize production overlay)
	$(KUBECTL) apply -k k8s/overlays/production

k3s-migrate: ## Run prisma db push Job
	$(KUBECTL) -n $(RENTME_NAMESPACE) delete job rentme-migrate --ignore-not-found
	$(KUBECTL) apply -f k8s/base/migrate-job.yaml
	$(KUBECTL) -n $(RENTME_NAMESPACE) wait --for=condition=complete job/rentme-migrate --timeout=180s

k3s-deploy: ## Zero-downtime k3s deploy (backup → migrate → rollout → health)
	./scripts/k3s-deploy.sh $(TAG)

k3s-rollback: ## Roll back rentme-app Deployment
	./scripts/k3s-rollback.sh

k3s-health: ## Check /api/health via port-forward
	@$(KUBECTL) -n $(RENTME_NAMESPACE) port-forward svc/rentme-app 18080:80 >/tmp/rentme-pf.log 2>&1 & \
	PF=$$!; sleep 3; \
	curl -sf http://127.0.0.1:18080/api/health | python3 -m json.tool; \
	STATUS=$$?; kill $$PF 2>/dev/null || true; exit $$STATUS

k3s-logs: ## Tail app logs on k3s
	$(KUBECTL) -n $(RENTME_NAMESPACE) logs -l app.kubernetes.io/component=app -f --tail=100

k3s-status: ## Show k3s rentme resources
	$(KUBECTL) -n $(RENTME_NAMESPACE) get deploy,po,svc,ingress,pvc,job,cronjob

k3s-backup: ## Trigger an immediate backup Job
	$(KUBECTL) -n $(RENTME_NAMESPACE) create job --from=cronjob/postgres-backup rentme-backup-manual-$$(date +%s)

# ─── Deployment (defaults to k3s) ────────────────────────
deploy: ## Deploy production via k3s
	./scripts/k3s-deploy.sh $(TAG)

rollback: ## Rollback k3s deployment
	./scripts/k3s-rollback.sh

# ─── Monitoring & Logs ──────────────────────────────────
logs: ## Show application logs (k3s, fallback compose)
	@$(KUBECTL) -n $(RENTME_NAMESPACE) logs -l app.kubernetes.io/component=app -f --tail=100 2>/dev/null || docker compose logs -f app

health: ## Check application health (k3s port-forward, fallback local)
	@$(KUBECTL) -n $(RENTME_NAMESPACE) get svc rentme-app >/dev/null 2>&1 && $(MAKE) k3s-health || \
		(curl -sf http://127.0.0.1:3000/api/health | python3 -m json.tool 2>/dev/null || curl -sf http://127.0.0.1:3000/api/health)

monitor: ## Run full production monitoring report
	./scripts/monitor.sh

ps: ## Show running containers / pods
	@$(KUBECTL) -n $(RENTME_NAMESPACE) get po 2>/dev/null || docker compose ps

# ─── Database ────────────────────────────────────────────
db-push: ## Push Prisma schema to database
	npx prisma db push

db-migrate: ## Apply migrations (prisma migrate deploy)
	npx prisma migrate deploy

db-migrate-dev: ## Create a new migration in development
	npx prisma migrate dev

db-seed: ## Seed the database
	npx tsx prisma/seed.ts

db-studio: ## Open Prisma Studio
	npx prisma studio

# ─── Backup (compose helper; prefer make k3s-backup in prod) ─
backup: ## Run immediate database backup (compose) or k3s CronJob trigger
	@if $(KUBECTL) -n $(RENTME_NAMESPACE) get cronjob postgres-backup >/dev/null 2>&1; then \
		$(MAKE) k3s-backup; \
	else \
		mkdir -p backups; \
		docker compose exec -T db pg_dump -U $${POSTGRES_USER:-rentme} $${POSTGRES_DB:-rentme} | \
			gzip > backups/rentme_$$(date +%Y%m%d_%H%M%S).sql.gz; \
		echo "Backup saved to backups/"; \
	fi

backup-restore: ## Restore DB from file (compose): make backup-restore FILE=backups/x.sql.gz
	@test -f "$(FILE)" || (echo "ERROR: Backup file not found: $(FILE)" && exit 1)
	@gunzip -c "$(FILE)" | docker compose exec -T db psql -U $${POSTGRES_USER:-rentme} -d $${POSTGRES_DB:-rentme}
	@echo "Restore complete"

# ─── SSL (compose path; k3s uses cert-manager) ───────────
ssl-init: ## Compose Certbot init (usage: make ssl-init DOMAIN=rentme.ug EMAIL=admin@rentme.ug)
	./scripts/ssl-init.sh $(DOMAIN) $(EMAIL)

ssl-enable: ## Enable HTTPS nginx config after certificates exist
	@test -n "$(DOMAIN)" || (echo "Usage: make ssl-enable DOMAIN=rentme.ug" && exit 1)
	sed "s/rentme.ug/$(DOMAIN)/g" nginx/conf.d/ssl.conf.example > nginx/conf.d/ssl.conf
	@echo "Wrote nginx/conf.d/ssl.conf"

ssl-renew: ## Manually renew SSL (compose certbot)
	./scripts/ssl-renew.sh

ssl-check: ## Check SSL certificate expiry
	@DOMAIN=$${PROD_DOMAIN:-rentme.ug}; \
	echo "Checking SSL for $$DOMAIN..."; \
	echo | openssl s_client -servername $$DOMAIN -connect $$DOMAIN:443 2>/dev/null | \
		openssl x509 -noout -dates 2>/dev/null || echo "Could not check SSL"

# ─── Development ─────────────────────────────────────────
install: ## Install dependencies
	npm install

lint: ## Run linter
	npm run lint

test: ## Run test suite
	npm test

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

# ─── Utilities ───────────────────────────────────────────
compose-config: ## Validate docker-compose configuration
	docker compose config

docker-build: ## Build Docker image locally
	docker build -t rentme:local .

docker-run: ## Run Docker image locally (quick test)
	docker run --rm -p 3000:3000 --env-file .env rentme:local

env-check: ## Verify required environment variables are set in the shell
	@echo "Checking environment variables..."
	@missing=0; \
	for var in DATABASE_URL NEXTAUTH_SECRET NEXT_PUBLIC_SITE_URL; do \
		eval "val=\$$$$var"; \
		if [ -z "$$val" ]; then \
			echo "✗ Missing: $$var"; missing=1; \
		else \
			echo "✓ $$var is set"; \
		fi; \
	done; \
	exit $$missing
