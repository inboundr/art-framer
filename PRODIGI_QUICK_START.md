# Prodigi Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Import the Service

```typescript
import { prodigiService } from '@/lib/prodigi';
// or specific functions:
import { 
  searchProducts, 
  getFrameRecommendations, 
  getAllFrames,
  getFilterFacets 
} from '@/lib/prodigi';
```

### 2. Search for Products

```typescript
// Simple search
const result = await prodigiService.search({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black', 'white'],
});

console.log(`Found ${result.totalCount} products`);
```

### 3. Get AI Recommendations

```typescript
// For an uploaded image
const recommendations = await prodigiService.getImageRecommendations(
  {
    width: 3000,
    height: 4000,
    dpi: 300,
  },
  'US',
  { budget: { min: 50, max: 200 } },
  5 // top 5
);

recommendations.forEach(rec => {
  console.log(`${rec.product.description}: ${rec.matchScore}/100`);
  console.log(`Why: ${rec.matchReasons[0]}`);
});
```

### 4. Get Filter Options

```typescript
// Get available filters with counts
const facets = await prodigiService.getFacets({
  country: 'US',
  category: 'Wall art',
});

console.log('Frame Colors:');
facets.frameColors.forEach(color => {
  console.log(`- ${color.label}: ${color.count} products`);
});
```

---

## 📋 Common Patterns

### Pattern 1: Image Upload → Recommendations

```typescript
// User uploads image
const file = event.target.files[0];
const img = new Image();
img.src = URL.createObjectURL(file);

await img.decode();

// Get recommendations
const recs = await prodigiService.getImageRecommendations(
  {
    width: img.width,
    height: img.height,
    dpi: 300, // or calculate from file metadata
  },
  'US'
);

// Show top 3 to user
setRecommendations(recs.slice(0, 3));
```

### Pattern 2: Progressive Filtering

```typescript
// Step 1: Initial facets
const [filters, setFilters] = useState({ country: 'US', category: 'Wall art' });
const [facets, setFacets] = useState(null);

useEffect(() => {
  prodigiService.getFacets(filters).then(setFacets);
}, [filters]);

// Step 2: User selects frame color
const handleColorSelect = (color: string) => {
  setFilters(prev => ({
    ...prev,
    frameColors: [...(prev.frameColors || []), color],
  }));
  // Facets auto-update via useEffect
};
```

### Pattern 3: Search with Pagination

```typescript
const [page, setPage] = useState(0);
const pageSize = 20;

const result = await prodigiService.search({
  country: 'US',
  category: 'Wall art',
}, {
  top: pageSize,
  skip: page * pageSize,
});

// result.products contains current page
// result.totalCount for total pages
```

### Pattern 4: Product Details

```typescript
// Get single product
const product = await prodigiService.getProductBySku('GLOBAL-CFPM-16X20', 'US');

console.log(product.description);
console.log(`Price: ${product.basePriceFrom / 100} ${product.priceCurrency}`);
console.log(`Colors: ${product.frameColour?.join(', ')}`);
```

---

## 🎯 Filter Cheat Sheet

### All Available Filters

```typescript
interface Filters {
  // Required
  country: string; // 'US', 'CA', 'GB', 'AU', etc.
  
  // Optional
  category?: string; // 'Wall art', 'Apparel', etc.
  
  // Frame
  frameColors?: string[]; // ['black', 'white', 'natural', ...]
  frameStyles?: string[]; // ['classic', 'float', 'box', ...]
  
  // Glazing
  glazes?: string[]; // ['acrylic / perspex', 'float glass', ...]
  
  // Mounts
  mounts?: string[]; // ['1.4mm', '2.0mm', '2.4mm']
  mountColors?: string[]; // ['snow white', 'black', ...]
  
  // Materials
  paperTypes?: string[]; // ['sc', 'mc', 'ema', ...]
  finishes?: string[]; // ['gloss', 'matte', 'lustre']
  
  // Size
  minDimensionMm?: number;
  maxDimensionMm?: number;
  sizeCategory?: 'small' | 'medium' | 'large' | 'extra-large';
  
  // Aspect Ratio
  aspectRatioMin?: number;
  aspectRatioMax?: number;
  orientation?: 'portrait' | 'square' | 'landscape';
}
```

### Quick Filters

```typescript
// Portrait frames
{ aspectRatioMin: 0, aspectRatioMax: 95 }

// Square frames
{ aspectRatioMin: 95, aspectRatioMax: 105 }

// Landscape frames
{ aspectRatioMin: 105, aspectRatioMax: 999 }

// Large frames
{ minDimensionMm: 700, maxDimensionMm: 1000 }

// Budget-friendly (under $100)
// Filter results by: product.basePriceFrom < 10000 (in pence)
```

---

## 💡 Pro Tips

### 1. Use Facets for Dynamic UI

```typescript
// Always get facets to show available options
const result = await prodigiService.search(filters, { includeFacets: true });

// Disable options with 0 products
<button disabled={facet.count === 0}>
  {facet.label} ({facet.count})
</button>
```

### 2. Cache User Preferences

```typescript
// Save user's budget/style preferences
const preferences = {
  budget: { min: 50, max: 200 },
  style: 'modern',
  priority: 'quality',
};

localStorage.setItem('framePreferences', JSON.stringify(preferences));

// Use in recommendations
const recs = await prodigiService.getImageRecommendations(
  imageData,
  country,
  preferences
);
```

### 3. Show Match Confidence

```typescript
recommendations.forEach(rec => {
  const confidencePercent = (rec.confidence * 100).toFixed(0);
  const confidenceColor = rec.confidence > 0.8 ? 'green' : 
                          rec.confidence > 0.6 ? 'yellow' : 'red';
  
  console.log(`${rec.product.description}`);
  console.log(`Match: ${rec.matchScore}/100 (${confidencePercent}% confident)`);
});
```

### 4. Explain Recommendations

```typescript
// Show user WHY this product is recommended
<div className="match-reasons">
  {recommendation.matchReasons.map(reason => (
    <div key={reason} className="reason">
      ✓ {reason}
    </div>
  ))}
</div>
```

---

## 🌐 API Endpoint Quick Reference

### POST `/api/prodigi/catalog/search`

```javascript
fetch('/api/prodigi/catalog/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filters: {
      country: 'US',
      category: 'Wall art',
      frameColors: ['black'],
    },
    options: {
      top: 20,
      includeFacets: true,
    },
  }),
});
```

### POST `/api/prodigi/catalog/recommendations`

```javascript
fetch('/api/prodigi/catalog/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageData: {
      width: 3000,
      height: 4000,
      dpi: 300,
    },
    country: 'US',
    topN: 5,
  }),
});
```

### GET `/api/prodigi/catalog/products/[sku]?country=US`

```javascript
fetch('/api/prodigi/catalog/products/GLOBAL-CFPM-16X20?country=US');
```

---

## 🔍 Type Imports

```typescript
import type {
  ProdigiCatalogProduct,
  ProdigiSearchFilters,
  SearchResult,
  ProcessedFacets,
  ProductMatch,
  ImageAnalysisData,
  UserPreferences,
} from '@/lib/prodigi';
```

---

## ✅ Checklist for Integration

- [ ] Import `prodigiService` from `@/lib/prodigi`
- [ ] Create filter state with `country` required
- [ ] Call `search()` or `getFacets()` on filter changes
- [ ] Display products with key info (description, price, colors)
- [ ] Show facet counts next to filter options
- [ ] Disable unavailable filter combinations
- [ ] Implement image upload → recommendations flow
- [ ] Display match scores and reasons
- [ ] Add pagination for large result sets
- [ ] Cache user preferences for better recommendations

---

## 🚀 You're Ready!

Start building your UI with these simple patterns. All the complex logic is handled by the service.

**Happy coding! 🎨**

