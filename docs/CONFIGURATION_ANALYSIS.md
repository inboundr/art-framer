# Configuration System Analysis & Fix Plan

## Git Changes Summary

### Modified Files
1. **Configuration System** (`src/store/studio.ts`, `src/components/studio/ContextPanel/ConfigurationSummary.tsx`)
   - Added aspect ratio filtering
   - Dynamic option adaptation based on product type
   - Country-based option filtering

2. **Texture System** (`src/lib/prodigi-assets/supabase-assets.ts`, `src/lib/prodigi-textures/texture-mapper.ts`)
   - Fixed Supabase URL generation (duplicate prefix issue)
   - Texture path normalization

3. **Pricing/Shipping** (`src/lib/checkout/services/pricing.service.ts`, `src/lib/checkout/services/shipping.service.ts`)
   - Attribute normalization
   - Improved error handling
   - Real-time pricing from Prodigi

4. **Frame Styles** (`src/lib/prodigi-v2/azure-search/facet-service.ts`)
   - Process frame styles to remove duplicates
   - Filter by product type

## Configuration Dependencies Map

```
Product Type: framed-print
├── Frame Style (classic, box, aluminium, etc.)
│   └── Frame Color (depends on style)
│       ├── classic: black, white, brown, natural, dark-grey, light-grey, gold, silver
│       ├── aluminium: black, silver, gold (limited)
│       └── box: black, white, natural (limited)
├── Glaze (acrylic, glass, motheye, none)
│   └── Depends on frame style
├── Mount (none, 1.4mm, 2.0mm, 2.4mm)
│   └── Mount Color (black, white, off-white, snow-white)
│       └── Depends on mount selection
├── Paper Type (enhanced-matte, lustre, etc.)
│   └── Depends on product type
├── Finish (matte, gloss, lustre)
│   └── Depends on paper type
└── Size
    └── Aspect Ratio (Portrait, Landscape, Square)
        └── Filters available sizes

Product Type: canvas
├── Wrap (Black, White, ImageWrap, MirrorWrap)
├── Edge (19mm, 38mm)
└── Paper Type (Standard canvas (SC))

Product Type: framed-canvas
├── Frame Style (classic, box, etc.)
├── Frame Color (depends on style)
└── Wrap (Black, White, ImageWrap, MirrorWrap)

Product Type: acrylic / metal
└── Finish (gloss, matte)

Product Type: poster
└── (no frame options)
```

## Texture System Issues

### Root Causes

1. **Dependency on Prodigi Images**
   - Textures were discovered from Prodigi product images
   - Creates fragile dependency on API responses
   - When Prodigi API changes, textures break

2. **Missing Texture Files**
   - Many textures don't exist locally or in Supabase
   - System tries to load non-existent textures
   - Results in 400 errors

3. **Error Handling**
   - `useTexture` from drei uses Suspense and throws errors
   - ErrorBoundary catches but doesn't gracefully degrade
   - 3D preview crashes instead of showing fallback

4. **URL Generation** (Fixed)
   - Duplicate `prodigi-assets` prefix in Supabase URLs
   - Now fixed to strip prefix correctly

### Texture Coverage Analysis

From `analyze-texture-issues.ts`:
- **Classic frames**: ~75% coverage (most colors have 1x, missing some 2x)
- **Aluminium frames**: ~25% coverage (only black, gold, silver have 1x)
- **Box frames**: ~0% coverage (no textures exist)
- **Spacer/Float frames**: Unknown coverage

## Fix Plan

### Phase 1: Immediate (Do Now)

1. **Fix Error Handling**
   - Wrap texture loading in Suspense with ErrorBoundary
   - Always provide fallback materials
   - Never crash on texture loading failures

2. **Upload Missing Textures**
   - Run upload script to sync all textures to Supabase
   - Verify URL generation is correct

3. **Implement Graceful Degradation**
   - Always fall back to color-based materials
   - Use material properties from `frame-texture-config.ts`
   - Log warnings instead of errors

### Phase 2: Decouple (This Week)

1. **Separate Configuration from Textures**
   - Use Prodigi API for **configuration discovery** only
   - Maintain local texture library independent of API
   - Use `frame-texture-config.ts` for material properties

2. **Robust Fallback System**
   - Pre-validate texture paths before loading
   - Check both local and Supabase storage
   - Cache validation results

3. **Texture Library Management**
   - Maintain complete texture library locally
   - Upload to Supabase for CDN delivery
   - Don't depend on Prodigi API for texture discovery

### Phase 3: Long-term (Next Sprint)

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

## Testing Commands

```bash
# Test configuration dependencies
npx tsx scripts/analyze-configuration-dependencies.ts

# Test texture issues
npx tsx scripts/analyze-texture-issues.ts

# Upload textures to Supabase
npx tsx scripts/upload-prodigi-assets-to-supabase.ts
```

## Success Criteria

✅ All configurations work without errors
✅ Textures load or gracefully fallback
✅ No dependency on Prodigi images for textures
✅ 3D preview never crashes
✅ All texture paths validated
✅ Configuration options adapt correctly

