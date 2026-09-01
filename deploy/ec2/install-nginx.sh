#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/corelabs}"
BACKEND_PORT="${BACKEND_PORT:-4005}"
SERVER_NAME="${STUDIO_SERVER_NAME:-_}"
CURRENT_FRONTEND="${DEPLOY_ROOT}/current/frontend"

SITE_PATH="/etc/nginx/sites-available/corelabs-studio.conf"
ENABLED_PATH="/etc/nginx/sites-enabled/corelabs-studio.conf"

sudo tee "${SITE_PATH}" > /dev/null <<EOF
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

sudo ln -sfn "${SITE_PATH}" "${ENABLED_PATH}"
sudo rm -f /etc/nginx/sites-enabled/default
