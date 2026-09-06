# CoreLabs Frontend — EC2 deploy

| Role | URL |
|------|-----|
| **Frontend (this repo)** | https://studios.corelabs.it.com/ |
| **API (backend repo)** | https://api.studios.corelabs.it.com/api/v1 |

The frontend is a static SPA. It calls the API using `VITE_STUDIO_API_URL` baked in at build time — **not** via nginx proxy on the frontend host.

---

## Repo layout

```text
corelabs-frontend/
├── .github/workflows/deploy-ec2.yml
├── deploy/ec2/
│   ├── activate-frontend.sh
│   ├── ensure-ssl.sh
│   ├── install-nginx.sh       # SPA only + HTTPS for studios.corelabs.it.com
│   └── README.md
└── src/
```

---

## DNS

| Type | Name | Points to |
|------|------|-----------|
| A | `studios.corelabs.it.com` | Frontend EC2 public IP |

The API subdomain (`api.studios.corelabs.it.com`) is configured in **corelabs-backend**.

---

## GitHub variables (frontend repo)

| Variable | Value |
|----------|--------|
| `VITE_STUDIO_API_URL` | `https://api.studios.corelabs.it.com/api/v1` |
| `STUDIO_FRONTEND_DOMAIN` | `studios.corelabs.it.com` (optional — default) |
| `STUDIO_SSL_EMAIL` | Let's Encrypt contact email |
| `VITE_FIREBASE_PROJECT_ID` | `ajeoba-54fca` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ajeoba-54fca.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `ajeoba-54fca.firebasestorage.app` |

Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, plus Firebase web config from project **ajeoba-54fca** (not `ajeoba-web-storage`): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Copy those from [Firebase project settings](https://console.firebase.google.com/project/ajeoba-54fca/settings/general). After changing them, redeploy the frontend so production stops using the old web-storage API key.

---

## One-time EC2 setup (frontend server)

```bash
sudo apt update && sudo apt install -y nginx rsync certbot   # or dnf on Amazon Linux
sudo mkdir -p /opt/corelabs/{releases,current,scripts/frontend} /var/www/certbot
sudo chown -R "$USER":"$USER" /opt/corelabs
sudo systemctl enable nginx

sudo tee /etc/sudoers.d/corelabs-deploy > /dev/null <<'EOF'
ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl, /usr/bin/certbot, /usr/bin/test
EOF
sudo chmod 440 /etc/sudoers.d/corelabs-deploy
```

Open ports **22**, **80**, **443**.

---

## What the pipeline does

1. Build Vite bundle with `VITE_STUDIO_API_URL=https://api.studios.corelabs.it.com/api/v1`
2. Rsync to EC2, symlink `current/frontend`, configure nginx + Let's Encrypt for **studios.corelabs.it.com** only
