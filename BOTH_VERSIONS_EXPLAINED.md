# 📦 **Two Prodigi Integrations - Both Active**

## 🎯 **Why Two Versions?**

You have **two separate Prodigi integrations** serving different parts of your app:

---

## 📂 **Version 1 (Frame Catalog) - Main App UI**

### Location:
```
src/lib/prodigi-frame-catalog.ts
```

### Purpose:
- **Used by**: Main app UI (Product pages, frame selectors, etc.)
- **API**: Uses old Prodigi REST API (`ProdigiClient`)
- **Focus**: Frame/canvas products with expanded color options
- **Status**: ✅ **Active - DO NOT DELETE**

### Features:
- Fetches all products from Prodigi
- **Expands** each product into multiple options (one per color)
- Organizes by size categories (small, medium, large, extra_large)
- Live currency conversion
- Caching (1 hour)

### Used By:
- `src/hooks/useProdigiFrameCatalog.ts`
- `src/app/api/prodigi/frame-catalog/route.ts`
- Main product selector components

### Example:
```typescript
import { prodigiFrameCatalog } from '@/lib/prodigi-frame-catalog';

const options = await prodigiFrameCatalog.getFrameOptions();
// Returns: [
//   { sku: 'X', size: 'small', style: 'black', ... },
//   { sku: 'X', size: 'small', style: 'white', ... }, // Same SKU, different color
//   ...
// ]
```

---

## 📂 **Version 2 (Azure Search + REST API) - /studio**

### Location:
```
src/lib/prodigi-v2/
├── client.ts              ← REST API v4
├── quotes.ts
├── orders.ts
├── catalog.ts             ← Uses Azure Search
└── azure-search/          ← Reverse-engineered catalog
    ├── client.ts
    ├── query-builder.ts
    ├── product-matcher.ts
    ├── service.ts
    └── types.ts
```

### Purpose:
- **Used by**: `/studio` AI-powered customization
- **API**: Prodigi REST API v4 + Azure Search catalog
- **Focus**: Complete product discovery, quotes, orders
- **Status**: ✅ **Active - Main SDK**

### Features:
- **Azure Search**: Query Prodigi's internal catalog
- **Smart matching**: AI-powered product recommendations
- **Real quotes**: Live pricing from Prodigi API
- **Full ordering**: Create and manage orders
- **Dynamic SKU lookup**: No hardcoded SKUs

### Used By:
- `src/app/(studio)/studio/page.tsx`
- `src/app/api/studio/pricing/route.ts`
- `src/app/api/studio/chat/route.ts`
- AI chat integration

### Example:
```typescript
import { ProdigiSDK } from '@/lib/prodigi-v2';

const sdk = new ProdigiSDK({ apiKey: '...' });

// Dynamic SKU lookup via Azure Search
const sku = await sdk.catalog.getSKU('canvas', '36x48', 'US');

// Real quote
const quotes = await sdk.quotes.create({ ... });

// Full Azure Search
const products = await sdk.azureSearch.search({
  country: 'US',
  category: 'Wall art',
});
```

---

## 🔄 **Key Differences**

| Aspect | v1 (Frame Catalog) | v2 (Azure Search + SDK) |
|--------|-------------------|------------------------|
| **Location** | `prodigi-frame-catalog.ts` | `prodigi-v2/` |
| **Used By** | Main app UI | `/studio` |
| **Data Source** | Prodigi REST API | Azure Search + REST API v4 |
| **Focus** | Frame products | All products |
| **Color Handling** | **Expands** products by color | Single product per SKU |
| **SKU Lookup** | Not needed (uses expanded options) | **Dynamic** via Azure Search |
| **Pricing** | Base prices with markup | **Real-time quotes** |
| **Ordering** | Not supported | **Full order management** |
| **Caching** | 1 hour | 1 hour |
| **Status** | ✅ Active | ✅ Active |

---

## 🎨 **Example: Same Canvas Product**

### v1 (Frame Catalog) Approach:
```typescript
// Fetches product once, expands into multiple color options
const product = await fetchProduct('GLOBAL-CAN-36X48');

// Result: Multiple options from same SKU
[
  { sku: 'GLOBAL-CAN-36X48', style: 'black', ... },
  { sku: 'GLOBAL-CAN-36X48', style: 'white', ... },
  { sku: 'GLOBAL-CAN-36X48', style: 'natural', ... },
]
```

### v2 (Azure Search) Approach:
```typescript
// Query: Find canvas 36x48 for US
const result = await azureSearch.search({
  country: 'US',
  productTypes: ['Canvas'],
  size: '36x48'
});

// Result: Single product with available colors as attribute
{
  sku: 'GLOBAL-CAN-91X122',
  productType: 'Canvas',
  frameColour: ['black', 'white', 'natural'], // Available as attribute
  size: '91x122cm'
}
```

---

## 🚀 **When to Use Which?**

### Use v1 (Frame Catalog):
```typescript
// ✅ Main app product selector
// ✅ Frame color picker
// ✅ Size selection UI
// ✅ Price display (estimated)

import { useProdigiFrameCatalog } from '@/hooks/useProdigiFrameCatalog';

function ProductSelector() {
  const { options, colors, combinations } = useProdigiFrameCatalog();
  
  return (
    <select>
      {colors.map(color => (
        <option value={color}>{color}</option>
      ))}
    </select>
  );
}
```

### Use v2 (Azure Search + SDK):
```typescript
// ✅ /studio AI customization
// ✅ Real-time pricing
// ✅ Order creation
// ✅ Product discovery
// ✅ Smart recommendations

import { ProdigiSDK } from '@/lib/prodigi-v2';

async function getPricing(productType: string, size: string) {
  const sdk = new ProdigiSDK({ apiKey: '...' });
  
  // Dynamic SKU lookup
  const sku = await sdk.catalog.getSKU(productType, size, 'US');
  
  // Real quote
  const quotes = await sdk.quotes.create({
    destinationCountryCode: 'US',
    items: [{ sku, copies: 1, assets: [...] }]
  });
  
  return quotes[0].costSummary.totalCost;
}
```

---

## 📊 **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                     Your App                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Main App UI                       /studio                  │
│  ├── Product Selector              ├── AI Chat              │
│  ├── Frame Color Picker            ├── 3D Preview           │
│  ├── Size Selection                ├── Real-time Pricing    │
│  └── Price Display                 └── Order Creation       │
│       │                                  │                   │
│       ↓                                  ↓                   │
│                                                              │
│  ┌─────────────────┐           ┌──────────────────────┐    │
│  │ v1 Frame Catalog│           │  v2 Prodigi SDK      │    │
│  │                 │           │                      │    │
│  │ • Fetch products│           │ • Azure Search       │    │
│  │ • Expand colors │           │ • REST API v4        │    │
│  │ • Categorize    │           │ • Dynamic SKU lookup │    │
│  │ • Price markup  │           │ • Real quotes        │    │
│  └────────┬────────┘           │ • Full ordering      │    │
│           │                    └──────────┬───────────┘    │
│           ↓                               ↓                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    Prodigi API                               │
│  ┌────────────────────────┐   ┌────────────────────────┐   │
│  │ Old REST API           │   │ Azure Search + v4 API  │   │
│  │ /products              │   │ • Live catalog search  │   │
│  │ (all products)         │   │ • Quotes API           │   │
│  └────────────────────────┘   │ • Orders API           │   │
│                                └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ **Both Are Active - Both Are Needed**

### ✅ **v1 (Frame Catalog)**
- **Status**: Active
- **Purpose**: Main app UI
- **Keep**: YES
- **File**: `src/lib/prodigi-frame-catalog.ts`

### ✅ **v2 (Azure Search + SDK)**
- **Status**: Active
- **Purpose**: `/studio` AI customization
- **Keep**: YES
- **Folder**: `src/lib/prodigi-v2/`

---

## 🔧 **Migration Path (Future)**

Eventually you may want to unify them:

### Option 1: Migrate Main App to v2
```typescript
// Replace v1 hooks with v2 Azure Search
import { azureSearch } from '@/lib/prodigi-v2';

const products = await azureSearch.search({
  country: 'US',
  category: 'Wall art',
});

// Manually expand colors in UI
products.forEach(product => {
  product.frameColour?.forEach(color => {
    // Create option per color
  });
});
```

### Option 2: Enhance v1 with Azure Search
```typescript
// Add Azure Search to v1 for better discovery
// Keep color expansion logic
// Best of both worlds
```

---

## 📚 **Summary**

| Version | Status | Purpose | Files |
|---------|--------|---------|-------|
| **v1** | ✅ Active | Main app UI | `prodigi-frame-catalog.ts` |
| **v2** | ✅ Active | `/studio` | `prodigi-v2/` |

**Both are needed!** Don't delete either one. They serve different parts of your application.

---

**Updated**: November 21, 2025  
**Status**: ✅ **Both Active**  
**Action**: Keep both integrations

