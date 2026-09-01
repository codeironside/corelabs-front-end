#!/usr/bin/env bash
set -euo pipefail

RELEASE_ID="${RELEASE_ID:?RELEASE_ID is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/corelabs}"
STUDIO_FRONTEND_DOMAIN="${STUDIO_FRONTEND_DOMAIN:-${STUDIO_SERVER_NAME:-studios.corelabs.it.com}}"
STUDIO_SSL_EMAIL="${STUDIO_SSL_EMAIL:-}"
RELEASE_DIR="${DEPLOY_ROOT}/releases/${RELEASE_ID}"
CURRENT_FRONTEND="${DEPLOY_ROOT}/current/frontend"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -d "${RELEASE_DIR}/frontend" ]]; then
  echo "Release ${RELEASE_ID} is missing frontend bundle." >&2
  exit 1
fi

mkdir -p "${DEPLOY_ROOT}/current"
ln -sfn "${RELEASE_DIR}/frontend" "${CURRENT_FRONTEND}"

export DEPLOY_ROOT STUDIO_FRONTEND_DOMAIN STUDIO_SERVER_NAME="${STUDIO_FRONTEND_DOMAIN}" STUDIO_SSL_EMAIL

bash "${SCRIPT_DIR}/install-nginx.sh"
sudo nginx -t
sudo systemctl enable nginx 2>/dev/null || true
sudo systemctl restart nginx

bash "${SCRIPT_DIR}/ensure-ssl.sh"

if sudo /usr/bin/test -f "/etc/letsencrypt/live/${STUDIO_FRONTEND_DOMAIN}/fullchain.pem"; then
  bash "${SCRIPT_DIR}/install-nginx.sh"
  sudo nginx -t
  sudo systemctl restart nginx
fi

echo "Activated frontend release ${RELEASE_ID} at ${DEPLOY_ROOT} (https://${STUDIO_FRONTEND_DOMAIN}/)"
