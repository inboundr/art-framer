# Prodigi API Quick Reference Guide

## Quick Start

This is a developer-focused quick reference for implementing the Prodigi catalog filtering system.

---

## Base Endpoint

```
https://pwintylive.search.windows.net/indexes/live-catalogue/docs
```

**API Version**: `2016-09-01`

---

## Authentication Headers

```javascript
headers: {
  'api-key': '9142D85CE18C3AE0349B1FB21956B072',
  'authorization': 'Bearer YOUR_JWT_TOKEN',
  'content-type': 'application/json',
  'origin': 'https://dashboard.prodigi.com'
}
```

---

## Basic Query Structure

```
GET /indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$count=true
  &$top=50
  &$filter=FILTER_EXPRESSION
  &$select=FIELDS
  &facet=FACET_NAME
  &scoringProfile=Boost by production country
  &scoringParameter=prodCountry-US
```

---

## Essential Filters

### 1. Destination Country (Required)
```
$filter=destinationCountries/any(c: c eq 'US')
```

Supported countries: `US`, `CA`, `GB`, `AU`, `DE`, `FR`, `ES`, `IT`, etc.

### 2. Category (Recommended)
```
$filter=destinationCountries/any(c: c eq 'US') and category eq 'Wall art'
```

Categories: `Wall art`, `Apparel`, `Home & Living`, `Stationery`, etc.

### 3. Aspect Ratio Filtering
```
$filter=destinationCountries/any(c: c eq 'US') 
  and category eq 'Wall art'
  and productAspectRatio ge 95 
  and productAspectRatio le 105
```

Ranges:
- Portrait: `productAspectRatio lt 95`
- Square: `productAspectRatio ge 95 and productAspectRatio le 105`
- Landscape: `productAspectRatio gt 105`

### 4. Size Range Filtering
```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and maxProductDimensionsMm ge 500
  and maxProductDimensionsMm le 1000
```

Ranges (in mm):
- Small: `< 300`
- Medium: `300-500`
- Medium-Large: `500-700`
- Large: `700-1000`
- Extra Large: `1000-1500`
- Oversized: `> 1500`

### 5. Frame Color Filtering
```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and frameColour/any(c: c eq 'black')
```

Multiple colors (OR logic):
```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and (frameColour/any(c: c eq 'black') or frameColour/any(c: c eq 'white'))
```

### 6. Glaze Filtering
```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and glaze/any(g: g eq 'acrylic / perspex')
```

Options: `none`, `acrylic / perspex`, `float glass`, `motheye`, `gloss varnish`

### 7. Paper Type Filtering
```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and paperType/any(p: p eq 'ema')
```

Common paper codes: `sc` (standard canvas), `mc` (metallic canvas), `ema` (enhanced matte art), `lpp` (lustre photo paper), `hpr` (high gloss photo)

---

## Faceting

### Get Facet Counts
```
&facet=frameColour,count:100
&facet=glaze,count:100
&facet=frame,count:100
```

### Range-based Facets
```
&facet=maxProductDimensionsMm,values:300|500|700|1000|1500
&facet=productAspectRatio,values:95|105
```

### All Available Facets
```javascript
const facets = [
  'facet=frame,count:100',
  'facet=glaze,count:100',
  'facet=finish,count:100',
  'facet=style,count:100',
  'facet=category',
  'facet=edge',
  'facet=brand',
  'facet=mount,count:100',
  'facet=mountColour,count:100',
  'facet=paperType,count:100',
  'facet=size,count:100',
  'facet=gender',
  'facet=frameColour,count:100',
  'facet=maxProductDimensionsMm,values:300|500|700|1000|1500',
  'facet=productAspectRatio,values:95|105'
];
```

---

## Field Selection

### Essential Fields
```
$select=sku,description,productType,basePriceFrom,priceCurrency
```

### All Useful Fields
```javascript
const fields = [
  // Identifiers
  'sku',
  'shortcode',
  'description',
  
  // Type & Category
  'category',
  'productType',
  
  // Dimensions
  'productWidthMm',
  'productHeightMm',
  'maxProductDimensionsMm',
  'productAspectRatio',
  'fullProductHorizontalDimensions',
  'fullProductVerticalDimensions',
  'sizeUnits',
  
  // Materials & Options
  'frameColour',
  'frame',
  'glaze',
  'edge',
  'mount',
  'mountColour',
  'paperType',
  'substrateWeight',
  'wrap',
  'finish',
  'style',
  
  // Pricing & Logistics
  'basePriceFrom',
  'priceCurrency',
  'lastUpdated',
  'sla',
  'productionCountries',
  
  // Technical
  'optimumDpi',
  'searchWeighting'
].join(',');
```

---

## Scoring & Sorting

### Production Country Scoring
```
scoringProfile=Boost by production country
scoringParameter=prodCountry-US
```

This ranks products by:
1. Products with production in the destination country
2. Products with nearby production
3. All other products

---

## Complete Examples

### Example 1: Get Portrait Prints, Black Frame, Acrylic Glaze
```
GET https://pwintylive.search.windows.net/indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$count=true
  &$top=50
  &$filter=destinationCountries/any(c: c eq 'US') 
    and category eq 'Wall art'
    and productAspectRatio lt 95
    and frameColour/any(c: c eq 'black')
    and glaze/any(g: g eq 'acrylic / perspex')
  &$select=sku,description,productType,frameColour,glaze,basePriceFrom,priceCurrency,sla
  &scoringProfile=Boost by production country
  &scoringParameter=prodCountry-US
```

### Example 2: Get All Canvas Products with Facets
```
GET https://pwintylive.search.windows.net/indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$count=true
  &$top=50
  &$filter=destinationCountries/any(c: c eq 'US') 
    and category eq 'Wall art'
    and (paperType/any(p: p eq 'standard canvas (sc)') or paperType/any(p: p eq 'metallic canvas (mc)'))
  &facet=frame,count:100
  &facet=frameColour,count:100
  &facet=wrap
  &facet=edge
  &facet=maxProductDimensionsMm,values:300|500|700|1000|1500
  &scoringProfile=Boost by production country
  &scoringParameter=prodCountry-US
```

### Example 3: Facet-Only Query (No Products)
```
GET https://pwintylive.search.windows.net/indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$top=0
  &$filter=destinationCountries/any(c: c eq 'US') and category eq 'Wall art'
  &facet=frame,count:100
  &facet=frameColour,count:100
  &facet=glaze,count:100
  &facet=mount,count:100
  &facet=mountColour,count:100
  &facet=paperType,count:100
  &facet=finish,count:100
```

Use `$top=0` when you only need facet counts, not products (faster response).

---

## TypeScript Implementation

### Query Builder Function
```typescript
interface ProdigiFilters {
  country: string;
  category?: string;
  frameColors?: string[];
  glazes?: string[];
  paperTypes?: string[];
  minDimension?: number;
  maxDimension?: number;
  aspectRatioMin?: number;
  aspectRatioMax?: number;
  mounts?: string[];
  mountColors?: string[];
  finishes?: string[];
  edges?: string[];
}

function buildProdigiQuery(filters: ProdigiFilters, options: {
  top?: number;
  skip?: number;
  selectFields?: string[];
  includeFacets?: boolean;
}): string {
  const params = new URLSearchParams();
  
  // Required params
  params.append('api-version', '2016-09-01');
  params.append('search', '*');
  params.append('$count', 'true');
  params.append('$top', String(options.top || 50));
  
  if (options.skip) {
    params.append('$skip', String(options.skip));
  }
  
  // Build filter expression
  const filterParts: string[] = [];
  
  // Required: destination country
  filterParts.push(`destinationCountries/any(c: c eq '${filters.country}')`);
  
  // Optional: category
  if (filters.category) {
    filterParts.push(`category eq '${filters.category}'`);
  }
  
  // Frame colors (OR logic)
  if (filters.frameColors?.length) {
    const colorFilters = filters.frameColors
      .map(c => `frameColour/any(c: c eq '${c}')`)
      .join(' or ');
    filterParts.push(`(${colorFilters})`);
  }
  
  // Glaze options (OR logic)
  if (filters.glazes?.length) {
    const glazeFilters = filters.glazes
      .map(g => `glaze/any(g: g eq '${g}')`)
      .join(' or ');
    filterParts.push(`(${glazeFilters})`);
  }
  
  // Paper types (OR logic)
  if (filters.paperTypes?.length) {
    const paperFilters = filters.paperTypes
      .map(p => `paperType/any(p: p eq '${p}')`)
      .join(' or ');
    filterParts.push(`(${paperFilters})`);
  }
  
  // Size range
  if (filters.minDimension !== undefined) {
    filterParts.push(`maxProductDimensionsMm ge ${filters.minDimension}`);
  }
  if (filters.maxDimension !== undefined) {
    filterParts.push(`maxProductDimensionsMm le ${filters.maxDimension}`);
  }
  
  // Aspect ratio range
  if (filters.aspectRatioMin !== undefined) {
    filterParts.push(`productAspectRatio ge ${filters.aspectRatioMin}`);
  }
  if (filters.aspectRatioMax !== undefined) {
    filterParts.push(`productAspectRatio le ${filters.aspectRatioMax}`);
  }
  
  // Combine all filters with AND
  params.append('$filter', filterParts.join(' and '));
  
  // Add field selection
  if (options.selectFields?.length) {
    params.append('$select', options.selectFields.join(','));
  }
  
  // Add facets
  if (options.includeFacets) {
    params.append('facet', 'frame,count:100');
    params.append('facet', 'frameColour,count:100');
    params.append('facet', 'glaze,count:100');
    params.append('facet', 'mount,count:100');
    params.append('facet', 'mountColour,count:100');
    params.append('facet', 'paperType,count:100');
    params.append('facet', 'finish,count:100');
    params.append('facet', 'edge');
    params.append('facet', 'size,count:100');
    params.append('facet', 'maxProductDimensionsMm,values:300|500|700|1000|1500');
    params.append('facet', 'productAspectRatio,values:95|105');
  }
  
  // Add scoring
  params.append('scoringProfile', 'Boost by production country');
  params.append('scoringParameter', `prodCountry-${filters.country}`);
  
  return params.toString();
}

// Usage
const queryString = buildProdigiQuery({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black', 'white'],
  glazes: ['acrylic / perspex'],
  aspectRatioMin: 90,
  aspectRatioMax: 100
}, {
  top: 50,
  includeFacets: true,
  selectFields: ['sku', 'description', 'basePriceFrom']
});
```

### Response Types
```typescript
interface ProdigiProduct {
  sku: string;
  productionCountries: string[];
  category: string;
  description: string;
  productType: string;
  wrap?: string[];
  frameColour?: string[];
  style?: string[];
  gender?: string[];
  finish?: string[];
  maxProductDimensionsMm: number;
  productWidthMm: number;
  productHeightMm: number;
  productAspectRatio: number;
  optimumDpi: number;
  edge?: string[];
  glaze?: string[];
  frame?: string[];
  size?: string[];
  brand?: string[];
  paperType?: string[];
  substrateWeight?: string[];
  mount?: string[];
  mountColour?: string[];
  lastUpdated: string;
  basePriceFrom: number;
  priceCurrency: string;
  shortcode: string | null;
  printedAreaHorizontalDimensions: number;
  printedAreaVerticalDimensions: number;
  fullProductHorizontalDimensions: number;
  fullProductVerticalDimensions: number;
  sizeUnits: string;
  searchWeighting: number;
  sla: number;
}

interface FacetValue {
  value?: string;
  from?: number;
  to?: number;
  count: number;
}

interface ProdigiSearchResponse {
  '@odata.context': string;
  '@odata.count'?: number;
  '@search.facets'?: {
    [facetName: string]: FacetValue[];
  };
  value: ProdigiProduct[];
}
```

### Fetch Function
```typescript
async function searchProdigiCatalog(
  filters: ProdigiFilters,
  options: { top?: number; includeFacets?: boolean }
): Promise<ProdigiSearchResponse> {
  const queryString = buildProdigiQuery(filters, options);
  const url = `https://pwintylive.search.windows.net/indexes/live-catalogue/docs?${queryString}`;
  
  const response = await fetch(url, {
    headers: {
      'api-key': process.env.PRODIGI_API_KEY!,
      'authorization': `Bearer ${process.env.PRODIGI_JWT_TOKEN!}`,
      'content-type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Prodigi API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Usage
const results = await searchProdigiCatalog({
  country: 'US',
  category: 'Wall art',
  aspectRatioMin: 95,
  aspectRatioMax: 105
}, {
  top: 20,
  includeFacets: true
});

console.log(`Found ${results['@odata.count']} products`);
console.log('Frame colors available:', results['@search.facets']?.frameColour);
```

---

## Common Patterns

### Pattern 1: Progressive Filtering
1. First query: Get all products + facets
2. User selects filter
3. Next query: Apply filter + get updated facets
4. Show which options are still available

```typescript
// Step 1: Initial load
const initial = await searchProdigiCatalog({
  country: 'US',
  category: 'Wall art'
}, { includeFacets: true });

// User sees: 7800 products, all filter options

// Step 2: User selects "black" frame
const filtered = await searchProdigiCatalog({
  country: 'US',
  category: 'Wall art',
  frameColors: ['black']
}, { includeFacets: true });

// User sees: 4240 products, updated facet counts
```

### Pattern 2: Aspect Ratio Matching
```typescript
function getAspectRatioFilters(imageWidth: number, imageHeight: number) {
  const ratio = (imageHeight / imageWidth) * 100;
  const tolerance = 5; // 5% tolerance
  
  return {
    aspectRatioMin: ratio - tolerance,
    aspectRatioMax: ratio + tolerance
  };
}

// Usage
const filters = getAspectRatioFilters(1000, 1500); // Portrait image
// Returns: { aspectRatioMin: 145, aspectRatioMax: 155 }

const results = await searchProdigiCatalog({
  country: 'US',
  category: 'Wall art',
  ...filters
}, { top: 50 });
```

### Pattern 3: Size Recommendation
```typescript
function getSizeRangeFromImage(widthPx: number, heightPx: number, dpi: number) {
  // Convert to physical dimensions
  const widthInches = widthPx / dpi;
  const heightInches = heightPx / dpi;
  const maxInches = Math.max(widthInches, heightInches);
  const maxMm = maxInches * 25.4;
  
  // Recommend size ranges
  if (maxMm < 300) return { label: 'Small', min: 0, max: 300 };
  if (maxMm < 500) return { label: 'Medium', min: 300, max: 500 };
  if (maxMm < 700) return { label: 'Medium-Large', min: 500, max: 700 };
  if (maxMm < 1000) return { label: 'Large', min: 700, max: 1000 };
  if (maxMm < 1500) return { label: 'Extra Large', min: 1000, max: 1500 };
  return { label: 'Oversized', min: 1500, max: 10000 };
}

// Usage
const sizeRange = getSizeRangeFromImage(3000, 4000, 300);
// Returns: { label: 'Medium-Large', min: 500, max: 700 }
```

---

## Caching Strategy

```typescript
// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function cachedSearch(
  filters: ProdigiFilters,
  options: any
): Promise<ProdigiSearchResponse> {
  const cacheKey = JSON.stringify({ filters, options });
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await searchProdigiCatalog(filters, options);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  return data;
}
```

---

## Error Handling

```typescript
async function safeSearchProdigiCatalog(
  filters: ProdigiFilters,
  options: any
): Promise<ProdigiSearchResponse | null> {
  try {
    return await searchProdigiCatalog(filters, options);
  } catch (error) {
    console.error('Prodigi search error:', error);
    
    // Fallback: try with minimal filters
    try {
      return await searchProdigiCatalog({
        country: filters.country,
        category: filters.category
      }, { top: 50 });
    } catch (fallbackError) {
      console.error('Prodigi fallback failed:', fallbackError);
      return null;
    }
  }
}
```

---

## Performance Tips

1. **Use `$top=0` for facet-only queries**
   ```
   $top=0&facet=frameColour,count:100
   ```

2. **Select only needed fields**
   ```
   $select=sku,description,basePriceFrom,priceCurrency
   ```

3. **Cache facet data aggressively** (changes rarely)

4. **Debounce filter changes** (wait 300ms after user stops interacting)

5. **Use pagination** (`$skip` and `$top`)

6. **Implement local scoring** after API returns results

---

## Testing Checklist

- [ ] Test with different countries
- [ ] Test with no results (verify empty handling)
- [ ] Test with invalid filter values
- [ ] Test facet count accuracy
- [ ] Test aspect ratio edge cases (very wide, very tall)
- [ ] Test size ranges at boundaries
- [ ] Test multiple filter combinations
- [ ] Test scoring/sorting
- [ ] Test pagination
- [ ] Test error handling
- [ ] Test caching
- [ ] Test performance with many filters

---

## Useful Constants

```typescript
export const PRODIGI_CONSTANTS = {
  API_BASE: 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs',
  API_VERSION: '2016-09-01',
  
  CATEGORIES: {
    WALL_ART: 'Wall art',
    APPAREL: 'Apparel',
    HOME_LIVING: 'Home & Living',
    STATIONERY: 'Stationery'
  },
  
  ASPECT_RATIOS: {
    PORTRAIT: { min: 0, max: 95 },
    SQUARE: { min: 95, max: 105 },
    LANDSCAPE: { min: 105, max: 999 }
  },
  
  SIZE_RANGES: {
    SMALL: { min: 0, max: 300, label: 'Small (under 30cm)' },
    MEDIUM: { min: 300, max: 500, label: 'Medium (30-49cm)' },
    MEDIUM_LARGE: { min: 500, max: 700, label: 'Medium-Large (50-69cm)' },
    LARGE: { min: 700, max: 1000, label: 'Large (70-99cm)' },
    EXTRA_LARGE: { min: 1000, max: 1500, label: 'Extra Large (100-149cm)' },
    OVERSIZED: { min: 1500, max: 10000, label: 'Oversized (150cm+)' }
  },
  
  FRAME_COLORS: ['black', 'white', 'brown', 'natural', 'gold', 'silver', 'dark grey', 'light grey'],
  
  GLAZES: ['none', 'acrylic / perspex', 'float glass', 'motheye', 'gloss varnish'],
  
  MOUNT_THICKNESSES: ['no mount / mat', '1.4mm', '2.0mm', '2.4mm'],
  
  MOUNT_COLORS: ['snow white', 'black', 'off-white', 'navy'],
  
  FINISHES: ['gloss', 'matte', 'lustre'],
  
  EDGE_DEPTHS: ['19mm', '38mm', 'rolled']
};
```

---

## Quick Links

- **Full Analysis**: `PRODIGI_API_COMPREHENSIVE_ANALYSIS.md`
- **Task List**: `PRODIGI_INTEGRATION_IMPROVEMENT_TASKS.md`
- **Executive Summary**: `PRODIGI_IMPROVEMENTS_EXECUTIVE_SUMMARY.md`
- **Current Setup**: `PRODIGI_SETUP.md`

---

**Document Version**: 1.0  
**Last Updated**: November 20, 2024  
**For**: Development Team

