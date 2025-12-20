# Google SSO Setup Guide

## Overview

Google Single Sign-On (SSO) has been successfully integrated into the login and signup pages. Users can now sign in with their Google account in addition to the traditional email/password method.

## What Was Implemented

### 1. Auth Provider Updates (`src/contexts/CentralizedAuthProvider.tsx`)
- Added `signInWithGoogle()` method that uses Supabase's OAuth integration
- Configured redirect URL to `/auth/callback`
- Added method to AuthContextType interface

### 2. OAuth Callback Page (`src/app/(auth)/auth/callback/page.tsx`)
- New page that handles the OAuth redirect from Google
- Exchanges the authorization code for a session
- Redirects user to home page or intended destination
- Handles errors gracefully

### 3. Login Form Updates (`src/components/forms/LoginForm.tsx`)
- Added "Continue with Google" button
- Added visual separator between email/password and Google sign-in
- Includes Google logo SVG
- Loading states for both methods

### 4. Signup Form Updates (`src/components/forms/SignupForm.tsx`)
- Added "Continue with Google" button
- Same visual design as login form
- Consistent user experience

## Configuration Required

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name it (e.g., "Art Framer Web App")

4. **Configure Authorized Redirect URIs**
   Add these URLs (replace with your actual domains):
   
   **For Development:**
   ```
   http://localhost:3000/auth/callback
   https://localhost:3000/auth/callback
   ```
   
   **For Production:**
   ```
   https://yourdomain.com/auth/callback
   https://www.yourdomain.com/auth/callback
   ```
   
   **For Supabase (Important!):**
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```

5. **Get Your Credentials**
   - Copy the "Client ID"
   - Copy the "Client Secret"

### Step 2: Supabase Configuration

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings**
   - Click "Authentication" in sidebar
   - Click "Providers"
   - Find "Google" in the list

3. **Enable Google Provider**
   - Toggle "Google Enabled" to ON
   - Paste your Google Client ID
   - Paste your Google Client Secret
   - Click "Save"

4. **Configure Redirect URLs (Optional)**
   - Go to "Authentication" > "URL Configuration"
   - Set "Site URL" to your production domain
   - Add redirect URLs if needed

### Step 3: Environment Variables (Optional)

If you want to store Google credentials in your `.env.local` file:

```env
# Google OAuth (optional - configured in Supabase dashboard)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

**Note:** The credentials are primarily configured in Supabase dashboard, not in your app's env variables.

### Step 4: Local Supabase Configuration (If using local Supabase)

If you're running Supabase locally, update `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "your-client-id-here.apps.googleusercontent.com"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

Then set the environment variable:
```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="your-google-client-secret"
```

## Testing the Integration

### Local Testing

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

3. **Click "Continue with Google"**
   - Should redirect to Google sign-in
   - Select your Google account
   - Grant permissions
   - Should redirect back to `/auth/callback`
   - Should then redirect to home page

4. **Verify user is logged in:**
   - Check if user profile appears
   - Check browser console for auth logs
   - Check Supabase dashboard > Authentication > Users

### Production Testing

1. Deploy your app with the changes
2. Ensure production redirect URLs are configured in Google Console
3. Test the same flow as local testing

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Solution:** Make sure the redirect URI in Google Console exactly matches:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

### Error: "Invalid client"
**Solution:** Double-check that:
- Client ID is correct in Supabase dashboard
- Client Secret is correct in Supabase dashboard
- Google OAuth consent screen is configured

### User redirected but not logged in
**Solution:** Check:
- Browser console for errors
- Supabase logs in dashboard
- Callback page is properly handling the code exchange

### Error: "Access blocked: This app's request is invalid"
**Solution:** 
- Verify OAuth consent screen is configured
- Add test users if app is in "Testing" mode
- Publish the app for production use

## Security Considerations

1. **HTTPS Required:** Google OAuth requires HTTPS in production
2. **Redirect URI Validation:** Google strictly validates redirect URIs
3. **Client Secret:** Never commit client secret to git
4. **Supabase RLS:** Ensure Row Level Security policies are configured
5. **Session Management:** Supabase handles session security automatically

## User Experience Flow

### New User (Sign Up with Google)
1. Click "Continue with Google" on signup page
2. Redirect to Google sign-in
3. Select Google account
4. Grant permissions
5. Redirect to callback page
6. Profile created automatically in Supabase
7. Redirect to home page (logged in)

### Existing User (Sign In with Google)
1. Click "Continue with Google" on login page
2. Redirect to Google sign-in
3. Select Google account (may skip if already signed in)
4. Redirect to callback page
5. Session established
6. Redirect to home page (logged in)

## Features

✅ **One-Click Sign In** - No password required  
✅ **Automatic Profile Creation** - User profile created from Google data  
✅ **Secure OAuth 2.0** - Industry-standard authentication  
✅ **Session Management** - Handled by Supabase  
✅ **Error Handling** - Graceful error messages  
✅ **Loading States** - Clear feedback during authentication  
✅ **Mobile Responsive** - Works on all devices  

## Files Modified

### New Files
- `src/app/(auth)/auth/callback/page.tsx` - OAuth callback handler

### Modified Files
- `src/contexts/CentralizedAuthProvider.tsx` - Added Google sign-in method
- `src/components/forms/LoginForm.tsx` - Added Google button
- `src/components/forms/SignupForm.tsx` - Added Google button

## Next Steps

1. **Configure Google Cloud Console** (see Step 1 above)
2. **Configure Supabase Dashboard** (see Step 2 above)
3. **Test locally** to verify it works
4. **Deploy to production** with proper redirect URLs
5. **Monitor Supabase logs** for any issues

## Additional Resources

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase dashboard logs
3. Verify all configuration steps
4. Check that redirect URLs match exactly
5. Ensure Google OAuth consent screen is configured

