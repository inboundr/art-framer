# Prodigi Image Not Showing - Diagnosis & Fix Guide

## The Problem

You placed an order and when you check it in Prodigi, **the frame image is not showing**.

## Possible Causes

### 1. **Image URLs are not publicly accessible** ⚠️ MOST LIKELY
- Your Supabase storage bucket might not be set to public
- RLS (Row Level Security) policies might be blocking public access
- Prodigi needs to fetch images from public URLs - if they can't access them, no image shows

### 2. **Wrong URL format sent to Prodigi**
- We might be sending a storage path instead of a full public URL
- Example BAD: `images/user-123/photo.jpg`
- Example GOOD: `https://yourproject.supabase.co/storage/v1/object/public/images/user-123/photo.jpg`

### 3. **Image wasn't saved properly**
- The image might not have been uploaded to Supabase Storage
- The image URL might not be in the database

### 4. **Prodigi API asset format issue**
- The `assets` array format might be wrong
- The `printArea` name might be incorrect
- The `sizing` parameter might be wrong

## Step-by-Step Diagnosis

### Step 1: Check your server logs from the last order

Look for these log entries:

```
🖼️ Image URL prepared for Prodigi: {
  productId: '...',
  rawImageUrl: '...',  <-- What's in the database
  publicImageUrl: '...', <-- What we're sending to Prodigi
  urlIsPublic: true,    <-- Should be true!
  urlLength: 150
}

🖼️ Prodigi Order Details: {
  items: [{
    assets: [{
      printArea: 'Default',
      url: 'https://...',  <-- Full URL should start with https://
      urlIsPublic: true,
      urlLength: 150
    }]
  }]
}
```

**What to check:**
- ✅ `urlIsPublic: true` - if false, we're sending wrong format
- ✅ `url` starts with `https://` - if not, it's a storage path
- ✅ `urlLength` > 100 - if too short, might be incomplete

### Step 2: Run the diagnostic script

Get your order ID from Supabase (or from the server logs where it says "Order created successfully: orderId: ..."):

```bash
node check-order-image-urls.js YOUR_ORDER_ID
```

This will:
- Show you the exact image URL stored in your database
- Test if that URL is publicly accessible
- Convert storage paths to public URLs if needed
- Show you what Prodigi received

### Step 3: Check Supabase Storage Settings

Go to your [Supabase Dashboard](https://supabase.com/dashboard):

1. **Storage** → **images** bucket → Check settings:
   - Is "Public bucket" toggle **ON**? ✅
   - If OFF, turn it ON ⚠️

2. **Storage** → **images** bucket → **Policies** tab:
   - Do you have a policy for public SELECT? ✅
   - If not, you need to create one ⚠️

### Step 4: Test an image URL directly

1. Get an image URL from your database (run the diagnostic script)
2. Open it in a new incognito browser tab
3. Does the image load? ✅ Public access works!
4. Get an error? ❌ Public access broken!

## Quick Fixes

### Fix 1: Make Supabase Storage Public (RECOMMENDED)

Run this in **Supabase SQL Editor**:

```sql
-- Make images bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'images';

-- Add public read policy
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Do the same for curated-images if it exists
UPDATE storage.buckets 
SET public = true 
WHERE id = 'curated-images';

CREATE POLICY "Public read access for curated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'curated-images');
```

### Fix 2: Retry Failed Orders

After fixing storage access, you can retry the Prodigi order creation:

```sql
-- Find failed retry operations
SELECT * FROM retry_operations 
WHERE type = 'prodigi_order_creation' 
AND status IN ('pending', 'failed')
ORDER BY created_at DESC;

-- Update them to retry
UPDATE retry_operations 
SET status = 'pending', 
    attempts = 0,
    next_retry = NOW()
WHERE type = 'prodigi_order_creation' 
AND status = 'failed';
```

The system will automatically retry creating the Prodigi order.

### Fix 3: Check Current Prodigi Order

If the order was already sent to Prodigi, you can check what they received:

1. Go to [Prodigi Dashboard](https://dashboard.prodigi.com)
2. Find your order by order number (starts with `ORD-`)
3. Look at the order details
4. Check if the image shows there
5. If not, try to edit the order (if still in edit window) and re-upload the image

## What We've Added for Next Orders

Your code now includes enhanced logging that will help diagnose this automatically:

1. **Image URL Logging**: Shows exactly what URL we're sending to Prodigi
2. **Public URL Verification**: Checks if URLs start with `http`
3. **Asset Details**: Logs complete asset array sent to Prodigi
4. **Order Response**: Shows what Prodigi returned

## Expected Log Output (Working Correctly)

```
🖼️ Image URL prepared for Prodigi: {
  productId: 'e9e26b72-1208-4335-8f4e-6cc16e4e424c',
  rawImageUrl: 'https://yourproject.supabase.co/storage/v1/object/public/images/...',
  publicImageUrl: 'https://yourproject.supabase.co/storage/v1/object/public/images/...',
  urlIsPublic: true,  ✅
  urlLength: 150
}

🖼️ Prodigi Order Details: {
  merchantReference: 'ORD-1234567890-ABC',
  itemCount: 1,
  items: [{
    sku: 'GLOBAL-FAP-11X14',
    copies: 1,
    sizing: 'fillPrintArea',
    attributes: {},
    assetCount: 1,
    assets: [{
      printArea: 'Default',
      url: 'https://yourproject.supabase.co/storage/v1/object/public/images/...',  ✅
      urlLength: 150,
      urlIsPublic: true,  ✅
      urlPreview: 'https://yourproject.supabase.co/storage/v1/object/public/images/user-...'
    }]
  }]
}

✅ Prodigi order created successfully: {
  orderId: 'pro_abc123',
  status: 'InProgress',
  itemCount: 1
}
```

## If Problem Persists

If you've fixed storage access and still have issues:

1. **Check Prodigi API Response**: Look for any error messages in the logs
2. **Verify Image Format**: Prodigi supports JPEG, PNG - check your image format
3. **Check Image Size**: Prodigi has max file size limits - very large images might fail
4. **Contact Prodigi Support**: They can check their logs for why image failed to load

## Next Steps

1. ✅ **Run the diagnostic script** on your existing order
2. ✅ **Fix Supabase storage access** if needed
3. ✅ **Make a test order** and check the new enhanced logs
4. ✅ **Verify the image shows** in Prodigi dashboard

The enhanced logging will help you catch this issue immediately on the next order!

