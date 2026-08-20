#!/bin/sh
# ─── SSL Certificate Initialization ──────────────────────
# Usage: ./scripts/ssl-init.sh <domain> <email>
# Example: ./scripts/ssl-init.sh rentme.ug admin@rentme.ug
set -eu

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"
STAGING="${SSL_STAGING:-0}"

echo "==> Initializing SSL certificate for ${DOMAIN}"

# Validate DNS resolution
echo "==> Checking DNS resolution..."
if ! nslookup "${DOMAIN}" > /dev/null 2>&1; then
  echo "ERROR: Cannot resolve ${DOMAIN}. Ensure DNS is configured."
  exit 1
fi

# Build certbot args
CERTBOT_ARGS="--webroot -w /var/www/certbot --non-interactive --agree-tos --email ${EMAIL} -d ${DOMAIN}"

if [ "${STAGING}" = "1" ]; then
  echo "==> Using Let's Encrypt STAGING environment (for testing)"
  CERTBOT_ARGS="${CERTBOT_ARGS} --staging"
fi

# Run certbot via docker compose
docker compose exec certbot certbot certonly ${CERTBOT_ARGS}

echo "==> SSL certificate acquired for ${DOMAIN}"
echo "==> Certificate files at /etc/letsencrypt/live/${DOMAIN}/"

# Reload nginx to pick up new certificates
docker compose exec nginx nginx -s reload
echo "==> Nginx reloaded with new certificates"

echo ""
echo "Certificate details:"
docker compose exec certbot certbot certificates 2>/dev/null || true
