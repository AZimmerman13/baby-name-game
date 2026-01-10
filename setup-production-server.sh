#!/bin/bash

# One-time Production Server Setup Script
# Run this ONCE on your Digital Ocean droplet after initial server creation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   StorkPool Server Setup (One-Time)   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Add Swap Space
echo -e "${YELLOW}1. Configuring swap space...${NC}"
if [ -f /swapfile ]; then
    echo "   ✓ Swap already exists"
else
    echo "   Creating 2GB swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Make permanent
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    echo "   ✓ Swap space configured"
fi

# Show swap status
echo "   Current memory:"
free -h | grep -E "Mem|Swap"
echo ""

# Step 2: Install Docker (if not installed)
echo -e "${YELLOW}2. Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    echo "   ✓ Docker already installed: $(docker --version)"
else
    echo "   Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "   ✓ Docker installed"
fi
echo ""

# Step 3: Install Docker Compose (if not installed)
echo -e "${YELLOW}3. Checking Docker Compose installation...${NC}"
if command -v docker-compose &> /dev/null; then
    echo "   ✓ Docker Compose already installed: $(docker-compose --version)"
else
    echo "   Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "   ✓ Docker Compose installed"
fi
echo ""

# Step 4: Clone repository (if not exists)
echo -e "${YELLOW}4. Setting up application...${NC}"
if [ -d "/opt/baby-name-game" ]; then
    echo "   ✓ Application directory already exists"
else
    echo "   Cloning repository..."
    mkdir -p /opt
    cd /opt
    git clone https://github.com/AZimmerman13/baby-name-game.git
    echo "   ✓ Repository cloned"
fi
echo ""

# Step 5: Generate environment file
echo -e "${YELLOW}5. Configuring environment variables...${NC}"
cd /opt/baby-name-game

if [ -f ".env" ]; then
    echo "   ℹ️  .env file already exists"
    read -p "   Do you want to regenerate it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Skipping .env generation"
        echo ""
    else
        REGEN_ENV=true
    fi
else
    REGEN_ENV=true
fi

if [ "$REGEN_ENV" = true ]; then
    # Generate secure random keys
    ADMIN_SECRET=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)

    # Create .env file
    cat > .env << ENVEOF
# Backend Configuration
BACKEND_PORT=8000
DATABASE_URL=sqlite:///./data/baby_name_game.db
ADMIN_SECRET_KEY=$ADMIN_SECRET
JWT_SECRET_KEY=$JWT_SECRET
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

    chmod 600 .env
    echo "   ✓ Environment file created with secure keys"
fi
echo ""

# Step 6: Create data directory
echo -e "${YELLOW}6. Creating data directories...${NC}"
mkdir -p data backups
chmod 700 data backups
echo "   ✓ Data directories created"
echo ""

# Step 7: Configure firewall
echo -e "${YELLOW}7. Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp    # SSH
    ufw allow 80/tcp    # HTTP
    ufw allow 443/tcp   # HTTPS
    echo "   ✓ Firewall configured"
else
    echo "   ⚠️  UFW not installed, skipping firewall setup"
fi
echo ""

# Step 8: Set up SSL
echo -e "${YELLOW}8. Checking SSL certificates...${NC}"
if [ -f "/opt/baby-name-game/certbot/conf/live/storkpool.com/fullchain.pem" ]; then
    echo "   ✓ SSL certificates already exist"
else
    echo "   ℹ️  SSL certificates not found"
    echo "   After DNS is configured and services are running, run:"
    echo "   sudo bash /opt/baby-name-game/setup-ssl-renewal.sh"
    echo ""
    echo "   This will:"
    echo "   - Obtain SSL certificates with automatic renewal"
    echo "   - Configure zero-downtime certificate updates"
fi
echo ""

# Step 9: Configure automatic Docker cleanup
echo -e "${YELLOW}9. Setting up automatic cleanup...${NC}"
cat > /etc/cron.weekly/docker-cleanup << 'CRONEOF'
#!/bin/bash
# Clean up old Docker images and containers weekly
docker system prune -f --volumes
CRONEOF
chmod +x /etc/cron.weekly/docker-cleanup
echo "   ✓ Weekly Docker cleanup scheduled"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ Server Setup Complete! ✨        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 What was configured:${NC}"
echo "   ✓ 2GB swap space for builds"
echo "   ✓ Docker and Docker Compose"
echo "   ✓ Application repository cloned"
echo "   ✓ Environment variables with secure keys"
echo "   ✓ Data directories"
echo "   ✓ Firewall rules"
echo "   ✓ Weekly Docker cleanup"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "   1. Configure SSL certificates (if not done)"
echo "   2. Run first deployment:"
echo "      cd /opt/baby-name-game"
echo "      docker-compose up -d --build"
echo ""
echo -e "${YELLOW}💡 From your local machine, you can now deploy with:${NC}"
echo "   ./deploy-to-production.sh"
echo ""
