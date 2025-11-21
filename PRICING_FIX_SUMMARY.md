# Frame Pricing & Dimensions Fix Summary

## Problems Identified

### Problem 1: Same Price for All Configurations
The `/api/frames/images` endpoint was returning the same SKU (`GLOBAL-FAP-11X14`) and price ($14) regardless of the frame configuration parameters (size, style, material).

### Problem 2: Dimensions Always Zero
The same endpoint was returning dimensions with width and height as 0:
```json
{
  "dimensions": {
    "width": 0,
    "height": 0
  }
}
```

### Root Cause 1: Pricing

The `generateFrameSku()` function in `/src/lib/prodigi.ts` was only considering the **frame size** parameter and completely ignoring the **frameStyle** and **frameMaterial** parameters when selecting a product SKU.

### Root Cause 2: Dimensions

The `getProductDetails()` method was incorrectly trying to read a `dimensions` object directly from Prodigi's API:
```typescript
dimensions: productData.dimensions || { width: 0, height: 0 }
```

However, Prodigi doesn't return a `dimensions` object. Instead, it returns separate fields like `fullProductHorizontalDimensions`, `fullProductVerticalDimensions`, `productDepthMm`, and `sizeUnits`.

The function was using a simple size-based mapping:
- `small` → `GLOBAL-FAP-8X10`
- `medium` → `GLOBAL-FAP-11X14` (always returned for medium)
- `large` → `GLOBAL-FAP-16X24`
- `extra_large` → `GLOBAL-FRA-CAN-30X40`

This meant that all medium frames (regardless of gold/grey/white style or wood/bamboo/acrylic material) would return the same SKU and price.

## Solutions Implemented

### Pricing Fixes

#### 1. Enhanced `generateFrameSku()` Function

The function now:
1. **First Priority**: Queries the full Prodigi product catalog to find a product that matches ALL three parameters (size, style, AND material)
2. Uses a new `findMatchingProduct()` helper method that scores products based on:
   - Size match (weight: 3 points)
   - Style/color match (weight: 2 points)
   - Material match (weight: 1 point)
3. Returns the best matching product SKU (minimum 3 points required - at least size must match)
4. Falls back to the old behavior only if catalog search fails

#### 2. New Helper Method: `findMatchingProduct()`

This method:
- Filters products to only include frame products
- Matches size using diagonal calculation (same logic as ProdigiFrameCatalog)
- Matches style by normalizing color names (black, white, grey, gold, natural, etc.)
- Matches material by checking SKU patterns and product types
- Returns the product with the highest match score

#### 3. New Helper Method: `normalizeColorForMatching()`

Normalizes color names for consistent matching:
- `blk`, `black` → `black`
- `wht`, `white` → `white`
- `gray`, `grey`, `light grey` → `grey`
- `oak`, `walnut`, `nat` → `natural`
- etc.

### Dimensions Fixes

#### 4. Fixed `getProductDetails()` Method

Updated dimensions extraction to properly map Prodigi's fields:
```typescript
const dimensions = {
  width: productData.fullProductHorizontalDimensions || productData.dimensions?.width || 0,
  height: productData.fullProductVerticalDimensions || productData.dimensions?.height || 0,
  depth: productData.productDepthMm ? productData.productDepthMm / 10 : (productData.dimensions?.depth || 2),
  unit: productData.sizeUnits || 'cm'
};
```

#### 5. Fixed `tryAlternativeSku()` Method

Applied the same dimensions fix to the alternative SKU lookup path.

#### 6. Enhanced `getAllProducts()` Method

Added `unit` field to dimensions in search index results.

#### 7. Updated `ProdigiProduct` Interface

Added `unit?: string` field to dimensions type definition.

## Frontend Pricing (Already Working)

The frontend `FrameSelector` component was **already working correctly**:
1. It uses `useProdigiFrameCatalog()` hook which caches ALL products from Prodigi
2. When user changes configuration, it filters `FRAME_OPTIONS` based on ALL three parameters
3. Displays the price from the matched product in the cache
4. Updates immediately when configuration changes

The issue was ONLY with the `/api/frames/images` endpoint, which is now fixed.

## Testing

### Manual Testing via curl

Test different configurations and verify each returns a different SKU and price:

```bash
# Test 1: Medium Gold Wood
curl 'http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=gold&frameMaterial=wood'

# Test 2: Medium Gold Bamboo  
curl 'http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=gold&frameMaterial=bamboo'

# Test 3: Medium Grey Wood
curl 'http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=grey&frameMaterial=wood'

# Test 4: Medium Grey Acrylic
curl 'http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=grey&frameMaterial=acrylic'

# Test 5: Large Black Canvas
curl 'http://localhost:3000/api/frames/images?frameSize=large&frameStyle=black&frameMaterial=canvas'
```

### Expected Results

Each request should now return:
- A **different SKU** that matches the specified configuration
- A **different price** based on the actual product pricing (not always $14)
- **Non-zero dimensions** with actual width, height, depth, and unit
- Example response:
```json
{
  "success": true,
  "frame": {
    "sku": "GLOBAL-FRA-CAN-30X40-GOLD",
    "name": "30x40cm Gold Canvas Frame",
    "price": 118.27,
    "dimensions": {
      "width": 30,
      "height": 40,
      "depth": 2.5,
      "unit": "cm"
    }
  }
}
```

### Frontend Testing

1. Navigate to the frame selector in the UI
2. Select a frame size (e.g., Medium)
3. Change the frame style (Black → Gold → Grey → White)
4. Observe that the **price updates** for each style
5. Change the frame material (Wood → Bamboo → Canvas → Acrylic)
6. Observe that the **price updates** for each material

## Technical Details

### Files Modified

1. `/src/lib/prodigi.ts`:
   - **Pricing fixes:**
     - Enhanced `generateFrameSku()` method
     - Added `findMatchingProduct()` method
     - Added `normalizeColorForMatching()` method
   - **Dimensions fixes:**
     - Updated `ProdigiProduct` interface
     - Fixed `getProductDetails()` method
     - Fixed `tryAlternativeSku()` method
     - Enhanced `getAllProducts()` method

### No Breaking Changes

- The function signature remains the same
- Fallback behavior ensures backward compatibility
- Frontend code requires no changes (was already working)

## Performance Considerations

- The catalog query is cached by Prodigi client (1-hour cache)
- First call may be slower (fetches catalog)
- Subsequent calls are fast (uses cached catalog)
- The old size-based fallback is still available if catalog fails

## Deployment Notes

1. No database migrations required
2. No environment variable changes needed
3. Build succeeds with no TypeScript errors
4. All existing functionality preserved
5. API now returns correct prices for all frame configurations

## Monitoring

After deployment, monitor:
- `/api/frames/images` endpoint response times
- Ensure different configurations return different SKUs
- Verify prices match Prodigi catalog
- Check logs for any "No suitable match found" warnings

## Related Files

- `/src/lib/prodigi.ts` - Main fix
- `/src/lib/prodigi-frame-catalog.ts` - Catalog fetching (unchanged)
- `/src/app/api/frames/images/route.ts` - API endpoint (unchanged, uses fixed function)
- `/src/components/FrameSelector.tsx` - Frontend component (already working correctly)
- `/src/hooks/useFrameImages.ts` - Hook for fetching frame details (unchanged)

## Future Improvements

1. Add caching at the API route level to reduce catalog queries
2. Consider pre-warming the catalog cache on server startup
3. Add comprehensive integration tests for all frame combinations
4. Add telemetry to track which frame configurations are most popular

