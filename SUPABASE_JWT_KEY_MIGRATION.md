# Supabase JWT Signing Key Migration Guide

## What's Happening?

Supabase is deprecating the old JWT signing keys and recommending you switch to **new JWT signing keys** for better security.

This is a **security update** - the old keys will eventually stop working.

---

## Why This Matters

JWT (JSON Web Token) signing keys are used to:
- Verify user authentication tokens
- Secure API requests
- Validate session tokens

If you don't update, your authentication will eventually break when Supabase deprecates the old keys.

---

## How to Migrate (Step-by-Step)

### Step 1: Go to Supabase Dashboard

1. Navigate to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**

### Step 2: Find the New JWT Keys

Supabase should show a banner or notification about migrating to new JWT signing keys.

Look for:
- **JWT Secret** (old format - will be deprecated)
- **New JWT Signing Key** (new format - what you need)

### Step 3: Update Your Environment Variables

You have two options:

#### Option A: Update via Supabase Dashboard (Recommended - Automatic)

1. In Supabase Dashboard → **Settings** → **API**
2. Look for a button like **"Migrate to new JWT keys"** or **"Enable new JWT format"**
3. Click it - Supabase will handle the migration automatically
4. Your existing tokens will continue to work during transition

#### Option B: Manual Update (if needed)

If Supabase requires you to manually rotate keys:

1. **Get the new keys** from Supabase Dashboard → Settings → API
2. **Update your `.env.local`** file:

```bash
# OLD (if you have this, remove it)
# JWT_SECRET=your-old-jwt-secret

# NEW - Supabase handles JWT internally, you don't need to set this
# Just make sure you have the latest anon and service keys:
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # From Supabase Dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # From Supabase Dashboard
```

### Step 4: Update Production Environment Variables

If you're using Vercel/Netlify/other hosting:

1. Go to your hosting platform dashboard
2. **Environment Variables** settings
3. Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy your application

### Step 5: Verify the Migration

1. **Test login** - try logging in to your app
2. **Test API calls** - make sure authenticated requests work
3. **Check logs** - look for JWT-related errors
4. **Test logout** - verify logout still works

---

## What You DON'T Need to Change

✅ **Your authentication code** - no code changes needed!
✅ **User passwords** - users don't need to reset passwords
✅ **Existing user sessions** - sessions will be automatically refreshed
✅ **Database** - no database changes needed

---

## Our Current Setup

Looking at your code, we're using Supabase's authentication through:

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// src/lib/supabase/server.ts
export const createServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};
```

**These use Supabase's keys, which include the JWT signing information.**

So when Supabase migrates to new JWT signing keys, you just need to:
1. Get the new `ANON_KEY` and `SERVICE_ROLE_KEY` from Supabase Dashboard
2. Update your environment variables
3. Redeploy

---

## Environment Variable Checklist

Make sure you have these set correctly:

### Local Development (`.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Get from Supabase Dashboard
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Get from Supabase Dashboard

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Prodigi
PRODIGI_API_KEY=your-prodigi-key
PRODIGI_ENVIRONMENT=production

# Ideogram
IDEOGRAM_API_KEY=your-ideogram-key
```

### Production (Vercel/Hosting Platform)
Same as above, but make sure they're set in your hosting platform's environment variables.

---

## If You See Errors After Migration

### Error: "Invalid JWT"
- Your environment variables might not be updated
- Redeploy your application after updating env vars
- Clear your browser cache and cookies

### Error: "Failed to refresh session"
- Ask users to log out and log back in
- Old sessions might need to be refreshed

### Error: "Unauthorized"
- Check that `SUPABASE_SERVICE_ROLE_KEY` is updated
- Verify API routes are using the new key

---

## Testing Checklist

After migration, test these flows:

- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] User can generate images (authenticated API call)
- [ ] User can add to cart (authenticated API call)
- [ ] User can checkout (authenticated API call)
- [ ] Order webhook processing works
- [ ] User profile loads correctly

---

## Timeline

According to Supabase's typical deprecation schedule:

- **Now**: Warning banner showing in dashboard
- **~3 months**: Old keys still work but deprecated
- **~6 months**: Old keys may stop working

**Recommendation: Migrate ASAP** to avoid future disruption.

---

## Need Help?

1. **Check Supabase Dashboard** - there's usually a migration guide specific to your project
2. **Check Supabase Docs**: https://supabase.com/docs/guides/auth/sessions/jwts
3. **Contact Supabase Support** if you have questions about the migration

---

## Quick Migration Steps Summary

1. ✅ Go to Supabase Dashboard → Settings → API
2. ✅ Click "Migrate to new JWT keys" (if available)
3. ✅ Copy new `ANON_KEY` and `SERVICE_ROLE_KEY`
4. ✅ Update `.env.local` and production env vars
5. ✅ Redeploy application
6. ✅ Test authentication flows
7. ✅ Done! 🎉

The migration should be seamless - your users won't notice anything!

