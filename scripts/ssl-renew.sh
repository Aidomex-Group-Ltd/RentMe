#!/bin/sh
# ─── SSL Certificate Renewal ─────────────────────────────
# Usage: ./scripts/ssl-renew.sh
# Cron example: 0 */12 * * * /opt/rentme/scripts/ssl-renew.sh
set -eu

echo "==> Checking SSL certificate renewal at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

set +e
docker compose run --rm --entrypoint certbot certbot renew --webroot -w /var/www/certbot --quiet
RENEWAL_EXIT=$?
set -e

if [ "${RENEWAL_EXIT}" -eq 0 ]; then
  docker compose exec nginx nginx -s reload
  echo "==> Nginx reloaded after certificate renewal check"
else
  echo "==> Renewal command exited with ${RENEWAL_EXIT}"
  exit "${RENEWAL_EXIT}"
fi

echo "==> SSL renewal check complete"
