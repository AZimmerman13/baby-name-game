#!/bin/bash

# Automated SSL Certificate Setup with Auto-Renewal
# Run this on your production server to switch from manual to automatic SSL renewal

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SSL Certificate Auto-Renewal Setup  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

cd /opt/baby-name-game

# Get domain from .env file (handle leading/trailing whitespace)
DOMAIN=$(grep -E "^\s*DOMAIN=" .env | cut -d '=' -f2 | tr -d ' ')
EMAIL=$(grep -E "^\s*EMAIL=" .env | cut -d '=' -f2 | tr -d ' ')

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}Error: DOMAIN or EMAIL not found in .env file${NC}"
    exit 1
fi

echo -e "${YELLOW}Domain: ${NC}$DOMAIN"
echo -e "${YELLOW}Email: ${NC}$EMAIL"
echo ""

# Step 1: Ensure services are running
echo -e "${YELLOW}1. Starting Docker services...${NC}"
docker-compose up -d nginx
sleep 5
echo "   ✓ Services running"
echo ""

# Step 2: Check if certificate already exists
if [ -f "./certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}2. Existing certificate found${NC}"
    echo ""
    echo -e "${BLUE}Choose an option:${NC}"
    echo "   1) Keep existing certificate (just enable auto-renewal)"
    echo "   2) Delete and recreate certificate"
    echo ""
    read -p "Enter choice (1 or 2): " choice

    if [ "$choice" = "2" ]; then
        echo ""
        echo -e "${YELLOW}   Deleting old certificate...${NC}"
        rm -rf ./certbot/conf/live/$DOMAIN
        rm -rf ./certbot/conf/archive/$DOMAIN
        rm -rf ./certbot/conf/renewal/$DOMAIN.conf
        echo "   ✓ Old certificate deleted"
        NEED_NEW_CERT=true
    else
        NEED_NEW_CERT=false
    fi
else
    echo -e "${YELLOW}2. No existing certificate found${NC}"
    NEED_NEW_CERT=true
fi
echo ""

# Step 3: Get new certificate if needed
if [ "$NEED_NEW_CERT" = true ]; then
    echo -e "${YELLOW}3. Obtaining SSL certificate with webroot method...${NC}"
    echo "   This allows automatic renewal without downtime"
    echo ""

    # Create certbot directories
    mkdir -p ./certbot/conf
    mkdir -p ./certbot/www

    # Get certificate using webroot method
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}   ✓ Certificate obtained successfully!${NC}"
    else
        echo ""
        echo -e "${RED}   ✗ Failed to obtain certificate${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo "   1. Make sure your domain DNS points to this server"
        echo "   2. Check that port 80 is open: sudo ufw status"
        echo "   3. Verify nginx is running: docker-compose ps"
        exit 1
    fi
else
    echo -e "${YELLOW}3. Skipping certificate creation (using existing)${NC}"
fi
echo ""

# Step 4: Test automatic renewal
echo -e "${YELLOW}4. Testing automatic renewal...${NC}"
docker-compose run --rm certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}   ✓ Automatic renewal test passed!${NC}"
else
    echo ""
    echo -e "${RED}   ✗ Renewal test failed${NC}"
    exit 1
fi
echo ""

# Step 5: Ensure certbot container is running
echo -e "${YELLOW}5. Starting certbot auto-renewal service...${NC}"
docker-compose up -d certbot
echo "   ✓ Certbot container running (checks every 12 hours)"
echo ""

# Step 6: Reload nginx to use new certificate
echo -e "${YELLOW}6. Reloading nginx...${NC}"
docker-compose exec nginx nginx -s reload
echo "   ✓ Nginx reloaded"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✨ SSL Auto-Renewal Configured! ✨  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 What's configured:${NC}"
echo "   ✓ SSL certificate obtained with webroot method"
echo "   ✓ Certbot checks for renewal every 12 hours"
echo "   ✓ Automatic renewal requires NO manual intervention"
echo "   ✓ Zero downtime during renewal"
echo ""
echo -e "${BLUE}📅 Certificate details:${NC}"
docker-compose run --rm certbot certificates
echo ""
echo -e "${YELLOW}💡 The certbot container will automatically renew certificates${NC}"
echo -e "${YELLOW}   when they're within 30 days of expiration.${NC}"
echo ""
echo -e "${YELLOW}🔍 To manually check certificate status:${NC}"
echo "   docker-compose run --rm certbot certificates"
echo ""
echo -e "${YELLOW}🔄 To manually force renewal (testing only):${NC}"
echo "   docker-compose run --rm certbot renew --force-renewal"
echo ""
