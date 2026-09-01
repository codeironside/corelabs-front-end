#!/usr/bin/env bash
set -euo pipefail

RELEASE_ID="${RELEASE_ID:?RELEASE_ID is required}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/corelabs}"
BACKEND_PORT="${BACKEND_PORT:-4005}"
RELEASE_DIR="${DEPLOY_ROOT}/releases/${RELEASE_ID}"
CURRENT_FRONTEND="${DEPLOY_ROOT}/current/frontend"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -d "${RELEASE_DIR}/frontend" ]]; then
  echo "Release ${RELEASE_ID} is missing frontend bundle." >&2
  exit 1
fi

mkdir -p "${DEPLOY_ROOT}/current"
ln -sfn "${RELEASE_DIR}/frontend" "${CURRENT_FRONTEND}"

export DEPLOY_ROOT BACKEND_PORT
bash "${SCRIPT_DIR}/install-nginx.sh"

sudo nginx -t
sudo systemctl reload nginx

echo "Activated frontend release ${RELEASE_ID} at ${DEPLOY_ROOT}"
