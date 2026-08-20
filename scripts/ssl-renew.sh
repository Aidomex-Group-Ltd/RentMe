#!/bin/sh
# ─── SSL Certificate Renewal ─────────────────────────────
# Usage: ./scripts/ssl-renew.sh
# Can be run via cron: 0 */12 * * * /path/to/scripts/ssl-renew.sh
set -eu

echo "==> Checking SSL certificate renewal at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Attempt renewal
docker compose exec certbot certbot renew --webroot -w /var/www/certbot --quiet

# Check if certificates were actually renewed
RENEWAL_EXIT=$?

if [ ${RELOAD_EXIT:-0} -eq 0 ]; then
  # Reload nginx to apply renewed certificates
  docker compose exec nginx nginx -s reload
  echo "==> Nginx reloaded after certificate renewal"
fi

echo "==> SSL renewal check complete"
