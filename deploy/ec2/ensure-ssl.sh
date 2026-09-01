#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DOMAIN="${STUDIO_FRONTEND_DOMAIN:-${STUDIO_SERVER_NAME:-studios.corelabs.it.com}}"
SSL_EMAIL="${STUDIO_SSL_EMAIL:-}"
CERTBOT_WEBROOT="/var/www/certbot"
SSL_CERT="/etc/letsencrypt/live/${FRONTEND_DOMAIN}/fullchain.pem"

if [[ -f "${SSL_CERT}" ]]; then
  if command -v certbot >/dev/null 2>&1; then
    sudo certbot renew --quiet --no-random-sleep-on-renew 2>/dev/null || true
  fi
  echo "SSL certificate already present for ${FRONTEND_DOMAIN}"
  exit 0
fi

if [[ -z "${SSL_EMAIL}" ]]; then
  echo "STUDIO_SSL_EMAIL is not set — skipping initial certificate issuance." >&2
  echo "Set GitHub variable STUDIO_SSL_EMAIL (Let's Encrypt contact) and redeploy." >&2
  exit 0
fi

install_certbot() {
  if command -v certbot >/dev/null 2>&1; then
    return 0
  fi
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y certbot
    return 0
  fi
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y certbot
    return 0
  fi
  echo "Could not install certbot — unsupported package manager." >&2
  exit 1
}

install_certbot
sudo mkdir -p "${CERTBOT_WEBROOT}"

sudo certbot certonly \
  --webroot \
  -w "${CERTBOT_WEBROOT}" \
  -d "${FRONTEND_DOMAIN}" \
  --email "${SSL_EMAIL}" \
  --agree-tos \
  --non-interactive \
  --no-eff-email \
  --keep-until-expiring

if [[ ! -f "${SSL_CERT}" ]]; then
  echo "Certbot finished but certificate was not created for ${FRONTEND_DOMAIN}." >&2
  echo "Verify DNS A/AAAA for ${FRONTEND_DOMAIN} points to this EC2 instance and port 80 is open." >&2
  exit 1
fi

echo "Issued SSL certificate for ${FRONTEND_DOMAIN}"
