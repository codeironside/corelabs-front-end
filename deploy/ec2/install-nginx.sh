#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/corelabs}"
FRONTEND_DOMAIN="${STUDIO_FRONTEND_DOMAIN:-${STUDIO_SERVER_NAME:-studios.corelabs.it.com}}"
CURRENT_FRONTEND="${DEPLOY_ROOT}/current/frontend"
SITE_NAME="corelabs-frontend.conf"
SSL_CERT="/etc/letsencrypt/live/${FRONTEND_DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${FRONTEND_DOMAIN}/privkey.pem"
CERTBOT_WEBROOT="/var/www/certbot"

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is not installed on this host." >&2
  echo "Ubuntu:  sudo apt update && sudo apt install -y nginx" >&2
  echo "Amazon Linux: sudo dnf install -y nginx && sudo systemctl enable nginx" >&2
  exit 1
fi

ssl_cert_present() {
  sudo /usr/bin/test -f "$1"
}

ssl_enabled() {
  ssl_cert_present "${SSL_CERT}" && ssl_cert_present "${SSL_KEY}"
}

spa_locations() {
  cat <<EOF
    location / {
        add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
        try_files \$uri \$uri/ /index.html;
    }
EOF
}

write_http_bootstrap_config() {
  local target_path="$1"
  sudo tee "${target_path}" > /dev/null <<EOF
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN};

    root ${CURRENT_FRONTEND};
    index index.html;

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
    }

$(spa_locations)
}
EOF
}

write_ssl_config() {
  local target_path="$1"
  sudo tee "${target_path}" > /dev/null <<EOF
server {
    listen 80;
    server_name ${FRONTEND_DOMAIN};

    location /.well-known/acme-challenge/ {
        root ${CERTBOT_WEBROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${FRONTEND_DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root ${CURRENT_FRONTEND};
    index index.html;

$(spa_locations)
}
EOF
}

write_site_config() {
  local target_path="$1"
  if ssl_enabled; then
    write_ssl_config "${target_path}"
  else
    write_http_bootstrap_config "${target_path}"
  fi
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

if ssl_enabled; then
  echo "Wrote HTTPS nginx site config for ${FRONTEND_DOMAIN} at ${SITE_PATH}"
else
  echo "Wrote HTTP bootstrap nginx site config for ${FRONTEND_DOMAIN} at ${SITE_PATH}"
fi
