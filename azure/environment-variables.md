# Environment Variables for Azure Deployment

## Required Environment Variables

Set these in your Azure App Service Configuration:

### Supabase Configuration

```
NEXT_PUBLIC_SUPABASE_URL=https://irugsjzjqdxulliobuwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Stripe Configuration

```
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

### Prodigi Configuration

```
PRODIGI_API_KEY=11fc6ec8-855e-4b32-a36a-3a80db5d5ea6
PRODIGI_ENVIRONMENT=production
PRODIGI_WEBHOOK_SECRET=your-prodigi-webhook-secret-here
```

### Application Configuration

```
NODE_ENV=production
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

## GitHub Secrets

Add these to your GitHub repository secrets:

### Azure Secrets

```
AZURE_WEBAPP_PUBLISH_PROFILE=[Get from Azure portal]
```

### Application Secrets

```
NEXT_PUBLIC_SUPABASE_URL=https://irugsjzjqdxulliobuwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
PRODIGI_API_KEY=11fc6ec8-855e-4b32-a36a-3a80db5d5ea6
PRODIGI_ENVIRONMENT=production
PRODIGI_WEBHOOK_SECRET=your-prodigi-webhook-secret-here
```

## How to Set Environment Variables

### In Azure Portal:

1. Go to Azure Portal > App Services > cooart-studio
2. Go to Configuration > Application settings
3. Add each environment variable
4. Click "Save"

### In GitHub:

1. Go to your repository on GitHub
2. Go to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret
