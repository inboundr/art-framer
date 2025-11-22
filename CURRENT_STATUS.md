# 🔍 **Current Status & Diagnosis**

## ✅ **Fixed Issues**

### 1. Attribute Filtering (FIXED)
**Problem**: Canvas was being sent with `glaze` attribute
**Solution**: Rewrote `buildProductAttributes()` to filter by product type
**Status**: ✅ **Code updated**, dev server restarting

---

## ⚠️ **Remaining Issue: Invalid SKUs**

### The Real Problem

Your logs show **two separate errors**:

#### Error #1: Invalid SKU Format
```
[Catalog] Found SKU: GLOBAL-CAN-36X48 for canvas 36x48
❌ Prodigi API Error: Bad Request (400)
```

#### Error #2: Missing SKUs
```
[Catalog] No SKU found for framed-print 36x48
POST /api/studio/pricing 404
```

#### Error #3: Even Small Sizes Fail
```
[Catalog] Found SKU: GLOBAL-FPRI-11X14 for framed-print 11x14
❌ Prodigi API Error: Bad Request (400)
```

**Conclusion**: The SKUs in the catalog **don't exist in your Prodigi account**.

---

## 🎯 **Root Cause**

The SKUs like `GLOBAL-CAN-36X48`, `GLOBAL-FPRI-11X14`, etc. are **educated guesses** based on common naming patterns. They need to be replaced with **real SKUs from your Prodigi dashboard**.

### Why Prodigi Returns 400

Prodigi's API returns a generic `Bad Request (400)` error when:
1. The SKU doesn't exist
2. The SKU exists but attributes are wrong
3. The SKU exists but isn't available for your account/region

In your case, **the SKUs simply don't exist**.

---

## 🔧 **How to Fix**

### Step 1: Get Real SKUs from Prodigi

**Option A: Dashboard** (Fastest)
1. Go to https://dashboard.prodigi.com
2. Click "Products" or "Catalog"
3. Search for "Canvas 36x48" or "Framed Print 11x14"
4. Copy the exact SKU shown

**Option B: API Query**
```bash
# Test if a SKU exists
curl -H "X-API-Key: $PRODIGI_API_KEY" \
  https://api.prodigi.com/v4.0/products/GLOBAL-CAN-36X48

# If 404, try variations:
curl -H "X-API-Key: $PRODIGI_API_KEY" \
  https://api.prodigi.com/v4.0/products/GLOBAL-CAN-91X122  # 36x48 inches in cm
```

**Option C: Contact Prodigi**
- Email: support@prodigi.com
- Ask for: "Complete SKU list for wall art products available in US"

### Step 2: Update Catalog

Edit `src/lib/prodigi-v2/catalog.ts`:

```typescript
const VERIFIED_SKUS: SkuMapping[] = [
  // Replace with REAL SKUs from your dashboard
  { productType: 'canvas', size: '8x10', sku: 'ACTUAL-SKU-FROM-PRODIGI' },
  { productType: 'canvas', size: '11x14', sku: 'ACTUAL-SKU-FROM-PRODIGI' },
  { productType: 'canvas', size: '36x48', sku: 'ACTUAL-SKU-FROM-PRODIGI' },
  
  { productType: 'framed-print', size: '8x10', sku: 'ACTUAL-SKU-FROM-PRODIGI' },
  { productType: 'framed-print', size: '11x14', sku: 'ACTUAL-SKU-FROM-PRODIGI' },
  // ... etc
];
```

### Step 3: Validate

```bash
npx tsx test-prodigi-skus.ts
```

This will test each SKU and tell you which ones are valid.

---

## 📊 **Current Test Results**

Based on your logs:

| SKU | Product | Size | Status |
|-----|---------|------|--------|
| `GLOBAL-CAN-36X48` | Canvas | 36x48 | ❌ **Invalid** |
| `GLOBAL-FPRI-36X48` | Framed Print | 36x48 | ❌ **Invalid** |
| `GLOBAL-FPRI-11X14` | Framed Print | 11x14 | ❌ **Invalid** |
| _(not in catalog)_ | Framed Print | 36x48 | ❌ **Missing** |

**All tested SKUs are invalid.** This strongly suggests the SKU format is wrong.

---

## 💡 **Common Prodigi SKU Patterns**

Based on their documentation, SKUs often follow these patterns:

### For Canvas (might be in centimeters!):
- US: `GLOBAL-CAN-{WIDTH_CM}X{HEIGHT_CM}`
- Example: 36x48 inches = 91x122 cm → `GLOBAL-CAN-91X122`

### For Framed Prints:
- US: `GLOBAL-FPRI-{WIDTH}X{HEIGHT}`
- Or: `GLOBAL-FRA-{WIDTH}X{HEIGHT}`
- Or: `US-FPRI-{WIDTH}X{HEIGHT}`

### Regional Variants:
- Some products have region-specific SKUs
- Example: `US-CAN-36X48` vs `EU-CAN-91X122`

**The exact format depends on your Prodigi account configuration.**

---

## 🚀 **Next Steps**

1. ✅ **Dev server is restarting** (attribute fix will apply)
2. ⚠️ **Get real SKUs** from Prodigi dashboard
3. ⚠️ **Update catalog.ts** with real SKUs
4. ⚠️ **Run validation script**: `npx tsx test-prodigi-skus.ts`
5. ✅ **Test in browser** - should work!

---

## ⏱️ **Time Estimate**

| Task | Time |
|------|------|
| Get 5-10 SKUs from dashboard | 10-15 min |
| Update catalog.ts | 5 min |
| Run validation script | 2 min |
| Test | 5 min |
| **TOTAL** | **~25 minutes** |

---

## 📝 **Important Notes**

### Why We Can't Auto-Discover SKUs

Prodigi's API **does not** provide:
- A "list all products" endpoint
- A "search products" endpoint
- A "browse catalog" endpoint

You can **only** fetch products by exact SKU. This means:
- SKUs must be obtained from the dashboard or support
- They must be manually validated
- There's no programmatic way to discover them

### Why Validation is Critical

- **Wrong SKUs = 400 errors** (what you're seeing now)
- **Production orders will fail** if SKUs are wrong
- **Pricing will fail** without valid SKUs

---

## 🎯 **Quick Test**

Once dev server restarts, try this in browser console:

```javascript
fetch('/api/studio/pricing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      productType: 'canvas',
      size: '8x10',
      imageUrl: 'https://via.placeholder.com/1000',
      wrap: 'Black'
    }
  })
}).then(r => r.json()).then(console.log)
```

**Expected now**: Still 400 (invalid SKU)  
**Expected after fix**: Real pricing like `{ total: 42.50, shipping: 7.50 }`

---

## 📞 **Need Help?**

1. **Check Prodigi Dashboard**: https://dashboard.prodigi.com
2. **Email Prodigi**: support@prodigi.com
3. **Run validation**: `npx tsx test-prodigi-skus.ts`

---

**Status**: Attribute filtering ✅ Fixed | SKU validation ⚠️ Required  
**Blocker**: Invalid SKUs in catalog  
**Action**: Get real SKUs from Prodigi dashboard  
**Priority**: 🔴 Critical

---

**Updated**: November 21, 2025  
**Next Check**: After updating catalog with real SKUs


