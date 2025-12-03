# Prodigi Assets Migration to Supabase Storage

## Overview

All Prodigi assets (frame textures, lifestyle images, etc.) have been migrated from the `public/` folder to Supabase Storage for better performance, CDN delivery, and scalability.

## What Changed

### Code Updates

1. **`src/lib/prodigi-assets/supabase-assets.ts`** (NEW)
   - Utility functions to convert local paths to Supabase storage URLs
   - `getSupabaseAssetUrlSync()` - Synchronously converts paths to Supabase URLs

2. **`src/lib/prodigi-textures/texture-mapper.ts`** (UPDATED)
   - All texture path functions now return Supabase URLs instead of local paths
   - `getTexturePath()`, `getMountTexturePath()`, `getCanvasTexturePath()`, `getCanvasWrapTexturePath()`

3. **`src/lib/prodigi-assets/asset-catalog.ts`** (UPDATED)
   - All asset catalog functions now return Supabase URLs
   - `getLifestyleImages()`, `getChevronImage()`, `getCornerImages()`, `getCrossSectionImage()`, `getMountSampleImage()`

## Setup Instructions

### 1. Create Supabase Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Click **New bucket**
4. Name: `prodigi-assets`
5. **Make it public** (toggle "Public bucket")
6. Click **Create bucket**

### 2. Upload Assets

#### Option A: Using the Upload Script (Recommended)

```bash
# Make sure you have the service role key in .env.local
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Run the upload script
npx tsx scripts/upload-prodigi-assets-to-supabase.ts
```

#### Option B: Manual Upload via Supabase Dashboard

1. Go to **Storage** → **prodigi-assets** bucket
2. Click **Upload file** or **Upload folder**
3. Upload the entire `public/prodigi-assets/` folder
4. Upload the entire `public/prodigi-assets-extracted/` folder
5. Maintain the same folder structure

### 3. Verify Upload

After uploading, verify that files are accessible:

```bash
# Test URL format (replace with your Supabase URL):
https://your-project.supabase.co/storage/v1/object/public/prodigi-assets/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
```

## Asset Structure in Supabase

The assets should be organized exactly as they are in the `public/` folder:

```
prodigi-assets/
├── frames/
│   ├── classic/
│   │   └── textures/
│   │       ├── black-diffuse-1x.webp
│   │       ├── black-normal-1x.webp
│   │       └── ...
│   ├── aluminium/
│   ├── box/
│   └── spacer/
├── mounts/
│   ├── black-mount.webp
│   ├── snow-white-mount.webp
│   └── ...
├── canvas/
│   ├── textures/
│   └── wraps/
└── ...

prodigi-assets-extracted/
├── prodigi-classic-frames-photo-assets/
│   ├── Classic black framed print flat.jpg
│   └── ...
├── prodigi-box-frames-photo-assets/
└── ...
```

## How It Works

### Before (Local Assets)
```typescript
// Path: /prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
const texturePath = '/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp';
```

### After (Supabase Storage)
```typescript
// Automatically converted to:
// https://your-project.supabase.co/storage/v1/object/public/prodigi-assets/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
const texturePath = getSupabaseAssetUrlSync('/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp');
```

## Benefits

1. **CDN Delivery** - Supabase Storage uses CDN for fast global delivery
2. **Scalability** - No need to bundle large assets in the Next.js build
3. **Performance** - Assets load faster, especially for international users
4. **Storage Management** - Centralized asset management in Supabase
5. **Version Control** - Assets are no longer in git, reducing repo size

## Troubleshooting

### Assets Not Loading

1. **Check bucket is public:**
   - Go to Supabase Dashboard → Storage → prodigi-assets
   - Ensure "Public bucket" toggle is ON

2. **Verify file paths:**
   - Check that files are uploaded with the correct paths
   - Paths should match exactly: `prodigi-assets/frames/...` (not `/prodigi-assets/...`)

3. **Check environment variable:**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly
   - Should be: `https://your-project.supabase.co`

4. **Test URL directly:**
   ```bash
   curl https://your-project.supabase.co/storage/v1/object/public/prodigi-assets/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
   ```

### Upload Script Fails

1. **Check service role key:**
   - Must use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
   - Found in Supabase Dashboard → Settings → API

2. **Check bucket exists:**
   - Create the bucket manually if the script fails

3. **Check file permissions:**
   - Ensure the script can read files from `public/` folder

## Migration Checklist

- [ ] Create `prodigi-assets` bucket in Supabase Storage
- [ ] Set bucket to public
- [ ] Upload all assets from `public/prodigi-assets/`
- [ ] Upload all assets from `public/prodigi-assets-extracted/`
- [ ] Verify assets are accessible via public URLs
- [ ] Test the studio page loads textures correctly
- [ ] Test lifestyle images display correctly
- [ ] Test frame preview renders correctly
- [ ] (Optional) Remove assets from `public/` folder after verification

## Rollback Plan

If you need to rollback:

1. The code will fallback to local paths if Supabase URL is not set
2. Keep assets in `public/` folder until migration is verified
3. Revert the code changes if needed

## Next Steps

After successful migration:

1. ✅ Assets are now served from Supabase Storage
2. ✅ All texture loading uses Supabase URLs
3. ✅ All asset catalog functions use Supabase URLs
4. ⏭️ (Optional) Remove assets from `public/` folder to reduce build size
5. ⏭️ (Optional) Add asset versioning/caching headers in Supabase

---

**Status:** ✅ Code migration complete - Ready for asset upload

