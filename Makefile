.PHONY: help build dev prod deploy logs health backup monitor \
        ssl-init ssl-renew rollback db-push db-migrate db-seed \
        compose-up compose-down compose-ps clean lint test

# ─── Default ─────────────────────────────────────────────
help: ## Show this help message
	@echo "RentMe Operations"
	@echo "================="
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ─── Build & Run ─────────────────────────────────────────
build: ## Build production Docker image
	docker compose build app

dev: ## Start development environment (Docker)
	docker compose -f docker-compose.dev.yml up

prod: ## Start production environment (Docker)
	docker compose up -d

clean: ## Stop all containers and remove volumes
	docker compose -f docker-compose.dev.yml down -v
	docker compose down -v

# ─── Deployment ──────────────────────────────────────────
deploy: ## Deploy to production server
	./scripts/deploy.sh

rollback: ## Rollback to previous Docker image
	@echo "Rolling back to previous version..."
	docker compose down app
	docker compose up -d --no-deps app
	@sleep 5
	@curl -sf http://localhost:3000/api/health && echo " ✓ Rollback healthy" || echo " ✗ Rollback failed"

# ─── Monitoring & Logs ──────────────────────────────────
logs: ## Show application logs (tail)
	docker compose logs -f app

logs-all: ## Show all service logs
	docker compose logs -f

health: ## Check application health
	@curl -sf http://localhost:3000/api/health | python3 -m json.tool 2>/dev/null || \
		curl -sf http://localhost:3000/api/health

monitor: ## Run full production monitoring report
	./scripts/monitor.sh

ps: ## Show running containers
	docker compose ps

# ─── Database ────────────────────────────────────────────
db-push: ## Push database schema to database
	npx prisma db push

db-migrate: ## Create and run a new migration
	npx prisma migrate dev

db-seed: ## Seed the database
	npx tsx prisma/seed.ts

db-studio: ## Open Prisma Studio
	npx prisma studio

# ─── Backup ──────────────────────────────────────────────
backup: ## Run immediate database backup
	@echo "Running database backup..."
	@docker compose exec -T db pg_dump -U $${POSTGRES_USER:-rentme} $${POSTGRES_DB:-rentme} | \
		gzip > backups/rentme_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Backup saved to backups/"

backup-restore: ## Restore database from backup (usage: make backup-restore FILE=backups/rentme_YYYYMMDD.sql.gz)
	@test -f "$(FILE)" || (echo "ERROR: Backup file not found: $(FILE)" && exit 1)
	@echo "Restoring from $(FILE)..."
	@gunzip -c "$(FILE)" | docker compose exec -T db psql -U $${POSTGRES_USER:-rentme} -d $${POSTGRES_DB:-rentme}
	@echo "Restore complete"

# ─── SSL ─────────────────────────────────────────────────
ssl-init: ## Initialize SSL certificate (usage: make ssl-init DOMAIN=rentme.ug EMAIL=admin@rentme.ug)
	./scripts/ssl-init.sh $(DOMAIN) $(EMAIL)

ssl-renew: ## Manually renew SSL certificate
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

test: ## Run E2E tests
	npm run test:e2e

typecheck: ## Run TypeScript type checking
	npx tsc --noEmit

# ─── Utilities ───────────────────────────────────────────
compose-config: ## Validate docker-compose configuration
	docker compose config

docker-build: ## Build Docker image locally
	docker build -t rentme:local .

docker-run: ## Run Docker image locally (quick test)
	docker run --rm -p 3000:3000 --env-file .env rentme:local

env-check: ## Verify required environment variables
	@echo "Checking environment variables..."
	@for var in DATABASE_URL NEXTAUTH_SECRET NEXT_PUBLIC_SITE_URL; do \
		if [ -z "$${var}" ]; then \
			echo "✗ Missing: $$var"; \
		else \
			echo "✓ $$var is set"; \
		fi; \
	done
