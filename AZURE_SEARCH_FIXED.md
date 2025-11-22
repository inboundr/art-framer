# ✅ **Azure Search Fixed - Now Matches Prodigi Dashboard**

## 🎯 **What Was Wrong**

Our Azure Search queries weren't matching Prodigi's dashboard format, causing errors and returning 0 results.

---

## 🔍 **Prodigi Dashboard Query Pattern**

### Example Query:

```
$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and glaze/any(t: search.in(t, 'acrylic / perspex', '|'))
```

### Key Features:

1. **`search.in()` function** for array filters
2. **Pipe delimiter** `|` for multiple values
3. **Facets without `facet=` prefix** when using `params.append('facet', ...)`
4. **`$top=0`** to get just facets (no products)

---

## 🔧 **What We Fixed**

### 1. **Filter Syntax** (CRITICAL)

#### Before ❌:

```typescript
// Used simple equality with OR
glaze/any(g: g eq 'acrylic / perspex') or glaze/any(g: g eq 'motheye')
```

#### After ✅:

```typescript
// Uses search.in() like Prodigi
glaze/any(t: search.in(t, 'acrylic / perspex|motheye', '|'))
```

### 2. **Facet Format**

#### Before ❌:

```typescript
return [
  "facet=frame,count:100", // Wrong - adds 'facet=' twice
  "facet=glaze,count:100",
];
```

#### After ✅:

```typescript
return [
  "frame,count:100", // Correct - params.append() adds 'facet='
  "glaze,count:100",
];
```

### 3. **Import Path**

#### Before ❌:

```typescript
import { azureSearchClient } from "./azure-search-client"; // File doesn't exist
```

#### After ✅:

```typescript
import { azureSearchClient } from "./client"; // Correct path
```

---

## 📊 **Updated Query Builder**

### All Array Filters Now Use `search.in()`:

```typescript
// Frame colors
if (this.filters.frameColors?.length) {
  const colorValues = this.filters.frameColors
    .map((c) => this.escapeOData(c))
    .join("|");
  filterParts.push(`frameColour/any(t: search.in(t, '${colorValues}', '|'))`);
}

// Glazes
if (this.filters.glazes?.length) {
  const glazeValues = this.filters.glazes
    .map((g) => this.escapeOData(g))
    .join("|");
  filterParts.push(`glaze/any(t: search.in(t, '${glazeValues}', '|'))`);
}

// Mounts
if (this.filters.mounts?.length) {
  const mountValues = this.filters.mounts
    .map((m) => this.escapeOData(m))
    .join("|");
  filterParts.push(`mount/any(t: search.in(t, '${mountValues}', '|'))`);
}

// ... same for all array fields
```

---

## 🎨 **How Prodigi Dashboard Works**

### 1. **Initial Load** - Get all available options:

```http
GET /indexes/live-catalogue/docs
?api-version=2016-09-01
&search=*
&$filter=destinationCountries/any(c: c eq 'US') and category eq 'Wall art'
&$top=0
&facet=glaze,count:100
&facet=frame,count:100
&facet=frameColour,count:100
&facet=mount,count:100
&facet=size,count:100
```

**Response**:

```json
{
  "@search.facets": {
    "glaze": [
      { "value": "acrylic / perspex", "count": 683 },
      { "value": "float glass", "count": 449 },
      { "value": "motheye", "count": 120 }
    ],
    "frameColour": [
      { "value": "black", "count": 1132 },
      { "value": "white", "count": 1086 }
    ]
  }
}
```

### 2. **User Selects "Black Mount"** - Get compatible options:

```http
GET /indexes/live-catalogue/docs
?api-version=2016-09-01
&search=*
&$filter=destinationCountries/any(c: c eq 'US')
  and category eq 'Wall art'
  and mountColour/any(t: search.in(t, 'black', '|'))
&$top=0
&facet=glaze,count:100
&facet=frameColour,count:100
```

**Response**:

```json
{
  "@search.facets": {
    "glaze": [
      { "value": "acrylic / perspex", "count": 683 },
      { "value": "float glass", "count": 449 }
    ],
    "frameColour": [
      { "value": "black", "count": 1132 },
      { "value": "white", "count": 1086 },
      { "value": "natural", "count": 1132 }
    ]
  }
}
```

### 3. **Dashboard Grays Out Options** with `count: 0`

If `"glaze": "motheye"` has `count: 0` after selecting black mount, it gets grayed out in the UI.

---

## ✅ **Example Queries**

### Get All Wall Art in US:

```typescript
import { azureSearchClient } from "@/lib/prodigi-v2/azure-search/client";

const result = await azureSearchClient.search(
  {
    country: "US",
    category: "Wall art",
  },
  {
    top: 50,
    includeFacets: true,
  }
);

console.log(`Found ${result.totalCount} products`);
console.log("Available glazes:", result.facets.glazes);
```

### Filter by Glaze Type:

```typescript
const result = await azureSearchClient.search(
  {
    country: "US",
    category: "Wall art",
    glazes: ["acrylic / perspex", "motheye"],
  },
  {
    top: 0, // Just get facets
    includeFacets: true,
  }
);

// Returns facets showing what other options are compatible
console.log("Compatible frame colors:", result.facets.frameColors);
```

### Get Canvas Products:

```typescript
const result = await azureSearchClient.search(
  {
    country: "US",
    category: "Wall art",
    productTypes: ["Canvas", "Stretched canvas"],
  },
  {
    top: 50,
  }
);

console.log(`Found ${result.products.length} canvas products`);
```

---

## 🧪 **Test Queries**

### 1. Test Basic Search:

```bash
curl 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs?api-version=2016-09-01&search=*&$count=true&$filter=destinationCountries/any(c:%20c%20eq%20%27US%27)%20and%20category%20eq%20%27Wall%20art%27&$top=10' \
  -H 'api-key: 9142D85CE18C3AE0349B1FB21956B072'
```

### 2. Test Facets:

```bash
curl 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs?api-version=2016-09-01&search=*&$filter=destinationCountries/any(c:%20c%20eq%20%27US%27)%20and%20category%20eq%20%27Wall%20art%27&$top=0&facet=glaze,count:100&facet=frameColour,count:100' \
  -H 'api-key: 9142D85CE18C3AE0349B1FB21956B072'
```

### 3. Test Glaze Filter:

```bash
curl 'https://pwintylive.search.windows.net/indexes/live-catalogue/docs?api-version=2016-09-01&search=*&$filter=destinationCountries/any(c:%20c%20eq%20%27US%27)%20and%20category%20eq%20%27Wall%20art%27%20and%20glaze/any(t:%20search.in(t,%20%27motheye%27,%20%27|%27))&$top=10' \
  -H 'api-key: 9142D85CE18C3AE0349B1FB21956B072'
```

---

## 📚 **Key Learnings**

### 1. **`search.in()` is More Efficient**

- Prodigi uses it for all array field filters
- Better performance than multiple `OR` conditions
- Standard OData function

### 2. **Facets Show Available Combinations**

- Set `$top=0` to get just facets
- Use facet counts to gray out incompatible options
- Dynamic filtering based on user selections

### 3. **Exact Field Names Matter**

- `frameColour` not `frameColor`
- `mountColour` not `mountColor`
- Case-sensitive in Azure Search

### 4. **Escaping is Important**

- Values with spaces need proper escaping
- Use `''` to escape single quotes in OData
- URL-encode special characters

---

## ✅ **Status**

| Component         | Status     | Notes                      |
| ----------------- | ---------- | -------------------------- |
| **Filter Syntax** | ✅ Fixed   | Now uses `search.in()`     |
| **Facet Format**  | ✅ Fixed   | Removed duplicate `facet=` |
| **Import Paths**  | ✅ Fixed   | Points to correct files    |
| **Query Builder** | ✅ Updated | Matches Prodigi dashboard  |
| **Linting**       | ✅ Clean   | 0 errors                   |

---

## 🚀 **Next Steps**

1. **Test the queries** in `/studio`
2. **Verify facets work** for dynamic filtering
3. **Add facet UI** to show/hide incompatible options
4. **Cache facet results** for better performance

---

**Updated**: November 21, 2025  
**Status**: ✅ **Matches Prodigi Dashboard**  
**Test**: Try selecting products in `/studio`
