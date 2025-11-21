# Prodigi API Comprehensive Analysis & Integration Guide

## Executive Summary

This document provides a complete analysis of the Prodigi product catalog API based on reverse engineering their dashboard. It details all available filters, options, and capabilities that can be leveraged to significantly improve our frame selection UX.

---

## 1. API Architecture

### 1.1 Primary Endpoint

```
https://pwintylive.search.windows.net/indexes/live-catalogue/docs
```

**Technology**: Azure Cognitive Search (API version: 2016-09-01)

### 1.2 Authentication

- **API Key**: `9142D85CE18C3AE0349B1FB21956B072` (in header)
- **Authorization**: Bearer token (JWT) in header
- **Required Headers**:
  - `api-key`
  - `authorization`
  - `content-type: application/json`
  - `origin: https://dashboard.prodigi.com`

---

## 2. Query Parameters & Structure

### 2.1 Base Query Parameters

| Parameter          | Purpose                  | Example                       |
| ------------------ | ------------------------ | ----------------------------- |
| `api-version`      | API version              | `2016-09-01`                  |
| `search`           | Search term              | `*` (all)                     |
| `$count`           | Return total count       | `true`                        |
| `$top`             | Results per page         | `50`                          |
| `$filter`          | OData filter expression  | See section 2.2               |
| `$select`          | Fields to return         | See section 2.3               |
| `facet`            | Enable faceting on field | See section 3                 |
| `scoringProfile`   | Relevance scoring        | `Boost by production country` |
| `scoringParameter` | Scoring params           | `prodCountry-CA`              |

### 2.2 Filter Syntax

**Base Filter Pattern**:

```
destinationCountries/any(c: c eq 'CA') and category eq 'Wall art'
```

**Components**:

- Destination country filtering (required)
- Category filtering
- Facet-based filtering (combine with AND)

**Filter Examples**:

```
$filter=destinationCountries/any(c: c eq 'CA')
  and category eq 'Wall art'
  and frameColour eq 'black'
  and glaze eq 'perspex'
```

### 2.3 Product Fields Available

#### Core Product Information

- `sku` - Product SKU identifier
- `category` - Product category (Wall art, Apparel, etc.)
- `description` - Full product description
- `productType` - Type (Stretched canvas, Framed print, etc.)
- `shortcode` - Short product code

#### Dimensions

- `productWidthMm` - Width in millimeters
- `productHeightMm` - Height in millimeters
- `maxProductDimensionsMm` - Maximum dimension
- `productAspectRatio` - Aspect ratio (percentage)
- `fullProductHorizontalDimensions` - Full width (in inches)
- `fullProductVerticalDimensions` - Full height (in inches)
- `printedAreaHorizontalDimensions` - Print area width
- `printedAreaVerticalDimensions` - Print area height
- `sizeUnits` - Unit of measurement (in/cm)

#### Styling & Material Options

- `frameColour` - Array of available frame colors
- `frame` - Frame type options
- `glaze` - Glazing options
- `edge` - Edge type/thickness
- `mount` - Mount/mat options
- `mountColour` - Mount color options
- `paperType` - Paper/substrate type
- `substrateWeight` - Paper weight
- `wrap` - Canvas wrap options (white, mirrorwrap, imagewrap, black)
- `finish` - Surface finish (gloss, matte, lustre)
- `style` - Product style descriptor
- `brand` - Brand name

#### Pricing & Logistics

- `basePriceFrom` - Starting price (in pence/cents)
- `priceCurrency` - Currency code (GBP, USD, EUR, CAD)
- `lastUpdated` - Last update timestamp
- `sla` - Service level agreement (hours)
- `productionCountries` - Array of production locations
- `optimumDpi` - Recommended DPI

#### Metadata

- `searchWeighting` - Search relevance weight
- `gender` - Gender category (if applicable)

---

## 3. Complete Faceting System

### 3.1 What are Facets?

Facets are aggregated counts of available options across the product catalog. They power the filtering UI and show customers how many products match each filter option.

### 3.2 Facet Query Syntax

**Basic Facet**:

```
facet=category
```

**Facet with Count Limit**:

```
facet=frameColour,count:100
```

**Facet with Value Ranges**:

```
facet=maxProductDimensionsMm,values:300|500|700|1000|1500
facet=productAspectRatio,values:95|105
```

### 3.3 All Available Facets

#### A. Frame Options (`facet=frame,count:100`)

**Values & Counts** (example from Wall art, CA destination):

- `rolled / no frame` - 1,904 products
- `classic` - 1,341 products
- `box` - 1,221 products
- `38mm standard stretcher bar` - 1,198 products
- `float frame, 38mm standard stretcher bar` - 1,009 products
- `classic frame, 19mm standard stretcher bar` - 648 products
- `19mm standard stretcher bar` - 346 products
- `budget` - 11 products
- `recycled card` - 8 products
- `aluminium` - 5 products
- `bobbled gold` - 3 products
- `box frame, 19mm standard stretcher bar` - 3 products
- `ornate frame, 19mm standard stretcher bar` - 3 products
- `box frame` - 2 products
- `38mm premium stretcher bar` - 1 product
- `spacer` - 1 product

**UX Insight**: Group by frame style (no frame, classic, box, float, ornate) and thickness (19mm, 38mm).

---

#### B. Glaze Options (`facet=glaze,count:100`)

**Values & Counts**:

- `none` - 2,740 products
- `gloss varnish` - 2,003 products (for canvas)
- `acrylic / perspex` - 1,711 products
- `float glass` - 689 products
- `motheye` - 168 products (anti-reflective)

**UX Insight**: Present as protection options - None (canvas), Acrylic (lightweight), Glass (premium), Motheye (museum quality).

---

#### C. Frame Color (`facet=frameColour,count:100`)

**Values & Counts**:

- `black` - 4,240 products
- `white` - 4,157 products
- `brown` - 3,872 products
- `natural` - 3,648 products
- `gold` - 2,441 products
- `silver` - 2,435 products
- `dark grey` - 1,362 products
- `light grey` - 1,362 products

**Visual Assets**: Prodigi uses texture images at `/img/colours/frames/{color}.png`

- `black.png`
- `brown.png`
- `dark_grey.png`
- `gold.png`
- `natural.png`
- `silver.png`

**UX Insight**: Show color swatches with texture previews. Group by color family.

---

#### D. Mount/Mat Options (`facet=mount,count:100`)

**Values & Counts**:

- `no mount / mat` - 1,226 products
- `2.4mm` - 744 products
- `1.4mm` - 551 products
- `no mount/mat` - 27 products (variant spelling)
- `2.0mm` - 20 products

**UX Insight**: Show thickness options with visual representation. Explain that mounts create border space.

---

#### E. Mount Color (`facet=mountColour,count:100`)

**Values & Counts**:

- `snow white` - 1,303 products
- `black` - 1,132 products
- `off-white` - 1,131 products
- `navy` - 1 product

**UX Insight**: Limited color palette - focus on neutral options that complement most artwork.

---

#### F. Paper Type (`facet=paperType,count:100`)

**Values & Counts**:

- `standard canvas (sc)` - 3,041 products
- `metallic canvas (mc)` - 2,003 products
- `ema` (Enhanced Matte Art) - 599 products
- `cpwp` (Cold Press Watercolour Paper) - 313 products
- `sap` (Standard Art Paper) - 313 products
- `lpp` (Lustre Photo Paper) - 301 products
- `hpr` (High Gloss Photo Paper) - 240 products
- `hge` (Hahnemühle German Etching) - 229 products
- `bap` (Budget Art Paper) - 228 products
- `gold foil` - 120 products
- `silver foil` - 120 products
- `recycled canvas` - 76 products
- `dibond` - 51 products
- `glow in the dark` - 43 products
- `acrylic` - 33 products
- `bpp` (Budget Photo Paper) - 18 products
- `cork` - 16 products
- `silk` - 11 products
- `spr` (Standard Photo Paper) - 3 products

**UX Insight**:

- Group by material type (Canvas, Paper, Special Materials)
- Provide descriptions for each paper type
- Highlight premium options (Hahnemühle, metallic)

---

#### G. Finish (`facet=finish,count:100`)

**Values & Counts**:

- `lustre` - 51 products
- `matte` - 51 products
- `gloss` - 48 products

**UX Insight**: Surface finish for photo prints. Show comparison images.

---

#### H. Edge Options (`facet=edge`)

**Values & Counts**:

- `38mm` - 2,216 products
- `rolled` - 1,904 products (unframed, rolled for shipping)
- `19mm` - 1,000 products

**UX Insight**: Edge depth affects the 3D appearance. Show side-view illustrations.

---

#### I. Size Dimensions (`facet=maxProductDimensionsMm,values:300|500|700|1000|1500`)

**Ranges & Counts**:

- Under 300mm (under 30cm) - 383 products
- 300-500mm (30-49cm) - 1,197 products
- 500-700mm (50-69cm) - 1,409 products
- 700-1000mm (70-99cm) - 2,067 products
- 1000-1500mm (100-149cm) - 2,035 products
- Over 1500mm (over 150cm) - 709 products

**UX Insight**: Create size picker with visual representations (small, medium, large, extra large).

---

#### J. Standard Sizes (`facet=size,count:100`)

**Values & Counts**:

- `a2` - 103 products
- `a4` - 103 products
- `a3` - 99 products
- `a1` - 38 products
- `a0` - 9 products
- `a5` - 9 products

**UX Insight**: Show common size standards alongside custom dimensions.

---

#### K. Aspect Ratio (`facet=productAspectRatio,values:95|105`)

**Ranges & Counts**:

- Portrait (0-95%) - 4,656 products
- Square (95-105%) - 1,058 products
- Landscape (105%+) - 2,086 products

**UX Insight**:

- Calculate from user's uploaded image
- Filter products by aspect ratio match
- Show orientation icons

---

#### L. Style (`facet=style,count:100`)

**Values & Counts** (composite descriptors):

- `framed print / non-mounted / perspex` - 977 products
- `framed print / 1.4mm mount / perspex` - 303 products
- `framed print / 2.0mm mount / perspex` - 285 products
- `framed print / 2.0mm mount / float glass` - 232 products
- `framed print / non-mounted / float glass` - 226 products
- `framed print / 1.4mm mount / float glass` - 217 products
- `framed print / mount / perspex` - 128 products
- `framed print / 75mm mount / perspex` - 70 products
- `framed print / mount / motheye` - 42 products
- `framed print / non-mounted / motheye` - 42 products
- `framed print / no mount / float glass` - 11 products
- `framed print / double 1.4mm mount / perspex` - 3 products
- `framed print / no mount / perspex` - 1 product

**UX Insight**: Style is a composite descriptor. Use individual facets instead.

---

#### M. Category (`facet=category`)

**Values**:

- `Wall art` - 7,800 products
- (Other categories: Apparel, Home & Living, Stationery, etc.)

**UX Insight**: Primary category filter for overall product type.

---

#### N. Brand (`facet=brand`)

**UX Insight**: Currently empty for Wall art category in the example data.

---

#### O. Gender (`facet=gender`)

**UX Insight**: Not applicable for Wall art category.

---

## 4. Product Selection & Scoring

### 4.1 Scoring Profile

```
scoringProfile=Boost by production country
scoringParameter=prodCountry-CA
```

**Purpose**: Ranks products by production location proximity to destination country. Faster shipping, lower costs.

**Implementation**: Always pass destination country to optimize for local production.

### 4.2 Search Weighting

Products have a `searchWeighting` field (typically 2 for standard products) that affects ranking.

---

## 5. Real Product Examples

### Example 1: Stretched Canvas

```json
{
  "sku": "global-can-12x12",
  "productionCountries": ["US", "GB", "SE", "NL", "ES", "CA", "AU"],
  "category": "Wall art",
  "description": "Stretched Canvas on a 38mm Standard Stretcher Bar, 12x12\" / 30x30cm",
  "productType": "Stretched canvas",
  "wrap": ["white", "mirrorwrap", "imagewrap", "black"],
  "frameColour": [],
  "maxProductDimensionsMm": 305,
  "productWidthMm": 305,
  "productHeightMm": 305,
  "productAspectRatio": 100.0,
  "edge": ["38mm"],
  "frame": ["38mm standard stretcher bar"],
  "paperType": ["standard canvas (sc)"],
  "substrateWeight": ["400gsm"],
  "basePriceFrom": 1800.0,
  "priceCurrency": "GBP",
  "sla": 72
}
```

### Example 2: Framed Canvas

```json
{
  "sku": "global-fra-can-16x32",
  "category": "Wall art",
  "description": "Global float framed canvas on premium stretcher bars, 16x32\" / 41x81cm",
  "productType": "Framed canvas",
  "wrap": ["white", "mirrorwrap", "imagewrap", "black"],
  "frameColour": ["white", "silver", "natural", "gold", "brown", "black"],
  "maxProductDimensionsMm": 813,
  "productWidthMm": 406,
  "productHeightMm": 813,
  "productAspectRatio": 50.0,
  "edge": ["38mm"],
  "frame": ["float frame, 38mm standard stretcher bar"],
  "paperType": ["standard canvas (sc)"],
  "basePriceFrom": 6400.0,
  "priceCurrency": "GBP",
  "sla": 72
}
```

**Key Observation**: Products with frames have `frameColour` array, products without frames have empty `frameColour` array.

---

## 6. Dashboard UI Filter Structure

### 6.1 Filter Navigation Buttons

The dashboard provides quick filter chips:

- Frame
- Glaze
- Finish
- Edge
- Mount
- Mount Colour
- Paper Type
- Size (standard sizes)
- Colour (frame color)
- Size (dimension ranges)
- Aspect Ratio

### 6.2 Filter Panel Layout

Each filter has:

1. **Title** (e.g., "Frame", "Glaze")
2. **Checkbox options** with labels
3. **"Show more..." button** for facets with many options
4. **Visual swatches** for colors (frame colors, mount colors)
5. **Text transformation**: capitalize

### 6.3 Filter ID Pattern

```html
id="select_{facetName}_{value}" value="{facetName}|{value}"
```

Example:

```html
<input id="select_frame_box" type="checkbox" value="frame|box" />
<label for="select_frame_box">Box</label>
```

---

## 7. Gaps in Our Current Implementation

### 7.1 Missing Filters

We currently do NOT support:

- ❌ Glaze selection (acrylic, glass, motheye)
- ❌ Mount/Mat options
- ❌ Mount color selection
- ❌ Paper type variety (we only use standard canvas)
- ❌ Finish options (gloss, matte, lustre)
- ❌ Edge thickness selection
- ❌ Size range filtering
- ❌ Aspect ratio filtering
- ❌ Frame style variety (only support basic options)

### 7.2 Missing Product Data

We don't display:

- ❌ Production countries
- ❌ SLA (delivery time)
- ❌ Optimal DPI
- ❌ Substrate weight
- ❌ Full dimension specifications

### 7.3 Missing UX Features

- ❌ Faceted search with counts
- ❌ Progressive filtering (show available options based on previous selections)
- ❌ Visual color swatches
- ❌ Size comparison visuals
- ❌ Aspect ratio matching
- ❌ Production location optimization

---

## 8. Recommended Implementation Phases

### Phase 1: Foundation (Immediate)

**Goal**: Match image aspect ratio to product catalog

1. **Implement Aspect Ratio Filtering**
   - Calculate user image aspect ratio
   - Filter products within 5% tolerance
   - Show orientation badges (Portrait/Square/Landscape)

2. **Implement Size Range Filtering**
   - Add dimension range selector
   - Show size visual guide (small/medium/large/extra large)
   - Display actual dimensions in cm/inches

3. **Add Production Location Scoring**
   - Use `scoringProfile` and `scoringParameter`
   - Show estimated SLA
   - Badge products made locally

**Estimated Effort**: 2-3 days
**Impact**: HIGH - Better product matches, clearer sizing

---

### Phase 2: Core Filters (Week 1)

**Goal**: Comprehensive frame customization

1. **Implement Frame Selection**
   - Frame style options (classic, box, float, ornate, none)
   - Frame thickness (19mm, 38mm)
   - Group by style family
   - Show representative images

2. **Implement Frame Color Selection**
   - 8 color options with texture swatches
   - Download/use Prodigi's color texture images
   - Show color name + visual swatch
   - Allow "any color" option

3. **Implement Glaze Selection**
   - None (for canvas)
   - Acrylic/Perspex (lightweight, shatter-resistant)
   - Float Glass (premium clarity)
   - Motheye (museum-quality, anti-reflective)
   - Show comparison images

**Estimated Effort**: 3-4 days
**Impact**: VERY HIGH - Complete frame customization

---

### Phase 3: Advanced Options (Week 2)

**Goal**: Professional-grade options

1. **Implement Mount/Mat Options**
   - With/without mount
   - Thickness options (1.4mm, 2.0mm, 2.4mm)
   - Show visual examples of matted vs non-matted
   - Calculate mount border width

2. **Implement Mount Color Selection**
   - Snow white, Black, Off-white
   - Show color swatches
   - Preview with frame color

3. **Implement Paper Type Selection**
   - Group by category:
     - Canvas (Standard, Metallic, Recycled)
     - Art Papers (Enhanced Matte, German Etching, Cold Press)
     - Photo Papers (Lustre, High Gloss)
     - Special Materials (Foil, Dibond, Acrylic, Cork)
   - Show descriptions and use cases
   - Indicate premium options

4. **Implement Finish Selection**
   - Gloss / Matte / Lustre
   - Only for applicable paper types
   - Show sample images

**Estimated Effort**: 4-5 days
**Impact**: HIGH - Professional customization

---

### Phase 4: Enhanced UX (Week 3)

**Goal**: Guided shopping experience

1. **Implement Progressive Filtering**
   - Show facet counts after each selection
   - Disable unavailable options
   - Show "X products match" counter
   - "Reset filters" option

2. **Implement Visual Guides**
   - Size comparison tool (show product next to common objects)
   - Room visualization (AR/mockup)
   - Color harmony suggestions
   - Material comparison guide

3. **Implement Smart Recommendations**
   - "Popular choices"
   - "Best value"
   - "Fastest shipping"
   - "Premium quality"
   - Based on scoring and metadata

4. **Add Product Details Panel**
   - Show production countries
   - Display SLA
   - Show optimal DPI
   - Indicate substrate weight

**Estimated Effort**: 5-6 days
**Impact**: HIGH - Premium UX

---

### Phase 5: Advanced Features (Week 4)

**Goal**: Complete parity + innovation

1. **Implement Standard Size Presets**
   - A0, A1, A2, A3, A4, A5 quick selectors
   - US standard sizes (8x10, 11x14, 16x20, etc.)
   - Custom size input with validation

2. **Implement Canvas Wrap Options**
   - White, Black, Mirror, Image wrap
   - Show preview images
   - Explain differences

3. **Implement Multi-Product Comparison**
   - Side-by-side comparison view
   - Compare prices, materials, SLA
   - "Save for later" functionality

4. **Implement Filter Presets**
   - "Budget friendly"
   - "Premium quality"
   - "Fast delivery"
   - "Eco-friendly"
   - Save custom presets

**Estimated Effort**: 5-7 days
**Impact**: VERY HIGH - Market differentiation

---

## 9. Technical Implementation Guide

### 9.1 API Query Builder

**Recommended Architecture**:

```typescript
interface ProdigiQueryParams {
  destinationCountry: string; // 'US', 'CA', 'GB', etc.
  category: string; // 'Wall art'

  // Filters
  frameType?: string[];
  frameColour?: string[];
  glaze?: string[];
  mount?: string[];
  mountColour?: string[];
  paperType?: string[];
  finish?: string[];
  edge?: string[];

  // Ranges
  minDimensionMm?: number;
  maxDimensionMm?: number;
  aspectRatioMin?: number;
  aspectRatioMax?: number;

  // Pagination & sorting
  top?: number;
  skip?: number;
  scoringProfile?: string;
}

function buildProdigiQuery(params: ProdigiQueryParams): string {
  const filters: string[] = [];

  // Required filters
  filters.push(
    `destinationCountries/any(c: c eq '${params.destinationCountry}')`
  );
  filters.push(`category eq '${params.category}'`);

  // Optional filters
  if (params.frameType?.length) {
    const frameFilters = params.frameType
      .map((f) => `frame/any(f: f eq '${f}')`)
      .join(" or ");
    filters.push(`(${frameFilters})`);
  }

  if (params.frameColour?.length) {
    const colorFilters = params.frameColour
      .map((c) => `frameColour/any(c: c eq '${c}')`)
      .join(" or ");
    filters.push(`(${colorFilters})`);
  }

  // Build facets
  const facets = [
    "facet=frame,count:100",
    "facet=frameColour,count:100",
    "facet=glaze,count:100",
    "facet=mount,count:100",
    "facet=mountColour,count:100",
    "facet=paperType,count:100",
    "facet=finish,count:100",
    "facet=edge",
    "facet=size,count:100",
    "facet=maxProductDimensionsMm,values:300|500|700|1000|1500",
    "facet=productAspectRatio,values:95|105",
  ];

  const filterString = filters.join(" and ");

  return `api-version=2016-09-01&search=*&$count=true&$top=${params.top || 50}&$filter=${encodeURIComponent(filterString)}&${facets.join("&")}&scoringProfile=Boost%20by%20production%20country&scoringParameter=prodCountry-${params.destinationCountry}`;
}
```

### 9.2 Facet Response Handler

```typescript
interface FacetValue {
  value?: string;
  from?: number;
  to?: number;
  count: number;
}

interface FacetResponse {
  "@search.facets": {
    [key: string]: FacetValue[];
  };
}

function parseFacets(response: FacetResponse) {
  const facets = response["@search.facets"];

  return {
    frames: facets.frame || [],
    frameColours: facets.frameColour || [],
    glazes: facets.glaze || [],
    mounts: facets.mount || [],
    mountColours: facets.mountColour || [],
    paperTypes: facets.paperType || [],
    finishes: facets.finish || [],
    edges: facets.edge || [],
    sizes: facets.size || [],
    dimensionRanges: facets.maxProductDimensionsMm || [],
    aspectRatios: facets.productAspectRatio || [],
  };
}
```

### 9.3 Product Type Detection

```typescript
function getProductType(product: any): string {
  if (
    product.frame?.includes("stretcher bar") &&
    !product.frameColour?.length
  ) {
    return "stretched-canvas";
  }
  if (product.frame?.includes("float frame")) {
    return "framed-canvas";
  }
  if (product.frameColour?.length && product.glaze?.length) {
    return "framed-print";
  }
  if (product.productType?.toLowerCase().includes("rolled")) {
    return "rolled-print";
  }
  return "other";
}
```

---

## 10. UI/UX Recommendations

### 10.1 Filter Organization

**Recommended Filter Order**:

1. **Size** (most important for customers)
   - Visual size picker
   - Standard sizes quick select
   - Custom dimensions

2. **Orientation/Aspect Ratio**
   - Auto-detected from image
   - Portrait / Square / Landscape icons

3. **Product Type**
   - Framed Print
   - Framed Canvas
   - Stretched Canvas
   - Rolled Print

4. **Frame Style** (if applicable)
   - No Frame
   - Classic
   - Box
   - Float
   - Ornate

5. **Frame Color** (if applicable)
   - Visual swatches with textures

6. **Glazing** (if framed)
   - None
   - Acrylic (with info icon)
   - Glass
   - Museum Glass (motheye)

7. **Mount/Mat** (if framed print)
   - No mount
   - With mount (thickness options)

8. **Mount Color** (if mount selected)
   - Visual swatches

9. **Paper/Material**
   - Grouped by type
   - Premium badge for special materials

10. **Finish** (if applicable)
    - Gloss / Matte / Lustre

### 10.2 Mobile-First Filter Design

**Progressive Disclosure**:

- Show top 3 most important filters initially
- "More options" expandable section
- Bottom sheet on mobile
- Sticky "View X products" button

**Filter Chips**:

- Show active filters as removable chips
- "Clear all" option
- Count indicator

### 10.3 Visual Aids

**Must Have**:

- Frame color swatches with real textures
- Size comparison tool (overlay on room photo)
- Material samples (hover to see close-up)
- Mount border visualization

**Nice to Have**:

- 360° product rotation
- AR preview
- "See in your room" feature
- Before/after comparison (framed vs unframed)

---

## 11. Performance Optimization

### 11.1 Caching Strategy

**Cache Layers**:

1. **Facet Data** - Cache for 1 hour
   - Facet counts change rarely
   - Refresh on filter change

2. **Product Catalog** - Cache for 6 hours
   - Base catalog stable
   - Invalidate on price updates

3. **Images** - CDN cache
   - Prodigi product images
   - Color swatches
   - Material textures

### 11.2 Query Optimization

**Best Practices**:

- Request only needed fields with `$select`
- Use pagination (`$top`, `$skip`)
- Limit facet counts to 100
- Combine multiple filters in single query
- Use scoring profiles for relevance

---

## 12. Key Takeaways

### Current State

✅ Basic frame selection
✅ Size options
✅ Simple color choices

### Missing Opportunities

❌ 90% of Prodigi's customization options unused
❌ No faceted search
❌ No aspect ratio matching
❌ No material variety
❌ No glazing options
❌ No mount/mat customization
❌ No production location optimization

### Business Impact

- **Customer Satisfaction**: Customers want options (glaze, mounts, paper types)
- **Competitive Advantage**: Most POD competitors offer limited customization
- **Average Order Value**: More premium options = higher AOV
- **Conversion Rate**: Better product matching = higher conversion

### Implementation Priority

1. **Phase 1** (Week 1): Aspect ratio + Size filtering → IMMEDIATE IMPACT
2. **Phase 2** (Week 2): Frame + Color + Glaze → COMPLETE CUSTOMIZATION
3. **Phase 3** (Week 3): Mounts + Paper types → PROFESSIONAL GRADE
4. **Phase 4** (Week 4): Progressive filtering + Visual guides → PREMIUM UX
5. **Phase 5** (Week 5): Advanced features → MARKET LEADER

---

## 13. Next Steps

### Immediate Actions

1. ✅ Review this document with team
2. ⬜ Prioritize phases based on business goals
3. ⬜ Design filter UI mockups
4. ⬜ Create product type taxonomy
5. ⬜ Implement Phase 1 (aspect ratio + size)

### Week 1 Goals

- [ ] Implement aspect ratio filtering
- [ ] Add size range selector
- [ ] Enable production location scoring
- [ ] Create filter component architecture

### Success Metrics

- Product selection time
- Filter usage rate
- Cart abandonment rate
- Average order value
- Customer satisfaction scores
- Support tickets related to product options

---

## 14. Appendix

### A. Prodigi Azure Search Query Examples

**Get All Wall Art with Facets**:

```
GET https://pwintylive.search.windows.net/indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$filter=destinationCountries/any(c: c eq 'US') and category eq 'Wall art'
  &$top=0
  &facet=frame,count:100
  &facet=frameColour,count:100
  &facet=glaze,count:100
  &facet=mount,count:100
  &facet=mountColour,count:100
  &facet=paperType,count:100
  &facet=finish,count:100
  &facet=edge
  &facet=size,count:100
  &facet=maxProductDimensionsMm,values:300|500|700|1000|1500
  &facet=productAspectRatio,values:95|105
```

**Get Products with Specific Filters**:

```
GET https://pwintylive.search.windows.net/indexes/live-catalogue/docs?
  api-version=2016-09-01
  &search=*
  &$count=true
  &$top=50
  &$filter=destinationCountries/any(c: c eq 'US')
    and category eq 'Wall art'
    and frameColour/any(c: c eq 'black')
    and glaze/any(g: g eq 'acrylic / perspex')
  &scoringProfile=Boost by production country
  &scoringParameter=prodCountry-US
  &$select=sku,description,productType,frameColour,glaze,basePriceFrom,priceCurrency,sla
```

### B. Common OData Filter Patterns

**Array Contains**:

```
frameColour/any(c: c eq 'black')
```

**Numeric Range**:

```
maxProductDimensionsMm ge 500 and maxProductDimensionsMm le 1000
```

**Multiple OR Conditions**:

```
(frameColour/any(c: c eq 'black') or frameColour/any(c: c eq 'white'))
```

**Combining AND + OR**:

```
category eq 'Wall art'
and (frameColour/any(c: c eq 'black') or frameColour/any(c: c eq 'white'))
and maxProductDimensionsMm ge 500
```

### C. Useful Resources

- Prodigi Dashboard: https://dashboard.prodigi.com
- Azure Search API Docs: https://docs.microsoft.com/en-us/rest/api/searchservice/
- OData Filter Syntax: https://docs.microsoft.com/en-us/azure/search/search-query-odata-filter

---

**Document Version**: 1.0
**Last Updated**: November 20, 2024
**Author**: Reverse Engineered from Prodigi Dashboard
**Status**: Ready for Implementation
