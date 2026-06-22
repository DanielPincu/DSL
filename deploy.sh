#!/bin/bash
# Danish Life Simulator - Full Deployment Script
# Run on your VPS: bash deploy.sh

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
step() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════╗"
echo "║     Danish Life Simulator - Deploy        ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Config ───
APP_DIR="/opt/danish-life-simulator"
REPO_URL="https://github.com/DanielPincu/DSL.git"

# ─── 1. Install Node.js 20+ ───
step "Installing Node.js"
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "Node.js $(node -v) installed"
else
  log "Node.js $(node -v) already installed"
fi

# ─── 2. Install git if missing ───
command -v git &>/dev/null || apt-get install -y git

# ─── 3. Clone / pull repo ───
step "Cloning repository"
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
  log "Repository updated"
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  log "Repository cloned"
fi

# ─── 4. Ask for credentials ───
step "Configuration"
echo "Leave blank to skip (required for first deploy)"

read -p "MongoDB URI (mongodb+srv://...): " MONGO_URI
read -p "DeepSeek API Key (sk-...): " DEEPSEEK_KEY
read -p "JWT Secret (random string): " JWT_SECRET
read -p "Server domain or IP: " DOMAIN

if [ -n "$MONGO_URI" ]; then
  cat > apps/api/.env << EOF
MONGO_URI=$MONGO_URI
DB_NAME=danish-life-simulator
JWT_SECRET=${JWT_SECRET:-dev-secret-$(date +%s)}
DEEPSEEK_API_KEY=${DEEPSEEK_KEY:-sk-placeholder}
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3001
NODE_ENV=production
CLIENT_URL=http://${DOMAIN:-localhost:3001}
EOF
  log ".env file created"
fi

# ─── 5. Install dependencies ───
step "Installing dependencies"
cd "$APP_DIR"
npm install
log "Dependencies installed"

# ─── 6. Build ───
step "Building"
cd "$APP_DIR"
npx tsc -p packages/shared/tsconfig.json 2>/dev/null || true
cd apps/api && npx tsc 2>/dev/null || true && cd ..
cd apps/web && npx vite build 2>/dev/null || true && cd ..
log "Build complete"

# ─── 7. Seed database ───
step "Database"
if [ -n "$MONGO_URI" ]; then
  read -p "Seed database with missions? (y/n): " SEED
  if [ "$SEED" = "y" ]; then
    cd "$APP_DIR/apps/api" && npx tsx src/seed.ts
    log "Database seeded"
  fi
fi

# ─── 8. Install PM2 and start ───
step "Starting application"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  log "PM2 installed"
fi

cd "$APP_DIR"
pm2 delete dls-api 2>/dev/null || true
pm2 start apps/api/src/index.ts --name dls-api --interpreter npx --interpreter-args tsx
pm2 save
pm2 startup 2>/dev/null | tail -1
log "Application started with PM2"

# ─── 9. Nginx setup ───
step "Optional: Nginx reverse proxy"
if command -v nginx &>/dev/null; then
  read -p "Set up Nginx reverse proxy? (y/n): " NGINX
  if [ "$NGINX" = "y" ]; then
    read -p "Domain name (e.g. example.com): " NGINX_DOMAIN
    cat > /etc/nginx/sites-available/danish-life << EOF
server {
    listen 80;
    server_name ${NGINX_DOMAIN:-$DOMAIN};
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/danish-life /etc/nginx/sites-enabled/
    nginx -t && systemctl restart nginx
    log "Nginx configured"
  fi
fi

# ─── Done ───
step "Deployment complete"
echo -e "${GREEN}"
echo "  ✅ Danish Life Simulator is running!"
echo "  🌐 http://${DOMAIN:-localhost:3001}"
echo "  📋 PM2 status: pm2 status"
echo "  📋 Logs: pm2 logs dls-api"
echo -e "${NC}"
