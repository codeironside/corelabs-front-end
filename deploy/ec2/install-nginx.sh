#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/corelabs}"
BACKEND_PORT="${BACKEND_PORT:-4005}"
SERVER_NAME="${STUDIO_SERVER_NAME:-_}"
CURRENT_FRONTEND="${DEPLOY_ROOT}/current/frontend"
SITE_NAME="corelabs-studio.conf"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed on this host." >&2
  echo "Ubuntu:  sudo apt update && sudo apt install -y nginx" >&2
  echo "Amazon Linux: sudo dnf install -y nginx && sudo systemctl enable nginx" >&2
  exit 1
fi

write_site_config() {
  local target_path="$1"
  sudo tee "${target_path}" > /dev/null <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${CURRENT_FRONTEND};
    index index.html;

    client_max_body_size 64m;

    location /api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
}

if [[ -d /etc/nginx/conf.d ]] && [[ ! -d /etc/nginx/sites-available ]]; then
  SITE_PATH="/etc/nginx/conf.d/${SITE_NAME}"
  write_site_config "${SITE_PATH}"
  sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
else
  sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  SITE_PATH="/etc/nginx/sites-available/${SITE_NAME}"
  ENABLED_PATH="/etc/nginx/sites-enabled/${SITE_NAME}"
  write_site_config "${SITE_PATH}"
  sudo ln -sfn "${SITE_PATH}" "${ENABLED_PATH}"
  sudo rm -f /etc/nginx/sites-enabled/default
fi

echo "Wrote nginx site config to ${SITE_PATH}"
