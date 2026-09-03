#!/bin/sh
# ─── SSL Certificate Initialization ──────────────────────
# Usage: ./scripts/ssl-init.sh <domain> <email>
# Example: ./scripts/ssl-init.sh erikot.site admin@erikot.site
set -eu

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"
STAGING="${SSL_STAGING:-0}"

echo "==> Initializing SSL certificate for ${DOMAIN}"

echo "==> Checking DNS resolution..."
if ! getent hosts "${DOMAIN}" >/dev/null 2>&1 && ! nslookup "${DOMAIN}" >/dev/null 2>&1; then
  echo "ERROR: Cannot resolve ${DOMAIN}. Ensure DNS is configured."
  exit 1
fi

# Ensure nginx + certbot volumes are up (HTTP bootstrap mode)
docker compose up -d nginx certbot

CERTBOT_ARGS="certonly --webroot -w /var/www/certbot --non-interactive --agree-tos --email ${EMAIL} -d ${DOMAIN} -d www.${DOMAIN}"

if [ "${STAGING}" = "1" ]; then
  echo "==> Using Let's Encrypt STAGING environment"
  CERTBOT_ARGS="${CERTBOT_ARGS} --staging"
fi

echo "==> Requesting certificate..."
# certbot service entrypoint wraps renew loop; run a one-shot container instead
docker compose run --rm --entrypoint certbot certbot ${CERTBOT_ARGS}

echo "==> Enabling HTTPS nginx config..."
if [ -f "nginx/conf.d/ssl.conf.example" ]; then
  sed "s/erikot\.site/${DOMAIN}/g" nginx/conf.d/ssl.conf.example > nginx/conf.d/ssl.conf
fi

# Switch HTTP to redirect once certificates exist
if grep -q "proxy_pass http://app" nginx/conf.d/default.conf; then
  # Replace the final location / proxy with HTTPS redirect (keep ACME + health)
  awk '
    BEGIN { in_final=0 }
    /^    location \/ \{/ { in_final=1; print "    location / {"; print "        return 301 https://$host$request_uri;"; print "    }"; next }
    in_final && /^    \}/ { in_final=0; next }
    in_final { next }
    { print }
  ' nginx/conf.d/default.conf > nginx/conf.d/default.conf.tmp \
    && mv nginx/conf.d/default.conf.tmp nginx/conf.d/default.conf
fi

docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload

echo "==> SSL certificate acquired and HTTPS enabled for ${DOMAIN}"
docker compose run --rm --entrypoint certbot certbot certificates || true
