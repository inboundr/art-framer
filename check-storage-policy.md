# Supabase Storage Public Access Check

## Issue
Prodigi is not showing the image of the frame in the order. This could be because:

1. **Image URLs are not publicly accessible** - Supabase storage might have RLS policies preventing public access
2. **Image URL format is wrong** - The URL we're sending might not be the correct public URL
3. **Prodigi can't access the URL** - CORS or network issues

## How to Check in Supabase Dashboard

### Step 1: Check Storage Bucket Policies

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click on **Storage** in the left sidebar
3. Click on the **images** bucket
4. Click on **Policies** tab
5. Check if there's a policy that allows public SELECT access

**Expected Policy:**
```sql
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');
```

If this policy doesn't exist, you need to create it!

### Step 2: Check if Bucket is Public

1. In the **images** bucket settings
2. Look for "Public bucket" toggle
3. It should be **ON** (enabled)

If it's OFF, turn it ON to make all images in the bucket publicly accessible.

### Step 3: Test an Image URL

1. Go to **Storage** > **images** bucket
2. Click on any image file
3. Copy the public URL
4. Open it in a new browser tab (incognito mode)
5. If the image loads, public access is working ✅
6. If you get an error (404, 403, etc.), public access is broken ❌

## Quick Fix in Supabase SQL Editor

Run this SQL command in Supabase SQL Editor:

```sql
-- Make images bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'images';

-- Add public read policy for images
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Also do the same for curated-images bucket if it exists
UPDATE storage.buckets 
SET public = true 
WHERE id = 'curated-images';

CREATE POLICY "Allow public read access to curated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'curated-images');
```

## Test Script

After making changes, test with:

```bash
# Replace with your actual image URL from database
node test-image-url-access.js "https://YOUR_PROJECT.supabase.co/storage/v1/object/public/images/YOUR_IMAGE.jpg"
```

