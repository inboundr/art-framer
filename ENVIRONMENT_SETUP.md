# 🔧 Environment Setup Guide

This guide will help you set up all the required environment variables for the Art Framer application.

## Quick Setup

### Option 1: Interactive Setup (Recommended)

```bash
npm run setup-env
```

This will run an interactive script that guides you through setting up all required environment variables.

### Option 2: Manual Setup

1. Copy the template file:
   ```bash
   cp env.template .env.local
   ```
2. Edit `.env.local` and fill in your actual values

## Required Environment Variables

### 📊 Supabase Configuration

Get these from your [Supabase project dashboard](https://app.supabase.com):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to get these:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon key
5. Copy the service_role key (keep this secret!)

### 💳 Stripe Configuration

Get these from your [Stripe dashboard](https://dashboard.stripe.com):

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**How to get these:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to Developers → API keys
3. Copy the Secret key (starts with `sk_test_` for testing)
4. Copy the Publishable key (starts with `pk_test_` for testing)

### 🎨 Ideogram AI Configuration

Get this from your [Ideogram account](https://ideogram.ai):

```bash
IDEOGRAM_API_KEY=your_ideogram_api_key
```

**How to get this:**

1. Go to [Ideogram AI](https://ideogram.ai)
2. Sign up/login to your account
3. Go to API settings or developer section
4. Generate or copy your API key

### 🖼️ Prodigi Configuration

Get these from your [Prodigi account](https://www.prodigi.com):

```bash
PRODIGI_API_KEY=your_prodigi_api_key
PRODIGI_ENVIRONMENT=sandbox
```

**How to get these:**

1. Go to [Prodigi](https://www.prodigi.com)
2. Sign up for a developer account
3. Access your developer dashboard
4. Copy your API key
5. Set environment to `sandbox` for testing, `production` for live

## Optional Environment Variables

### 📈 Analytics & Monitoring

```bash
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### 📧 Email Service

```bash
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_CONTACT_EMAIL=support@artframer.com
```

### 🌐 App Configuration

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Validation

### Check Your Configuration

```bash
npm run validate-env
```

This will check if all required environment variables are properly set.

### Build Validation

The build process automatically validates environment variables:

```bash
npm run build
```

If any required variables are missing, the build will show helpful error messages.

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
PRODIGI_ENVIRONMENT=sandbox
STRIPE_SECRET_KEY=sk_test_...  # Use test keys
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

```bash
NODE_ENV=production
PRODIGI_ENVIRONMENT=production
STRIPE_SECRET_KEY=sk_live_...  # Use live keys
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Security Best Practices

### 🔒 Keep Secrets Secret

- Never commit `.env.local` to version control
- Use different API keys for development and production
- Rotate API keys regularly
- Use environment-specific configurations

### 🛡️ API Key Security

- **Supabase Service Role Key**: Keep this secret, never expose in client-side code
- **Stripe Secret Key**: Server-side only, never expose to clients
- **Ideogram API Key**: Server-side only
- **Prodigi API Key**: Server-side only

### 🔍 Environment Validation

The application automatically validates environment variables on startup and will show helpful error messages if anything is missing or misconfigured.

## Troubleshooting

### Common Issues

#### Missing Environment Variables

```
❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, STRIPE_SECRET_KEY
```

**Solution**: Run `npm run setup-env` or manually add the missing variables to `.env.local`

#### Invalid API Keys

```
❌ Supabase client initialization failed
```

**Solution**: Check that your Supabase URL and keys are correct

#### Build Failures

```
❌ Environment validation failed
```

**Solution**: Run `npm run validate-env` to see which variables are missing or invalid

### Getting Help

1. **Check the setup script**: `npm run setup-env`
2. **Validate your config**: `npm run validate-env`
3. **Check the console**: Look for environment validation messages
4. **Review the template**: Compare your `.env.local` with `env.template`

## Next Steps

After setting up your environment variables:

1. **Test the build**: `npm run build`
2. **Start development**: `npm run dev`
3. **Verify functionality**: Test image generation, cart, and checkout
4. **Deploy**: Your app is ready for production deployment!

---

## 📋 Environment Variables Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `IDEOGRAM_API_KEY` - Ideogram AI API key
- [ ] `PRODIGI_API_KEY` - Prodigi print API key
- [ ] `PRODIGI_ENVIRONMENT` - Prodigi environment (sandbox/production)

### Optional

- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `NEXT_PUBLIC_ANALYTICS_ID` - Analytics tracking ID
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Error monitoring DSN
- [ ] `RESEND_API_KEY` - Email service API key
- [ ] `NEXT_PUBLIC_CONTACT_EMAIL` - Support email address
- [ ] `NEXT_PUBLIC_APP_URL` - Application URL

---

**🎉 Once all variables are set, your Art Framer application will be ready to run!**
