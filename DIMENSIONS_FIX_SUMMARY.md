# Frame Dimensions Fix Summary

## Problem Identified

The `/api/frames/images` endpoint was returning dimensions with width and height as 0:

```json
{
  "dimensions": {
    "width": 0,
    "height": 0
  }
}
```

### Root Cause

The `getProductDetails()` method in `/src/lib/prodigi.ts` was incorrectly trying to read a `dimensions` object directly from the Prodigi API response:

```typescript
dimensions: productData.dimensions || { width: 0, height: 0 }
```

However, **Prodigi's API doesn't return a simple `dimensions` object**. Instead, it returns separate fields:
- `fullProductHorizontalDimensions` - Width of the product
- `fullProductVerticalDimensions` - Height of the product
- `productDepthMm` - Depth in millimeters
- `sizeUnits` - Unit of measurement (cm, in, mm)

Since `productData.dimensions` was always `undefined`, the fallback `{ width: 0, height: 0 }` was always used.

## Solution Implemented

### 1. Fixed `getProductDetails()` Method

Updated the dimensions extraction to properly map Prodigi's fields:

```typescript
// Map the Prodigi API response to our ProdigiProduct interface
// Prodigi uses separate fields for dimensions, not a single dimensions object
const dimensions = {
  width: productData.fullProductHorizontalDimensions || productData.dimensions?.width || 0,
  height: productData.fullProductVerticalDimensions || productData.dimensions?.height || 0,
  depth: productData.productDepthMm ? productData.productDepthMm / 10 : (productData.dimensions?.depth || 2), // Convert mm to cm
  unit: productData.sizeUnits || 'cm'
};

const product: ProdigiProduct = {
  // ... other fields
  dimensions: dimensions,
  // ... rest
};
```

### 2. Fixed `tryAlternativeSku()` Method

Applied the same fix to the alternative SKU path (used when primary SKU lookup fails):

```typescript
// Prodigi uses separate fields for dimensions, not a single dimensions object
const dimensions = {
  width: productData.fullProductHorizontalDimensions || productData.dimensions?.width || 0,
  height: productData.fullProductVerticalDimensions || productData.dimensions?.height || 0,
  depth: productData.productDepthMm ? productData.productDepthMm / 10 : (productData.dimensions?.depth || 2),
  unit: productData.sizeUnits || 'cm'
};
```

### 3. Enhanced `getAllProducts()` Method

Added the `unit` field to dimensions mapping in the search index results:

```typescript
dimensions: {
  width: result.fullProductHorizontalDimensions || 0,
  height: result.fullProductVerticalDimensions || 0,
  depth: result.productDepthMm ? result.productDepthMm / 10 : undefined,
  unit: result.sizeUnits || 'cm'  // ← Added this
},
```

### 4. Updated `ProdigiProduct` Interface

Added the `unit` field to the dimensions type:

```typescript
export interface ProdigiProduct {
  // ... other fields
  dimensions: {
    width: number;
    height: number;
    depth?: number;
    unit?: string; // Unit of measurement (cm, in, mm) ← Added this
  };
  // ... other fields
}
```

## Key Changes

### Files Modified

1. `/src/lib/prodigi.ts`:
   - Updated `ProdigiProduct` interface
   - Fixed `getProductDetails()` method (line ~322-342)
   - Fixed `tryAlternativeSku()` method (line ~394-414)
   - Enhanced `getAllProducts()` method (line ~631-636)

### No Breaking Changes

- The API response structure remains the same
- Only the values are now populated correctly
- All existing code that reads dimensions will now get proper values

## Testing

### Manual Testing via curl

Test that dimensions are now populated:

```bash
# Test Medium Gold Wood
curl 'http://localhost:3000/api/frames/images?frameSize=medium&frameStyle=gold&frameMaterial=wood'

# Expected response should now include:
# {
#   "dimensions": {
#     "width": 30,    // actual width in cm/in
#     "height": 40,   // actual height in cm/in
#     "depth": 2.5,   // actual depth in cm
#     "unit": "cm"    // unit of measurement
#   }
# }
```

### Expected Results

Each API call should now return:
- **Non-zero width**: Actual product width (e.g., 30, 40, 50)
- **Non-zero height**: Actual product height (e.g., 40, 50, 70)
- **Depth value**: Product depth in cm (e.g., 2, 2.5, 3)
- **Unit field**: Unit of measurement (typically "cm" or "in")

## Technical Details

### Dimension Unit Conversion

The fix includes proper unit handling:
- Depth is converted from millimeters to centimeters (`productDepthMm / 10`)
- Width and height use the original units from Prodigi
- Unit field preserves the measurement system (cm, in, mm)

### Fallback Behavior

If Prodigi fields are missing:
1. First tries `fullProductHorizontalDimensions` / `fullProductVerticalDimensions`
2. Falls back to `productData.dimensions?.width` / `height` (if somehow present)
3. Finally defaults to 0 if all else fails

For depth:
1. Converts `productDepthMm` if available
2. Tries `productData.dimensions?.depth`
3. Defaults to 2 cm as reasonable frame depth

## Related Issues

This fix complements the pricing fix implemented earlier:
- **Pricing fix**: Ensures correct SKU and price based on configuration
- **Dimensions fix**: Ensures correct dimensions for that SKU

Together, these fixes ensure the `/api/frames/images` endpoint returns complete and accurate product information.

## Build Status

✅ Build succeeds with no TypeScript errors
✅ No linter errors
✅ All type definitions properly updated

## Deployment Notes

1. No database migrations required
2. No environment variable changes needed
3. No frontend changes required
4. Backward compatible with existing API consumers

## Monitoring

After deployment, verify:
- `/api/frames/images` returns non-zero dimensions
- Dimensions match expected values for each frame size
- Unit field is populated correctly
- Depth values are reasonable (2-3 cm for most frames)

## Future Improvements

1. Add validation to ensure dimensions are within reasonable ranges
2. Cache dimension data along with pricing
3. Add unit conversion utilities if needed for display
4. Consider adding dimension-based filtering in frame selector

