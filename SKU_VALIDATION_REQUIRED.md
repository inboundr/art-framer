# ⚠️ **SKU VALIDATION REQUIRED**

## 🔴 **Critical Issue: Invalid SKUs**

You're seeing 400 errors from Prodigi because the SKUs in the catalog might not be real.

---

## 🐛 **Current Error**

```
[Catalog] Found SKU: GLOBAL-CAN-36X48 for canvas 36x48
[Pricing] Requesting quote from Prodigi
❌ Prodigi API Error: Bad Request (400)
```

**Reason**: The SKU `GLOBAL-CAN-36X48` might not exist in Prodigi's catalog.

---

## ✅ **Solution: Validate & Update SKUs**

### Step 1: Run the Validation Script

```bash
npx tsx test-prodigi-skus.ts
```

This will test all SKUs against the real Prodigi API and tell you which ones are invalid.

### Step 2: Get Real SKUs from Prodigi

**Option A: Use Prodigi Dashboard**
1. Log into https://dashboard.prodigi.com
2. Go to Products → Browse Catalog
3. Find the product you want (e.g., Canvas 36x48)
4. Copy the exact SKU (e.g., might be `GLOBAL-CAN-91X122` for 36x48 inches)

**Option B: Use Prodigi API**

Test individual SKUs:
```bash
curl -H "X-API-Key: YOUR_KEY" \
  https://api.prodigi.com/v4.0/products/GLOBAL-CAN-36X48
```

If you get 404, the SKU doesn't exist.

**Option C: Contact Prodigi Support**

Email support@prodigi.com and ask for:
- A catalog export file
- List of available SKUs for your account
- SKU format documentation

### Step 3: Update the Catalog

Edit `src/lib/prodigi-v2/catalog.ts`:

```typescript
// Replace guessed SKUs with real ones
'canvas': {
  '36x48': 'GLOBAL-CAN-91X122', // ← Update with real SKU
  // ... other sizes
},
```

### Step 4: Test Again

```bash
npm run build
npm run dev
# Try selecting Canvas 36x48 again
```

---

## 📋 **Common SKU Patterns**

Prodigi typically uses these patterns, but **they vary by region and account**:

### Prints & Frames:
- Framed Print: `GLOBAL-FPRI-{WIDTH}X{HEIGHT}` or `GLOBAL-FRA-{WIDTH}X{HEIGHT}`
- Canvas: `GLOBAL-CAN-{WIDTH_CM}X{HEIGHT_CM}` (often in CM, not inches!)
- Framed Canvas: `GLOBAL-FC-{WIDTH}X{HEIGHT}`

### Size Conversions:
Canvas sizes might be in **centimeters**, not inches:
- 36x48 inches = 91.4x122 cm ≈ `GLOBAL-CAN-91X122`
- 24x36 inches = 61x91 cm ≈ `GLOBAL-CAN-61X91`
- 16x20 inches = 40.6x50.8 cm ≈ `GLOBAL-CAN-41X51`

**This is why validation is critical!**

---

## 🔧 **Quick Fix for Testing**

If you need to test immediately, try these alternative approaches:

### Option 1: Use Smaller Sizes First

Try a common, smaller size that's more likely to exist:

```typescript
// In catalog.ts, temporarily comment out larger sizes
'canvas': {
  '8x10': 'GLOBAL-CAN-8X10',
  '16x20': 'GLOBAL-CAN-16X20',
  // '36x48': 'GLOBAL-CAN-36X48', // ← Comment out until validated
},
```

### Option 2: Query Prodigi for Available Products

Create a test endpoint to search:

```typescript
// Test endpoint to list available canvas products
const response = await fetch('https://api.prodigi.com/v4.0/products/GLOBAL-CAN-20X25', {
  headers: { 'X-API-Key': process.env.PRODIGI_API_KEY }
});

// If this works, try nearby sizes like GLOBAL-CAN-20X30, etc.
```

### Option 3: Use API Error Details

If Prodigi returns error details about what's wrong:
1. Check browser network tab
2. Look at the response body
3. It might say "SKU not found" or suggest alternatives

---

## 📊 **Validated SKUs List**

Once you validate SKUs, update this list:

### ✅ Confirmed Working:
```
(Run test-prodigi-skus.ts and add confirmed SKUs here)
```

### ❌ Confirmed Invalid:
```
- GLOBAL-CAN-36X48 (doesn't exist, use GLOBAL-CAN-91X122 instead)
```

---

## 🎯 **Action Items**

- [ ] Run `npx tsx test-prodigi-skus.ts`
- [ ] Note which SKUs return 404
- [ ] Check Prodigi dashboard for correct SKUs
- [ ] Update `src/lib/prodigi-v2/catalog.ts`
- [ ] Re-run validation script
- [ ] Test in browser
- [ ] Update this file with confirmed SKUs

---

## 💡 **Why This Happened**

The SKUs in the catalog were **educated guesses** based on common Prodigi naming patterns. However:

1. **Prodigi doesn't have a "list all products" API** - you can only fetch individual products by SKU
2. **SKUs vary by account/region** - what works for one merchant might not work for another
3. **Product availability changes** - Prodigi adds/removes products over time

This is why **manual validation is required** before going to production.

---

## 🚀 **Once Validated**

After updating the catalog with real SKUs:

1. ✅ Pricing will work perfectly
2. ✅ Quotes will be accurate
3. ✅ Orders will process successfully
4. ✅ No more 400 errors

---

## 📞 **Need Help?**

1. **Prodigi Support**: support@prodigi.com
2. **Prodigi API Docs**: https://www.prodigi.com/print-api/docs/
3. **Run the test script**: `npx tsx test-prodigi-skus.ts`

---

**Status**: ⚠️ **ACTION REQUIRED - Validate SKUs**  
**Priority**: 🔴 **Critical - Blocking Production**  
**Time Estimate**: 30-60 minutes to validate all SKUs

