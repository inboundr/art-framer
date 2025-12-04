# Uploads Migration to Supabase Storage

## Overview
The `/public/uploads` folder was used for temporary image uploads in the studio. This has been migrated to Supabase Storage for better scalability and reliability.

## Changes Made

### 1. Updated Upload API (`/api/upload/route.ts`)
- ✅ Now uploads directly to Supabase Storage (`uploads` bucket)
- ✅ Returns Supabase public URLs instead of local paths
- ✅ Uses service role key for uploads (no authentication required for API route)

### 2. Created Migration Script
- ✅ `scripts/migrate-uploads-to-supabase.ts` - Migrates existing files from `/public/uploads` to Supabase

## Setup

### 1. Create Supabase Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `uploads`
3. Set it to **Public** (so uploaded images can be accessed)
4. Set file size limit to **10MB** (or your preferred limit)

### 2. Run Migration Script (Optional)
If you have existing files in `/public/uploads` that you want to migrate:

```bash
npx tsx scripts/migrate-uploads-to-supabase.ts
```

This will:
- Create the `uploads` bucket if it doesn't exist
- Upload all files from `/public/uploads` to `uploads/studio/` in Supabase
- Preserve original filenames

### 3. Verify Uploads Work
1. Go to the Studio page
2. Upload an image via the ImageUpload component
3. Check that the image loads correctly
4. Verify the URL is a Supabase Storage URL (should contain `supabase.co`)

## Storage Structure

### Supabase Storage
```
uploads/
  └── studio/
      ├── {uuid}.jpg
      ├── {uuid}.png
      └── ...
```

### Old Structure (to be removed)
```
public/
  └── uploads/
      ├── {uuid}.jpg
      ├── {uuid}.png
      └── ...
```

## URL Format

### Old Format (Local)
```
/uploads/{filename}
```

### New Format (Supabase)
```
{SUPABASE_URL}/storage/v1/object/public/uploads/studio/{filename}
```

## Code Changes

### Upload API Response
The `/api/upload` endpoint now returns:
```json
{
  "id": "uuid",
  "url": "https://...supabase.co/storage/v1/object/public/uploads/studio/uuid.jpg",
  "filename": "studio/uuid.jpg",
  "size": 123456,
  "type": "image/jpeg"
}
```

### ImageUpload Component
No changes needed - it already uses the `url` from the API response.

### Studio Store
No changes needed - `setImage(url, id)` accepts any URL format.

## Cleanup

After verifying everything works:

1. **Delete local uploads folder** (optional):
   ```bash
   rm -rf public/uploads
   ```

2. **Update `.gitignore`** (if needed):
   ```
   /public/uploads
   ```

## Benefits

✅ **Scalability**: No file system limits  
✅ **Reliability**: Supabase handles backups and redundancy  
✅ **Performance**: CDN-like access via Supabase Storage  
✅ **Security**: Better access control with Supabase policies  
✅ **Consistency**: All assets now in Supabase Storage  

## Troubleshooting

### Upload fails with "Bucket not found"
- Make sure the `uploads` bucket exists in Supabase Dashboard
- Check that it's set to public

### Upload fails with "File size limit exceeded"
- Check the bucket's file size limit in Supabase Dashboard
- Default is usually 50MB, but can be configured

### Images don't load after upload
- Verify the bucket is set to **Public**
- Check the URL format matches: `{SUPABASE_URL}/storage/v1/object/public/uploads/studio/{filename}`
- Verify CORS settings if loading from a different domain

