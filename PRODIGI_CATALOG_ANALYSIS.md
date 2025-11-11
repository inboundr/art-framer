# Prodigi Catalog Analysis

## Overview

This document explains how the Prodigi catalog is structured and how to properly fetch and parse frame options (colors, sizes, materials) from their API.

## Current Issue

The Frame Preview currently shows limited options because we use a **hardcoded array** with:
- **Black frames**: 4 sizes (small, medium, large, extra_large) ✅
- **White frames**: 1 size (medium only) ❌
- **Natural frames**: 2 sizes (medium, large) ❌  
- **Gold frames**: 1 size (medium only) ❌
- **Silver frames**: 1 size (medium only) ❌

**This doesn't match the actual Prodigi catalog!**

## Prodigi API Structure

### 1. Products Endpoint

**Endpoint**: `https://api.prodigi.com/v4.0/Products`

**Alternative (Search Index)**: `https://pwintylive.search.windows.net/indexes/live-catalogue/docs`

### 2. Product Attributes

Each product in the Prodigi catalog has these key attributes:

```json
{
  "sku": "global-fra-can-30x40-blk-blk",
  "destinationCountries": ["US", "CA", "GB", ...],
  "category": "Wall art",
  "description": "Framed Canvas 30x40cm Black/Black",
  "productType": "Framed canvas",
  "frameColour": ["black"],  // ⭐ Frame color
  "size": ["30x40"],         // ⭐ Size
  "frame": ["standard"],     // ⭐ Frame type
  "paperType": ["canvas"],
  "wrap": ["black"],         // ⭐ Canvas wrap color
  "basePriceFrom": 4500.0,
  "priceCurrency": "GBP",
  "fullProductHorizontalDimensions": 30.0,
  "fullProductVerticalDimensions": 40.0,
  "sizeUnits": "cm"
}
```

### 3. Frame-Related Attributes

| Attribute | Values | Description |
|-----------|--------|-------------|
| `frameColour` | `["black", "white", "natural", "oak", "walnut"]` | Frame color options |
| `size` | `["20x25", "30x40", "40x50", "50x70"]` | Product size in cm |
| `frame` | `["standard", "float"]` | Frame style/type |
| `wrap` | `["black", "white", "mirror"]` | Canvas wrap option (for framed canvas) |
| `glaze` | `["gloss", "no glaze"]` | Glass/acrylic option |
| `mount` | `["yes", "no"]` | Mount/mat option |
| `mountColour` | `["white", "black", "ivory"]` | Mount color if applicable |

### 4. SKU Naming Convention

Prodigi uses different SKU patterns for different product types:

#### Framed Canvas (FRA-CAN)
```
global-fra-can-{size}-{frameColor}-{wrapColor}
Example: global-fra-can-30x40-blk-blk
         (30x40cm, black frame, black wrap)
```

#### Framed Art Print (FAP)
```
global-fap-{size}-{frameColor}-{glaze}-{mount}
Example: global-fap-30x40-blk-no-yes
         (30x40cm, black frame, no glaze, with mount)
```

#### Canvas Print (CAN)
```
global-can-{size}-{wrapColor}
Example: global-can-30x40-blk
         (30x40cm canvas, black wrap, no frame)
```

## How to Extract Frame Options

### Step 1: Fetch All Frame Products

Filter by category or product type:

```typescript
// Option 1: Using Prodigi API
const response = await fetch('https://api.prodigi.com/v4.0/Products', {
  headers: {
    'X-API-Key': process.env.PRODIGI_API_KEY
  }
});

// Option 2: Using Search Index (what Prodigi dashboard uses)
const response = await fetch(
  'https://pwintylive.search.windows.net/indexes/live-catalogue/docs?api-version=2016-09-01' +
  '&$filter=destinationCountries/any(c: c eq \'US\')' +
  '&search=*' +
  '&$top=1000',
  {
    headers: {
      'api-key': '9142D85CE18C3AE0349B1FB21956B072'
    }
  }
);

const data = await response.json();
const products = data.value || data.products;
```

### Step 2: Filter Frame Products

```typescript
const frameProducts = products.filter(product => {
  return (
    product.category === 'Wall art' &&
    (product.productType === 'Framed canvas' || 
     product.productType === 'Framed prints' ||
     product.sku.includes('fra-can') ||
     product.sku.includes('fap'))
  );
});
```

### Step 3: Extract Unique Options

```typescript
// Extract all unique frame colors
const frameColors = new Set<string>();
frameProducts.forEach(product => {
  if (product.frameColour && Array.isArray(product.frameColour)) {
    product.frameColour.forEach(color => frameColors.add(color));
  }
});

// Extract all unique sizes
const sizes = new Set<string>();
frameProducts.forEach(product => {
  if (product.size && Array.isArray(product.size)) {
    product.size.forEach(size => sizes.add(size));
  }
});

// Create a matrix of available combinations
const availableCombinations = frameProducts.map(product => ({
  sku: product.sku,
  frameColor: product.frameColour?.[0],
  size: product.size?.[0],
  wrapColor: product.wrap?.[0],
  price: product.basePriceFrom,
  dimensions: {
    width: product.fullProductHorizontalDimensions,
    height: product.fullProductVerticalDimensions,
    unit: product.sizeUnits
  }
}));
```

### Step 4: Map to Our Format

```typescript
interface FrameOption {
  size: 'small' | 'medium' | 'large' | 'extra_large';
  style: string; // 'black', 'white', 'natural', etc.
  material: string;
  price: number;
  sku: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
}

function mapProdigiToFrameOption(prodigiProduct): FrameOption {
  const sizeMap = {
    '20x25': 'small',
    '30x40': 'medium', 
    '40x50': 'large',
    '50x70': 'extra_large'
  };
  
  return {
    size: sizeMap[prodigiProduct.size?.[0]] || 'medium',
    style: prodigiProduct.frameColour?.[0] || 'black',
    material: prodigiProduct.paperType?.[0] === 'canvas' ? 'canvas' : 'paper',
    price: (prodigiProduct.basePriceFrom / 100) * 1.5, // Convert from pence, add markup
    sku: prodigiProduct.sku,
    dimensions: {
      width: prodigiProduct.fullProductHorizontalDimensions,
      height: prodigiProduct.fullProductVerticalDimensions,
      depth: 3 // Default depth in cm
    }
  };
}
```

## Available Frame Colors in Prodigi

Based on the catalog analysis, Prodigi actually offers:

### Frame Colors (frameColour)
- `black` - Black frame ✅
- `white` - White frame ✅
- `natural` - Natural wood ✅
- `oak` - Oak wood finish ✅
- `walnut` - Walnut wood finish ✅
- `gold fitting` - Gold metal ⚠️ (limited products)
- `silver fitting` - Silver metal ⚠️ (limited products)

### Common Sizes (size)
- `20x25` (cm) → Small
- `30x40` (cm) → Medium
- `40x50` (cm) → Large  
- `50x70` (cm) → Extra Large
- `60x80` (cm) → XXL
- Many more sizes available!

## Solution Implementation

### 1. Create Dynamic Frame Catalog Service

```typescript
// src/lib/prodigi-frame-catalog.ts
export class ProdigiFrameCatalog {
  async getFrameOptions(): Promise<FrameOption[]> {
    // Fetch all frame products
    const products = await this.fetchFrameProducts();
    
    // Map to our format
    const options = products.map(mapProdigiToFrameOption);
    
    // Group by color and size
    return this.organizeOptions(options);
  }
  
  async getAvailableCombinations(): Promise<Map<string, Set<string>>> {
    // Returns map of: frameColor -> Set of available sizes
    const products = await this.fetchFrameProducts();
    const combinations = new Map<string, Set<string>>();
    
    products.forEach(product => {
      const color = product.frameColour?.[0];
      const size = product.size?.[0];
      
      if (color && size) {
        if (!combinations.has(color)) {
          combinations.set(color, new Set());
        }
        combinations.get(color)!.add(size);
      }
    });
    
    return combinations;
  }
}
```

### 2. Update Frame Selector

Replace hardcoded `FRAME_OPTIONS` array with dynamic fetching:

```typescript
// Before: Hardcoded array
const FRAME_OPTIONS: FrameOption[] = [
  { size: 'small', style: 'black', ... },
  // Only 10 options!
];

// After: Dynamic fetching
const { frameOptions, loading } = useProdigiFrameOptions();
// Now has ALL available combinations from Prodigi!
```

## Testing

### 1. Test Frame Catalog Fetching

```bash
npm run test:prodigi-catalog
```

### 2. Verify All Color-Size Combinations

```typescript
const catalog = new ProdigiFrameCatalog();
const combinations = await catalog.getAvailableCombinations();

console.log('Available combinations:');
combinations.forEach((sizes, color) => {
  console.log(`${color}: ${[...sizes].join(', ')}`);
});

// Expected output:
// black: 20x25, 30x40, 40x50, 50x70
// white: 20x25, 30x40, 40x50, 50x70
// natural: 30x40, 40x50
// oak: 30x40, 40x50
// walnut: 30x40, 40x50
```

## Next Steps

1. ✅ Create `ProdigiFrameCatalog` service
2. ✅ Add API endpoint `/api/prodigi/frame-catalog`
3. ✅ Update `FrameSelector` to use dynamic options
4. ✅ Add caching for catalog data
5. ✅ Update tests to verify all combinations

## References

- [Prodigi API Documentation](https://www.prodigi.com/print-api/docs/reference/)
- [Prodigi Search Index](https://pwintylive.search.windows.net/) (used by their dashboard)
- Product Categories: Wall art, Prints & posters, Framed canvas, Framed prints

