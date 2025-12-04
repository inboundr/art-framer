# Room GLB File Upload to Supabase

## Issue
The `cozy_living_room_baked.glb` file is **114MB**, which exceeds Supabase Storage's default file size limit (typically 50-100MB depending on your plan).

## Solution Options

### Option 1: Upload via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard → Storage
2. Navigate to the `prodigi-assets` bucket
3. Create the folder structure: `samples/rooms/cozy-living-room-baked/`
4. Upload the file: `public/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb`
5. The dashboard may handle larger files better than the API

### Option 2: Compress the GLB File
Use a GLB compression tool to reduce file size:
- [gltf-pipeline](https://github.com/CesiumGS/gltf-pipeline)
- [gltf-transform](https://gltf-transform.donmccurdy.com/)

```bash
# Install gltf-transform
npm install -g @gltf-transform/cli

# Compress the GLB file
gltf-transform optimize public/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb public/samples/rooms/cozy-living-room-baked/cozy_living_room_baked_compressed.glb
```

### Option 3: Check Supabase Plan Limits
- **Free Tier**: 50MB file size limit
- **Pro Tier**: 100MB file size limit
- **Team/Enterprise**: May have higher limits

If you're on a paid plan, you may need to contact Supabase support to increase the limit for your specific use case.

## Code Status
✅ The code has been updated to use Supabase URLs:
- `RoomScene.tsx` now uses `getSupabaseAssetUrlSync()` for the GLB path
- Once the file is uploaded, it will automatically load from Supabase

## Storage Path
The file should be uploaded to:
```
prodigi-assets/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb
```

## Public URL Format
Once uploaded, the file will be accessible at:
```
{SUPABASE_URL}/storage/v1/object/public/prodigi-assets/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb
```

## Verification
After uploading, verify the file is accessible by checking the public URL in a browser. The code will automatically use the Supabase URL once the file is in place.

