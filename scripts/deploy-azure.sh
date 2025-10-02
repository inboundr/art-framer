#!/bin/bash

# Azure Deployment Script for cooart.studio
# This script sets up Azure resources and deploys the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="cooart-rg"
LOCATION="East US"
APP_SERVICE_PLAN="cooart-plan"
APP_NAME="cooart-studio"
DOMAIN="cooart.studio"

echo -e "${BLUE}🚀 Starting Azure deployment for cooart.studio${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first:${NC}"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}🔐 Please log in to Azure:${NC}"
    az login
fi

echo -e "${GREEN}✅ Azure CLI is ready${NC}"

# Create resource group
echo -e "${BLUE}📦 Creating resource group: $RESOURCE_GROUP${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location "$LOCATION" \
    --output table

# Create App Service Plan (B1 - Basic tier for cost efficiency)
echo -e "${BLUE}📋 Creating App Service Plan: $APP_SERVICE_PLAN${NC}"
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location "$LOCATION" \
    --sku B1 \
    --is-linux \
    --output table

# Create Web App
echo -e "${BLUE}🌐 Creating Web App: $APP_NAME${NC}"
az webapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "NODE|18-lts" \
    --output table

# Configure app settings
echo -e "${BLUE}⚙️  Configuring app settings${NC}"
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        NEXT_PUBLIC_SUPABASE_URL="https://irugsjzjqdxulliobuwt.supabase.co" \
        NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here" \
        SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here" \
        STRIPE_SECRET_KEY="your-stripe-secret-key-here" \
        STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key-here" \
        STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret-here" \
        PRODIGI_API_KEY="11fc6ec8-855e-4b32-a36a-3a80db5d5ea6" \
        PRODIGI_ENVIRONMENT="sandbox" \
        NEXT_PUBLIC_SHOW_NOTIFICATION_BAR="false" \
    --output table

# Configure deployment source
echo -e "${BLUE}🔗 Configuring deployment source${NC}"
az webapp deployment source config \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --repo-url "https://github.com/your-username/art-framer.git" \
    --branch main \
    --manual-integration \
    --output table

# Enable HTTPS only
echo -e "${BLUE}🔒 Enabling HTTPS only${NC}"
az webapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --https-only true \
    --output table

# Get the default domain
echo -e "${BLUE}🌍 Getting default domain${NC}"
DEFAULT_DOMAIN=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo -e "${GREEN}✅ Default domain: https://$DEFAULT_DOMAIN${NC}"

# Create custom domain (if you have the domain)
echo -e "${YELLOW}📝 To add your custom domain ($DOMAIN), run:${NC}"
echo "az webapp config hostname add --webapp-name $APP_NAME --resource-group $RESOURCE_GROUP --hostname $DOMAIN"
echo "az webapp config hostname add --webapp-name $APP_NAME --resource-group $RESOURCE_GROUP --hostname www.$DOMAIN"

# Get publish profile
echo -e "${BLUE}📄 Getting publish profile${NC}"
az webapp deployment list-publishing-profiles \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --xml > azure-publish-profile.xml

echo -e "${GREEN}✅ Azure resources created successfully!${NC}"
echo -e "${GREEN}🌐 Your app will be available at: https://$DEFAULT_DOMAIN${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your GitHub repository secrets with the publish profile"
echo "2. Set up your custom domain: $DOMAIN"
echo "3. Configure SSL certificate for custom domain"
echo "4. Update environment variables in Azure portal"

echo -e "${BLUE}📊 Cost estimation (B1 Basic tier):${NC}"
echo "- App Service Plan (B1): ~$13/month"
echo "- Custom domain SSL: ~$0/month (Let's Encrypt)"
echo "- Total estimated cost: ~$13/month"

echo -e "${GREEN}🎉 Deployment setup complete!${NC}"
