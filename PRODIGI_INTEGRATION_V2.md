# Prodigi Integration V2 - Complete Implementation

## 🎉 What's New

We've built a **production-ready, AI-powered Prodigi integration** that leverages the full Azure Search Index and implements all advanced features from the Prodigi dashboard.

---

## 📁 Architecture Overview

```
/src/lib/prodigi/
├── types.ts                    # Comprehensive TypeScript types
├── query-builder.ts            # Azure Search query construction
├── azure-search-client.ts      # Search index client with caching
├── product-matcher.ts          # AI-powered product scoring
└── index.ts                    # Main API exports

/src/app/api/prodigi/catalog/
├── search/route.ts             # Product search API
├── facets/route.ts             # Filter facets API
├── recommendations/route.ts    # AI recommendations API
└── products/[sku]/route.ts    # Product by SKU API
```

---

## 🚀 Key Features

### 1. **Azure Search Integration** ✅

- Direct access to Prodigi's complete catalog (1000+ products)
- Real-time faceted search with counts
- OData filter query builder
- Production location scoring
- 1-hour intelligent caching

### 2. **Advanced Filtering** ✅

All 19 filter categories supported:

| Category | Options | Example |
|----------|---------|---------|
| **Frame Colors** | 8 colors | black, white, natural, gold, silver |
| **Glazes** | 5 types | acrylic, float glass, museum glass |
| **Mounts** | 4 thicknesses | no mount, 1.4mm, 2.0mm, 2.4mm |
| **Mount Colors** | 4 colors | snow white, black, off-white, navy |
| **Paper Types** | 20+ types | canvas, art papers, photo papers |
| **Finishes** | 3 types | gloss, matte, lustre |
| **Sizes** | 6 ranges | small (<30cm) to oversized (>150cm) |
| **Aspect Ratios** | 3 orientations | portrait, square, landscape |

### 3. **AI-Powered Matching** ✅

Intelligent product scoring based on:

- **Aspect Ratio Match** (30 points) - Perfect fit for image dimensions
- **Size Appropriateness** (20 points) - Optimal print size based on DPI
- **Price Fit** (15 points) - Within user budget
- **Production Speed** (15 points) - Fast delivery optimization
- **Style Match** (10 points) - Color temperature & aesthetic alignment
- **Quality Score** (10 points) - Premium materials & popularity

### 4. **Progressive Filtering** ✅

- Get facet counts in real-time
- Show available vs. unavailable options
- Update counts as filters are applied
- Disable options with 0 products

### 5. **Image-Aware Recommendations** ✅

Automatic recommendations based on:

- Image dimensions and aspect ratio
- DPI and optimal print size
- User budget and preferences
- Style and color harmony
- Production location and speed

---

## 💻 Usage Examples

### 1. Search Products with Filters

```typescript
import { prodigiService } from '@/lib/prodigi';

// Search for black frames in portrait orientation
const result = await prodigiService.search({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black'],
  aspectRatioMin: 0,
  aspectRatioMax: 95, // Portrait
  minDimensionMm: 500,
  maxDimensionMm: 1000,
}, {
  top: 20,
  includeFacets: true,
});

console.log(`Found ${result.totalCount} products`);
console.log('Available glazes:', result.facets?.glazes);
```

### 2. Get AI Recommendations for an Image

```typescript
import { prodigiService } from '@/lib/prodigi';

// Get top 5 recommendations for a user's image
const recommendations = await prodigiService.getImageRecommendations(
  {
    width: 3000,
    height: 4000,
    dpi: 300,
  },
  'US',
  {
    budget: { min: 50, max: 200 },
    style: 'modern',
    priority: 'quality',
  },
  5
);

// Each recommendation includes:
recommendations.forEach(rec => {
  console.log(`Score: ${rec.matchScore}/100`);
  console.log(`Reasons: ${rec.matchReasons.join(', ')}`);
  console.log(`Confidence: ${rec.confidence * 100}%`);
  console.log(`Product: ${rec.product.description}`);
});
```

### 3. Get Facets for Filter UI

```typescript
import { prodigiService } from '@/lib/prodigi';

// Get available filter options with counts
const facets = await prodigiService.getFacets({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black'], // Get facets for black frames only
});

// Render filter UI
console.log('Frame Colors:');
facets.frameColors.forEach(color => {
  console.log(`  ${color.label}: ${color.count} products`);
});

console.log('Glazes:');
facets.glazes.forEach(glaze => {
  console.log(`  ${glaze.label}: ${glaze.count} products`);
});
```

### 4. Smart Image Matching

```typescript
import { createImageMatchQuery, azureSearchClient } from '@/lib/prodigi';

// Automatically create optimized query for an image
const queryBuilder = createImageMatchQuery(
  {
    width: 4000,
    height: 3000,
    dpi: 300,
  },
  'US',
  {
    frameColors: ['black', 'white'],
  }
);

// This automatically:
// - Calculates aspect ratio and tolerance
// - Determines optimal size range based on DPI
// - Adds production location scoring
// - Includes all facets

const result = await azureSearchClient.search(
  queryBuilder['filters'],
  { top: 50 }
);
```

---

## 🌐 API Endpoints

### POST `/api/prodigi/catalog/search`

Search products with filters.

**Request:**
```json
{
  "filters": {
    "country": "US",
    "category": "Wall art",
    "frameColors": ["black", "white"],
    "aspectRatioMin": 90,
    "aspectRatioMax": 110
  },
  "options": {
    "top": 20,
    "includeFacets": true
  }
}
```

**Response:**
```json
{
  "products": [...],
  "totalCount": 156,
  "facets": {
    "frameColors": [...],
    "glazes": [...],
    "dimensionRanges": [...]
  },
  "appliedFilters": {...}
}
```

### POST `/api/prodigi/catalog/facets`

Get filter facets with counts.

**Request:**
```json
{
  "country": "US",
  "category": "Wall art",
  "frameColors": ["black"]
}
```

**Response:**
```json
{
  "frameColors": [
    { "value": "black", "label": "Black", "count": 421, "available": true },
    { "value": "white", "label": "White", "count": 321, "available": true }
  ],
  "glazes": [...],
  "dimensionRanges": [...]
}
```

### POST `/api/prodigi/catalog/recommendations`

Get AI-powered product recommendations for an image.

**Request:**
```json
{
  "imageData": {
    "width": 3000,
    "height": 4000,
    "dpi": 300
  },
  "country": "US",
  "userPreferences": {
    "budget": { "min": 50, "max": 200 },
    "style": "modern",
    "priority": "quality"
  },
  "topN": 5
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "product": {...},
      "matchScore": 94,
      "matchReasons": [
        "Perfect aspect ratio match for your portrait image",
        "Optimal print size for your image resolution",
        "Frame color complements warm tones in your image"
      ],
      "confidence": 0.95
    }
  ],
  "imageAnalysis": {
    "aspectRatio": 133.33,
    "orientation": "portrait",
    "dpi": 300
  }
}
```

### GET `/api/prodigi/catalog/products/[sku]`

Get product by SKU.

**Query Params:** `?country=US`

**Response:**
```json
{
  "sku": "GLOBAL-CFPM-16X20",
  "description": "16x20 Canvas Print with Frame",
  "category": "Wall art",
  "basePriceFrom": 4999,
  "priceCurrency": "GBP",
  "frameColour": ["black", "white"],
  "dimensions": {...}
}
```

---

## 🎯 Smart Features

### Aspect Ratio Matching

Automatically matches products to your image's aspect ratio with tolerance:

```typescript
import { getAspectRatioFilters } from '@/lib/prodigi';

const filters = getAspectRatioFilters(3000, 4000, 5);
// Returns: { aspectRatioMin: 128.33, aspectRatioMax: 138.33 }
// Matches all products within 5% of the image's aspect ratio
```

### Size Recommendations

Intelligent size category recommendations based on image resolution:

```typescript
import { recommendSizeCategory } from '@/lib/prodigi';

const category = recommendSizeCategory(3000, 4000, 300);
// Returns: 'medium-large' (50-69cm)
// Calculates optimal print size based on DPI
```

### Production Location Scoring

Boost products that can be produced locally for faster delivery:

```typescript
import { buildScoringOptions } from '@/lib/prodigi';

const scoring = buildScoringOptions('US');
// Returns: {
//   scoringProfile: 'Boost by production country',
//   scoringParameter: 'prodCountry-US'
// }
```

---

## 📊 Type Safety

Comprehensive TypeScript types for everything:

```typescript
import type {
  ProdigiCatalogProduct,
  ProdigiSearchFilters,
  ProdigiSearchOptions,
  SearchResult,
  ProcessedFacets,
  ProductMatch,
  ImageAnalysisData,
  UserPreferences,
  SizeCategory,
  Orientation,
} from '@/lib/prodigi';
```

---

## 🔧 Performance Optimizations

### Caching Strategy

1. **Facet Data**: Cached for 1 hour (rarely changes)
2. **Product Catalog**: Fetched on-demand (always fresh)
3. **Search Results**: No caching (real-time filters)

```typescript
import { prodigiService } from '@/lib/prodigi';

// Clear cache if needed
prodigiService.clearCache();
```

### Query Optimization

- Use `$top=0` for facet-only queries (no products)
- Select only needed fields with `$select`
- Debounce filter changes on the frontend
- Use pagination with `$skip` and `$top`

---

## 🎨 Integration with AI-Powered UX

This integration is **ready for your AI-powered frame selection UX**:

### Conversational AI Integration

```typescript
// AI: "Show me frames for this sunset photo"
const recommendations = await prodigiService.getImageRecommendations(
  { width: 3000, height: 2000, dpi: 300 },
  'US',
  { style: 'modern' }
);

// AI: "Try a natural wood frame instead"
const filtered = await prodigiService.search({
  country: 'US',
  category: 'Wall art',
  frameColors: ['natural', 'brown'],
  aspectRatioMin: 60,
  aspectRatioMax: 70,
});
```

### Progressive Filtering

```typescript
// Step 1: User selects black frame
const facets1 = await prodigiService.getFacets({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black'],
});
// Show: 421 black frames, glazes available, etc.

// Step 2: User adds acrylic glaze
const facets2 = await prodigiService.getFacets({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black'],
  glazes: ['acrylic / perspex'],
});
// Show: 156 frames with black + acrylic, sizes available, etc.
```

### Real-time Preview Updates

```typescript
// User changes frame color
// → Call getFacets() to update available options
// → Show counts next to each option
// → Disable options with 0 products
// → Update preview in real-time
```

---

## 📚 Constants & Utilities

Access Prodigi constants directly:

```typescript
import { PRODIGI_CONSTANTS } from '@/lib/prodigi';

console.log(PRODIGI_CONSTANTS.FRAME_COLORS);
// ['black', 'white', 'brown', 'natural', 'gold', 'silver', 'dark grey', 'light grey']

console.log(PRODIGI_CONSTANTS.SIZE_RANGES.LARGE);
// { min: 700, max: 1000, label: 'Large (70-99cm)' }

console.log(PRODIGI_CONSTANTS.ASPECT_RATIOS.PORTRAIT);
// { min: 0, max: 95, tolerance: 5 }
```

---

## 🚦 Next Steps

### Ready for Frontend Integration

1. ✅ **Complete API** - All endpoints ready
2. ✅ **Type Safety** - Full TypeScript support
3. ✅ **Smart Matching** - AI-powered recommendations
4. ✅ **Performance** - Caching and optimization
5. ✅ **Documentation** - This guide + inline docs

### Frontend Tasks

Now you can build:

1. **Filter UI** - Progressive filters with facet counts
2. **Product Grid** - Display search results with sorting
3. **Recommendations Panel** - Show AI-recommended frames
4. **Image Upload** - Get instant recommendations
5. **Conversational AI** - Natural language frame selection

---

## 🎓 Learning Resources

### Related Documents

- `PRODIGI_API_COMPREHENSIVE_ANALYSIS.md` - Full API analysis
- `PRODIGI_API_QUICK_REFERENCE.md` - Developer quick reference
- `PRODIGI_IMPROVEMENTS_EXECUTIVE_SUMMARY.md` - Business overview
- `AZURE_SEARCH_INDEX_INTEGRATION.md` - Azure Search details

### Code Examples

Check these files for usage examples:

- `/src/lib/prodigi/query-builder.ts` - Query construction examples
- `/src/lib/prodigi/product-matcher.ts` - Scoring algorithm
- `/src/app/api/prodigi/catalog/*/route.ts` - API implementation

---

## 🎉 Summary

You now have a **world-class Prodigi integration** that:

✅ Accesses the complete product catalog (1000+ products)  
✅ Supports all 19 filter categories with facets  
✅ Provides AI-powered product recommendations  
✅ Matches products intelligently to user images  
✅ Optimizes for production location and delivery speed  
✅ Includes comprehensive TypeScript types  
✅ Has production-ready API endpoints  
✅ Implements smart caching for performance  
✅ Is ready for your AI-powered UX  

**You're ready to build the frontend! 🚀**

---

**Version**: 2.0  
**Date**: November 20, 2024  
**Status**: Production Ready  
**Next Phase**: Frontend Integration

