# Remote Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

## Step 2: Update Environment Variables

Update your `.env.local` file with the remote Supabase credentials:

```env
# Replace with your actual Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 3: Apply Database Migrations

Run the migrations on your remote Supabase instance:

```bash
# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Step 4: Test the API

Use your remote Supabase URL in API calls:

```bash
curl 'https://your-project-ref.supabase.co/rest/v1/images?select=*&is_public=eq.true' \
  -H 'apikey: your-anon-key-here'
```

## Step 5: Update Your Application

Make sure your application is using the correct Supabase URL in all API calls.
