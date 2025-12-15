# Texture System Fix Plan

## Executive Summary

The texture system breaks because:
1. **Dependency on Prodigi API images** - Textures were discovered from Prodigi product images, creating a fragile dependency
2. **Missing texture files** - Many textures don't exist locally or in Supabase
3. **Poor error handling** - Errors crash the 3D preview instead of gracefully degrading
4. **URL generation issues** - Supabase URL generation had duplicate prefix (now fixed)

## Root Cause Analysis

### 1. Texture Discovery Problem
- **Issue**: Textures were discovered from Prodigi product images when 3D preview was added
- **Problem**: This created a dependency on Prodigi API responses
- **Impact**: When Prodigi API changes or products are unavailable, textures break
- **Solution**: Use Prodigi API for **configuration discovery** only, not texture discovery

### 2. Missing Texture Files
- **Issue**: Many texture files don't exist locally or in Supabase
- **Problem**: System tries to load textures that don't exist
- **Impact**: 400 errors, broken 3D preview
- **Solution**: 
  - Upload all existing textures to Supabase
  - Implement robust fallback to color-based materials
  - Pre-validate texture paths before loading

### 3. Error Handling
- **Issue**: `useProdigiTexture` throws errors when textures fail
- **Problem**: ErrorBoundary catches errors but doesn't gracefully degrade
- **Impact**: 3D preview crashes instead of showing fallback materials
- **Solution**: Never throw errors - always fall back to color-based materials

## Configuration Dependencies

### Product Type → Available Options

```
framed-print
  ├── frameStyle (classic, box, aluminium, etc.)
  ├── frameColor (black, white, brown, etc.)
  ├── glaze (acrylic, glass, motheye, none)
  ├── mount (none, 1.4mm, 2.0mm, 2.4mm)
  ├── mountColor (black, white, off-white, etc.)
  ├── paperType (enhanced-matte, lustre, etc.)
  └── finish (matte, gloss, lustre)

canvas
  ├── wrap (Black, White, ImageWrap, MirrorWrap)
  ├── edge (19mm, 38mm)
  └── paperType (Standard canvas (SC))

framed-canvas
  ├── frameStyle (classic, box, etc.)
  ├── frameColor (black, white, etc.)
  └── wrap (Black, White, ImageWrap, MirrorWrap)

acrylic / metal
  └── finish (gloss, matte)

poster
  └── (no frame options)
```

### Dependencies Between Options

1. **Frame Style → Available Colors**
   - Classic: black, white, brown, natural, dark-grey, light-grey, gold, silver
   - Aluminium: black, silver, gold (limited colors)
   - Box: black, white, natural (limited colors)

2. **Product Type → Frame Options**
   - `canvas`: No frame, no glaze, no mount
   - `framed-canvas`: Frame + wrap, no glaze, no mount
   - `framed-print`: Frame + glaze + mount, no wrap
   - `acrylic/metal`: No frame, no glaze, no mount, no wrap

3. **Size → Aspect Ratio**
   - Landscape: 16x20, 20x30, 24x32, etc.
   - Portrait: 20x16, 30x20, 32x24, etc.
   - Square: 16x16, 20x20, 24x24, etc.

## Fix Plan

### Phase 1: Immediate Fixes (Do Now)

1. **Fix Error Handling in useProdigiTexture**
   - Never throw errors
   - Always return fallback materials
   - Log warnings instead of errors

2. **Upload Missing Textures**
   - Run upload script to sync all textures to Supabase
   - Verify URL generation is correct (already fixed)

3. **Implement Texture Validation**
   - Pre-validate texture paths before loading
   - Check both local and Supabase storage
   - Cache validation results

### Phase 2: Decouple from Prodigi Images (This Week)

1. **Separate Configuration from Textures**
   - Use Prodigi API for configuration discovery (what options are available)
   - Maintain local texture library independent of API
   - Use `frame-texture-config.ts` for material properties

2. **Robust Fallback System**
   - Always fall back to color-based materials when textures fail
   - Use material properties from `frame-texture-config.ts`
   - Never show errors to users

3. **Texture Library Management**
   - Maintain complete texture library locally
   - Upload to Supabase for CDN delivery
   - Don't depend on Prodigi API for texture discovery

### Phase 3: Long-term Improvements (Next Sprint)

1. **Texture Preloading**
   - Preload common textures on app start
   - Cache loaded textures
   - Show loading states gracefully

2. **Texture Generation Pipeline**
   - Automated texture processing from Prodigi assets
   - Generate missing textures from color/material properties
   - Validate all texture paths

3. **Configuration Testing**
   - Automated tests for all configuration combinations
   - Validate Prodigi API responses
   - Test texture loading for all frame types/colors

## Implementation Details

### 1. Fix useProdigiTexture Hook

```typescript
// Current: Throws errors
const loadedTexturesRaw = useTexture(textureKeys.length > 0 ? textureKeys : []);

// Fixed: Never throw, always fallback
try {
  const loadedTexturesRaw = useTexture(textureKeys.length > 0 ? textureKeys : []);
  // ... process textures
} catch (error) {
  console.warn('Texture loading failed, using fallback:', error);
  // Return fallback materials
}
```

### 2. Texture Path Validation

```typescript
function validateTexturePath(path: string): boolean {
  // Check local first
  if (fileExistsLocally(path)) return true;
  
  // Check Supabase (async)
  // Cache result
  return false;
}
```

### 3. Configuration Discovery (Not Texture Discovery)

```typescript
// Use Prodigi API to discover available options
const availableOptions = await facetService.getAvailableOptions(
  productType,
  country,
  filters
);

// Use local texture library (not Prodigi images)
const texturePath = getTexturePath({ frameType, color, mapType });
```

## Testing Plan

1. **Test All Configuration Combinations**
   - Run `analyze-configuration-dependencies.ts`
   - Verify all product types work
   - Check all frame style/color combinations

2. **Test Texture Loading**
   - Run `analyze-texture-issues.ts`
   - Verify all textures load or fallback gracefully
   - Check Supabase URLs are correct

3. **Test Error Scenarios**
   - Missing textures
   - Prodigi API failures
   - Network errors
   - Invalid configurations

## Success Criteria

✅ All configurations work without errors
✅ Textures load or gracefully fallback
✅ No dependency on Prodigi images for textures
✅ 3D preview never crashes
✅ All texture paths validated
✅ Configuration options adapt correctly

## Next Steps

1. Fix `useProdigiTexture` error handling
2. Upload all textures to Supabase
3. Implement texture validation
4. Test all configuration combinations
5. Document texture library structure

