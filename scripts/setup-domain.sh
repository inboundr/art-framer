#!/bin/bash

# Domain Setup Script for cooart.studio
# This script helps configure your custom domain with Azure App Service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="cooart-rg"
APP_NAME="cooart-studio"
DOMAIN="cooart.studio"
WWW_DOMAIN="www.cooart.studio"

echo -e "${BLUE}🌐 Setting up custom domain: $DOMAIN${NC}"

# Check if Azure CLI is installed and logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Please log in to Azure first: az login${NC}"
    exit 1
fi

# Add custom domain
echo -e "${BLUE}📝 Adding custom domain: $DOMAIN${NC}"
az webapp config hostname add \
    --webapp-name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $DOMAIN

# Add www subdomain
echo -e "${BLUE}📝 Adding www subdomain: $WWW_DOMAIN${NC}"
az webapp config hostname add \
    --webapp-name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $WWW_DOMAIN

# Get the verification TXT record
echo -e "${BLUE}🔍 Getting domain verification details${NC}"
az webapp config hostname show \
    --webapp-name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --hostname $DOMAIN

echo -e "${YELLOW}📋 DNS Configuration Required:${NC}"
echo "You need to add the following DNS records to your domain provider:"
echo ""
echo "1. CNAME Record:"
echo "   Name: $DOMAIN"
echo "   Value: $APP_NAME.azurewebsites.net"
echo ""
echo "2. CNAME Record:"
echo "   Name: www"
echo "   Value: $APP_NAME.azurewebsites.net"
echo ""
echo "3. TXT Record (for verification):"
echo "   Name: asuid.$DOMAIN"
echo "   Value: [Get this from Azure portal]"
echo ""

# Configure SSL certificate
echo -e "${BLUE}🔒 Setting up SSL certificate${NC}"
echo -e "${YELLOW}📝 To enable SSL for your custom domain:${NC}"
echo "1. Go to Azure Portal > App Service > $APP_NAME"
echo "2. Go to Custom domains"
echo "3. Click 'Add binding' for your domain"
echo "4. Select 'App Service Managed Certificate'"
echo "5. Enable HTTPS redirect"

# Get current domains
echo -e "${BLUE}📋 Current domains:${NC}"
az webapp config hostname list \
    --webapp-name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

echo -e "${GREEN}✅ Domain configuration complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "1. Update your DNS records at your domain provider"
echo "2. Wait for DNS propagation (up to 48 hours)"
echo "3. Configure SSL certificate in Azure portal"
echo "4. Test your domain: https://$DOMAIN"
