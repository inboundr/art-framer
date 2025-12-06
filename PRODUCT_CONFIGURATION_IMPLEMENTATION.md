# Product Configuration Implementation - Special Configurations

## Overview

The app now supports special product configurations that appear in specific cases, such as:
- **Slim Canvas** (19mm edge depth) - thinner canvas products
- **Standard Canvas** (38mm edge depth) - regular canvas products  
- **Eco Canvas** - eco-friendly canvas variants
- **Framed Slim Canvas** - framed canvas with slim edge

## Changes Made

### 1. Studio Configuration (`src/store/studio.ts`)
Added two new configuration fields:
```typescript
edge?: '19mm' | '38mm' | 'auto';  // Edge depth preference
canvasType?: 'standard' | 'slim' | 'eco' | 'auto';  // Canvas type preference
```

### 2. Products API (`src/app/api/products/route.ts`)
- Added `edge` and `canvasType` to `CreateProductSchema`
- Stores these preferences in `metadata` JSONB field
- Passes preferences to catalog service for SKU lookup

### 3. Catalog Service (`src/lib/prodigi-v2/catalog.ts`)
- Updated `getSKU()` to accept preferences parameter
- Scoring system now considers:
  - Edge preference: +30 for match, -20 for mismatch
  - Canvas type preference: +25 for match, -15 for mismatch
  - Exact size match: +50 bonus
- Cache key includes preferences to ensure correct SKU selection

### 4. UI Components (`src/components/studio/ContextPanel/ConfigurationSummary.tsx`)
- Added "Edge Depth" dropdown (19mm/38mm/auto) for canvas products
- Added "Canvas Type" dropdown (standard/slim/eco/auto) for canvas products
- Options only show for canvas and framed-canvas product types

### 5. Cart Service (`src/lib/checkout/services/cart.service.ts`)
- Reads `edge` from metadata and includes in `frameConfig`
- Preserves all configuration fields when building cart items

## How It Works

### User Flow
1. User selects "Framed Canvas" product type
2. User can optionally select:
   - **Edge Depth**: 19mm (slim) or 38mm (standard) or Auto
   - **Canvas Type**: Standard, Slim, Eco, or Auto
3. When "Add to Cart" is clicked:
   - Preferences are sent to products API
   - Catalog service uses preferences to find matching SKU
   - Product is created with correct SKU (e.g., `global-fra-slimcan-*` for slim)
   - Preferences stored in metadata

### SKU Selection Logic
```
If edge = '19mm' OR canvasType = 'slim':
  → Prefer SKUs with 'slimcan' or 'slim-can' in name
  → Prefer products with edge = '19mm'
  
If edge = '38mm' OR canvasType = 'standard':
  → Prefer SKUs without 'slimcan'
  → Prefer products with edge = '38mm'
  
If edge = 'auto' AND canvasType = 'auto':
  → Use default scoring (size match, production country, price)
```

## Example Scenarios

### Scenario 1: User wants Slim Framed Canvas
- Product Type: `framed-canvas`
- Edge: `19mm` OR Canvas Type: `slim`
- Result: SKU like `global-fra-slimcan-12x16-{imageId}`

### Scenario 2: User wants Standard Framed Canvas
- Product Type: `framed-canvas`
- Edge: `38mm` OR Canvas Type: `standard`
- Result: SKU like `global-fra-can-16x20-{imageId}`

### Scenario 3: Auto Selection
- Product Type: `framed-canvas`
- Edge: `auto`, Canvas Type: `auto`
- Result: Best available match based on size, production country, price

## Testing Checklist

- [ ] Test with `edge: '19mm'` → should get slim canvas SKU
- [ ] Test with `edge: '38mm'` → should get standard canvas SKU
- [ ] Test with `canvasType: 'slim'` → should get slimcan SKU
- [ ] Test with `canvasType: 'standard'` → should get regular canvas SKU
- [ ] Test with `edge: 'auto'` → should get best available match
- [ ] Verify preferences are stored in product metadata
- [ ] Verify cart displays correct product type
- [ ] Verify pricing is correct for each variant

## Future Enhancements

1. **Eco Canvas Support**: When eco canvas products are available, ensure they're properly identified and selectable
2. **Visual Indicators**: Show visual difference between 19mm and 38mm in 3D preview
3. **Price Comparison**: Show price difference between slim and standard variants
4. **Size Availability**: Some sizes may only be available in slim or standard - show availability

