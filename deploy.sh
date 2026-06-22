#!/bin/bash
# Danish Life Simulator - Deployment Script
# Run this on your VPS: bash deploy.sh

set -e

echo "🚀 Danish Life Simulator - Deploying..."

# --- Config ---
REPO_URL="https://github.com/DanielPincu/DSL.git"
APP_DIR="/opt/danish-life-simulator"
MONGO_URI=""           # ← FILL IN YOUR MONGODB URI
DEEPSEEK_KEY=""        # ← FILL IN YOUR DEEPSEEK KEY
JWT_SECRET=""          # ← FILL IN A RANDOM SECRET
DOMAIN=""              # ← FILL IN YOUR DOMAIN OR IP

# --- 1. Clone/update repo ---
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# --- 2. Install dependencies ---
npm install

# --- 3. Build ---
npm run build -w packages/shared 2>/dev/null || true
npm run build -w apps/api 2>/dev/null || true
(cd apps/web && npx vite build) 2>/dev/null || true

# --- 4. Create .env ---
cat > apps/api/.env << EOF
MONGO_URI=$MONGO_URI
DB_NAME=danish-life-simulator
JWT_SECRET=$JWT_SECRET
DEEPSEEK_API_KEY=$DEEPSEEK_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PORT=3001
NODE_ENV=production
CLIENT_URL=http://$DOMAIN
EOF

# --- 5. Seed database (first time) ---
# npx tsx apps/api/src/seed.ts

# --- 6. Start with PM2 ---
npm install -g pm2 2>/dev/null || true
pm2 delete dls-api 2>/dev/null || true
pm2 start apps/api/src/index.ts --name dls-api --interpreter npx --interpreter-args tsx
pm2 save

# --- 7. Optional: Copy frontend build to API's public folder ---
# cp -r apps/web/dist apps/api/public/

echo ""
echo "✅ Deployed!"
echo "   API: http://$DOMAIN:3001"
echo ""
echo "📌 Next steps:"
echo "   - Set up Nginx reverse proxy (see below)"
echo "   - Run: pm2 startup"
echo "   - Run: npm run seed (first time only)"
echo ""
echo "📌 Nginx config snippet:"
echo "   server {"
echo "     listen 80;"
echo "     server_name $DOMAIN;"
echo "     location / {"
echo "       proxy_pass http://localhost:3001;"
echo "       proxy_set_header Host \$host;"
echo "       proxy_set_header X-Real-IP \$remote_addr;"
echo "     }"
echo "   }"
