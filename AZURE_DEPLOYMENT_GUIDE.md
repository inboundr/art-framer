# 🚀 Azure Deployment Guide for cooart.studio

This guide will help you deploy your Next.js application to Azure App Service with automatic CI/CD using GitHub Actions.

## 📋 Prerequisites

- Azure account (free tier available)
- GitHub account
- Domain: cooart.studio
- Azure CLI installed locally

## 💰 Cost Estimation

- **App Service Plan (B1 Basic)**: ~$13/month
- **Custom Domain SSL**: Free (Let's Encrypt)
- **Total Monthly Cost**: ~$13/month
- **Free Tier Available**: Yes (F1 tier for testing)

## 🚀 Quick Start

### Step 1: Prepare Your Repository

1. **Push your code to GitHub**:

   ```bash
   git add .
   git commit -m "Add Azure deployment configuration"
   git push origin main
   ```

2. **Make deployment scripts executable**:
   ```bash
   chmod +x scripts/deploy-azure.sh
   chmod +x scripts/setup-domain.sh
   ```

### Step 2: Deploy to Azure

1. **Run the deployment script**:

   ```bash
   ./scripts/deploy-azure.sh
   ```

2. **Follow the prompts** to:
   - Log in to Azure
   - Create resource group
   - Create App Service Plan
   - Create Web App
   - Configure settings

### Step 3: Configure GitHub Actions

1. **Get the publish profile**:
   - Go to Azure Portal > App Services > cooart-studio
   - Click "Get publish profile"
   - Download the file

2. **Add GitHub secrets**:
   - Go to your GitHub repository
   - Settings > Secrets and variables > Actions
   - Add `AZURE_WEBAPP_PUBLISH_PROFILE` with the content of the downloaded file

3. **Add environment variables**:
   - Add all secrets from `azure/environment-variables.md`

### Step 4: Set Up Custom Domain

1. **Run the domain setup script**:

   ```bash
   ./scripts/setup-domain.sh
   ```

2. **Configure DNS at your domain provider**:
   - Add CNAME record: `cooart.studio` → `cooart-studio.azurewebsites.net`
   - Add CNAME record: `www` → `cooart-studio.azurewebsites.net`

3. **Enable SSL in Azure Portal**:
   - Go to App Service > Custom domains
   - Add binding for your domain
   - Select "App Service Managed Certificate"
   - Enable HTTPS redirect

## 🔧 Manual Configuration

### Azure Portal Setup

1. **Create Resource Group**:
   - Name: `cooart-rg`
   - Location: `East US`

2. **Create App Service Plan**:
   - Name: `cooart-plan`
   - Tier: `B1 Basic` (for cost efficiency)
   - OS: `Linux`

3. **Create Web App**:
   - Name: `cooart-studio`
   - Runtime: `Node 18 LTS`
   - Region: `East US`

### Environment Variables

Set these in Azure Portal > App Service > Configuration:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://irugsjzjqdxulliobuwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
PRODIGI_API_KEY=11fc6ec8-855e-4b32-a36a-3a80db5d5ea6
PRODIGI_ENVIRONMENT=production
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow will:

1. **Build** your application
2. **Test** (if tests exist)
3. **Deploy** to Azure automatically
4. **Health check** after deployment

### Triggering Deployments

- **Automatic**: Push to `main` or `master` branch
- **Manual**: Go to Actions tab in GitHub and run the workflow

## 🌐 Domain Configuration

### DNS Settings

Add these records to your domain provider (e.g., Cloudflare, GoDaddy):

```
Type: CNAME
Name: cooart.studio
Value: cooart-studio.azurewebsites.net

Type: CNAME
Name: www
Value: cooart-studio.azurewebsites.net
```

### SSL Certificate

1. Go to Azure Portal > App Service > cooart-studio
2. Go to Custom domains
3. Click "Add binding" for your domain
4. Select "App Service Managed Certificate"
5. Enable "HTTPS Only"

## 📊 Monitoring & Maintenance

### Health Monitoring

- **Health Check**: `https://cooart.studio/api/health`
- **Azure Monitor**: Built-in monitoring in Azure Portal
- **Application Insights**: Optional advanced monitoring

### Scaling

- **Vertical Scaling**: Change App Service Plan tier
- **Horizontal Scaling**: Add more instances
- **Auto-scaling**: Configure based on metrics

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables
   - Verify Node.js version compatibility
   - Check build logs in GitHub Actions

2. **Domain Issues**:
   - Verify DNS propagation (up to 48 hours)
   - Check SSL certificate status
   - Verify domain binding in Azure

3. **Performance Issues**:
   - Enable "Always On" in App Service settings
   - Consider upgrading App Service Plan
   - Check application logs

### Useful Commands

```bash
# Check Azure CLI login
az account show

# List resource groups
az group list

# Check app service status
az webapp show --name cooart-studio --resource-group cooart-rg

# View logs
az webapp log tail --name cooart-studio --resource-group cooart-rg
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit secrets to code
2. **HTTPS Only**: Enable in App Service settings
3. **Custom Domain**: Use your own domain for branding
4. **SSL Certificate**: Always use HTTPS
5. **Access Restrictions**: Configure IP restrictions if needed

## 📈 Performance Optimization

1. **CDN**: Consider Azure CDN for static assets
2. **Caching**: Configure appropriate cache headers
3. **Database**: Optimize Supabase queries
4. **Images**: Use Next.js Image component for optimization

## 🎯 Next Steps After Deployment

1. **Test your application**: Visit `https://cooart.studio`
2. **Configure webhooks**: Update Stripe and Prodigi webhook URLs
3. **Set up monitoring**: Configure alerts and monitoring
4. **Backup strategy**: Set up automated backups
5. **SSL certificate**: Ensure HTTPS is working

## 📞 Support

- **Azure Support**: Available in Azure Portal
- **Documentation**: [Azure App Service Docs](https://docs.microsoft.com/en-us/azure/app-service/)
- **Community**: [Azure Community](https://docs.microsoft.com/en-us/answers/topics/azure-app-service.html)

---

## 🎉 Congratulations!

Your application is now deployed to Azure with:

- ✅ Automatic CI/CD with GitHub Actions
- ✅ Custom domain: cooart.studio
- ✅ SSL certificate
- ✅ Health monitoring
- ✅ Cost-effective hosting (~$13/month)

**Your app is live at: https://cooart.studio** 🚀
