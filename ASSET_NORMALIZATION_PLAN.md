# Asset Name Normalization Plan

## Standard Naming Convention

### Mount Textures
**Pattern**: `{color}-mount.webp`
- `black-mount.webp` ✅
- `snow-white-mount.webp` ✅
- `off-white-mount.webp` ✅

### Frame Textures
**Pattern**: `{color}-{maptype}-{resolution}.webp`
- `black-diffuse-1x.webp` ✅
- `white-diffuse-1x.webp` ✅
- etc.

### Canvas Textures
**Pattern**: `{name}.webp`
- `substrate.webp` ✅
- `blank.webp` ✅

### Canvas Wraps
**Pattern**: `{color}-wrap.webp`
- `black-wrap.webp` ✅
- `white-wrap.webp` ✅
- `image-wrap.webp` ✅
- `mirror-wrap.webp` ✅

## Files That Need Normalization

### Mount Textures (Critical - Used by Code)
1. ✅ `Black mount.jpg` → `black-mount.webp` (DONE)
2. ✅ `Off-white mount.jpg` → `off-white-mount.webp` (DONE)
3. ✅ `Snow white mount.jpg` → `snow-white-mount.webp` (DONE)

### Files to Remove/Move (Not Mount Textures)
- `Classic black framed print corner no mount.jpg` - This is a lifestyle image, not a mount texture
- `Classic white framed print flat no mount.jpg` - This is a lifestyle image, not a mount texture

These should be moved to `prodigi-assets-extracted/` or removed if duplicates exist.

## Code References to Update

### Files Using Mount Textures
1. `src/lib/prodigi-textures/texture-mapper.ts` - `getMountTexturePath()` ✅ (Already uses mapping)
2. `src/lib/prodigi-assets/asset-catalog.ts` - `getMountSampleImage()` (needs update)
3. `src/hooks/useMountTexture.ts` - Uses `getMountTexturePath()` ✅ (No changes needed)

### Files Using Frame Textures
1. `src/lib/prodigi-textures/texture-mapper.ts` - `getTexturePath()` ✅ (Already normalized)

### Files Using Canvas Textures
1. `src/lib/prodigi-textures/texture-mapper.ts` - `getCanvasTexturePath()` ✅ (Already normalized)

## Implementation Steps

1. ✅ Normalize mount texture names in Supabase
2. ✅ Update code references
3. ⏭️ Clean up non-mount files from mounts folder
4. ⏭️ Verify all references work
5. ⏭️ Update local files to match

