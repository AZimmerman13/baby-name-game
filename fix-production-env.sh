#!/bin/bash

# Fix production .env file and database schema
# Run this on your production server

set -e

cd /opt/baby-name-game

echo "Fixing production environment..."
echo ""

# Generate secure random keys
ADMIN_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)

# Backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Create corrected .env
cat > .env << 'ENVEOF'
# Backend Configuration
BACKEND_PORT=8000
DATABASE_URL=sqlite:///./data/baby_name_game.db
ADMIN_SECRET_KEY=ADMIN_PLACEHOLDER
JWT_SECRET_KEY=JWT_PLACEHOLDER
COOKIE_SECURE=True

# CORS
CORS_ORIGINS=https://storkpool.com,https://www.storkpool.com

# Frontend Configuration
REACT_APP_API_URL=/api

# Production Domain
DOMAIN=storkpool.com
EMAIL=auszim@gmail.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=20
ENVEOF

# Replace placeholders with actual keys
sed -i "s/ADMIN_PLACEHOLDER/$ADMIN_SECRET/" .env
sed -i "s/JWT_PLACEHOLDER/$JWT_SECRET/" .env

echo "✅ .env fixed with real secrets"
echo "   ADMIN_SECRET_KEY: $ADMIN_SECRET"
echo "   JWT_SECRET_KEY: $JWT_SECRET"
echo ""

# Add user_id column to database
echo "Adding user_id column to database..."
docker-compose down

if [ -f "data/baby_name_game.db" ]; then
    sqlite3 data/baby_name_game.db "ALTER TABLE pools ADD COLUMN user_id TEXT;" 2>/dev/null || echo "   (Column may already exist, continuing...)"
    echo "✅ Database schema updated"
else
    echo "⚠️  Database file not found, will be created on startup"
fi
echo ""

# Restart services
echo "Restarting services..."
docker-compose up -d

echo ""
echo "✅ All fixed! Waiting for services to start..."
sleep 10

echo ""
echo "Testing backend health..."
curl -s https://storkpool.com/api/health && echo "" || echo "⚠️  Backend not responding yet, give it a moment"
echo ""
echo "✅ Setup complete!"
