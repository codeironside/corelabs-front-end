# CoreLabs Frontend — EC2 deploy

This repo deploys the static Vite build to EC2 via `.github/workflows/deploy-ec2.yml`.

## Repo layout

```text
corelabs-frontend/
├── .github/workflows/deploy-ec2.yml
├── deploy/ec2/
│   ├── activate-frontend.sh   # symlink release + nginx site + reload
│   ├── install-nginx.sh       # SPA + /api proxy to local backend
│   └── README.md
└── src/
```

Backend API deploy lives in the **corelabs-backend** repo. Both repos can target the same EC2 host and `/opt/corelabs` paths.

---

## One-time EC2 setup

On your EC2 instance (Ubuntu 22.04+ recommended):

```bash
sudo apt update && sudo apt install -y nginx rsync
sudo mkdir -p /opt/corelabs/{releases,current,scripts/frontend}
sudo chown -R "$USER":"$USER" /opt/corelabs
```

Open security group ports: **22** (SSH), **80** (HTTP), **443** (HTTPS if using TLS later).

Allow the deploy SSH user to reload nginx without a password prompt:

```bash
sudo tee /etc/sudoers.d/corelabs-deploy > /dev/null <<'EOF'
ubuntu ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /bin/systemctl
EOF
sudo chmod 440 /etc/sudoers.d/corelabs-deploy
```

Replace `ubuntu` with your `EC2_USER` if different.

Deploy the backend once from **corelabs-backend** before expecting `/api/` proxy routes to work.

---

## GitHub configuration

### Secrets

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | Public IP or DNS of the EC2 instance |
| `EC2_USER` | SSH user (`ubuntu` on Ubuntu AMI) |
| `EC2_SSH_KEY` | Full private key PEM for that user |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

### Variables

| Variable | Example |
|----------|---------|
| `VITE_STUDIO_API_URL` | `https://studio.yourdomain.com/api/v1` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `EC2_DEPLOY_ROOT` | `/opt/corelabs` (optional) |
| `VITE_APP_NAME` | `CoreLabsStudio` (optional) |

Create a **GitHub Environment** named `production` if you want approval gates before deploy.

---

## What the pipeline does

1. **Build** — `npm ci`, `npm run build` with `VITE_*` env baked into the bundle
2. **Deploy** (main / manual only, not PRs):
   - Rsync `dist/` to `/opt/corelabs/releases/frontend-<sha>/frontend/`
   - Rsync `deploy/ec2/` to `/opt/corelabs/scripts/frontend/`
   - Run `activate-frontend.sh` (symlink `current/frontend`, update nginx, reload)

---

## Local smoke test

```bash
npm ci && npm run build
```
