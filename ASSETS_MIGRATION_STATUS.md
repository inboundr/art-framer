# Assets Migration to Supabase - Status & Instructions

## Current Status

✅ **Code Migration Complete**
- All texture loading code has been updated to use Supabase Storage URLs
- `getSupabaseAssetUrlSync()` function converts local paths to Supabase URLs
- `texture-mapper.ts`, `asset-catalog.ts` all use Supabase URLs
- Components are ready to load assets from Supabase

❌ **Assets Not Yet Uploaded**
- Assets still need to be uploaded to Supabase Storage
- The error `Could not load /prodigi-assets/frames/classic/textures/black-diffuse-1x.webp` occurs because assets aren't in Supabase yet

## What Needs to Be Done

### Step 1: Create Supabase Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage**
4. Click **New bucket**
5. Name: `prodigi-assets`
6. **Toggle "Public bucket" to ON** (this is critical!)
7. Click **Create bucket**

### Step 2: Upload Assets

You have two options:

#### Option A: Using the Upload Script (Recommended)

1. Make sure you have your Supabase credentials in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://irugsjzjqdxulliobuwt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. Run the upload script:
   ```bash
   npx tsx scripts/upload-prodigi-assets-to-supabase.ts
   ```

   This will upload:
   - All files from `public/prodigi-assets/`
   - All files from `public/prodigi-assets-extracted/`

#### Option B: Manual Upload via Supabase Dashboard

1. Go to **Storage** → **prodigi-assets** bucket
2. Click **Upload file** or **Upload folder**
3. Upload the entire `public/prodigi-assets/` folder
4. Upload the entire `public/prodigi-assets-extracted/` folder
5. Maintain the exact same folder structure

### Step 3: Verify Upload

After uploading, test that assets are accessible:

```bash
# Replace with your actual Supabase URL
curl https://irugsjzjqdxulliobuwt.supabase.co/storage/v1/object/public/prodigi-assets/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
```

You should get a successful response with the image data.

### Step 4: Test the Application

1. Restart your development server
2. Navigate to `/studio`
3. The frame textures should now load from Supabase
4. Check the browser console - there should be no more asset loading errors

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

## Troubleshooting

### Assets Still Not Loading

1. **Check bucket is public:**
   - Go to Supabase Dashboard → Storage → prodigi-assets
   - Ensure "Public bucket" toggle is ON

2. **Verify environment variable:**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` is set correctly
   - Should be: `https://irugsjzjqdxulliobuwt.supabase.co`

3. **Check file paths:**
   - Files should be at: `prodigi-assets/frames/...` (not `/prodigi-assets/...`)
   - The leading slash is removed automatically by the code

4. **Test URL directly:**
   ```bash
   # Test a specific texture
   curl https://irugsjzjqdxulliobuwt.supabase.co/storage/v1/object/public/prodigi-assets/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp
   ```

### Upload Script Fails

1. **Check service role key:**
   - Must use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
   - Found in Supabase Dashboard → Settings → API → Service Role Key

2. **Check bucket exists:**
   - Create the bucket manually if the script fails

3. **Check file permissions:**
   - Ensure the script can read files from `public/` folder

## Files That Use Supabase URLs

All these files now use `getSupabaseAssetUrlSync()`:

- `src/lib/prodigi-textures/texture-mapper.ts` - Frame textures
- `src/lib/prodigi-assets/asset-catalog.ts` - Lifestyle images, chevrons, corners
- `src/components/studio/AIChat/Message.tsx` - Images in chat
- `src/components/studio/AIChat/ExpandableImage.tsx` - Expandable images
- `src/components/studio/FramePreview/RoomScene.tsx` - GLB room models

## Next Steps After Upload

1. ✅ Verify all textures load correctly
2. ✅ Test frame preview in `/studio`
3. ✅ Test lifestyle images in chat
4. ✅ Test room preview
5. ⏭️ (Optional) Remove assets from `public/` folder to reduce build size
6. ⏭️ (Optional) Add asset versioning/caching headers in Supabase

---

**Status:** Code ready ✅ | Assets need upload ⏳

