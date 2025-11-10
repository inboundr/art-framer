# Frame Filtering Debug - What We Found

## 🎉 Good News!

The Azure Search Index integration is **working perfectly**:
- ✅ **2359 frame options loaded** (way more than expected!)
- ✅ Data is fetching successfully from Prodigi
- ✅ 5 frame colors available
- ✅ Catalog stats are being retrieved

## ⚠️ The Problem

Frame filtering is **not working**:

```
⚠️ FrameSelector: No matching frames found 
   {selectedSize: 'medium', selectedStyle: 'white', selectedMaterial: 'wood'}
```

**Zero frames match the filter** even though we have 2359 options loaded!

---

## 🔍 What We've Added

### Debug Logging

Added comprehensive debug logging to `FrameSelector.tsx` (lines 85-115) to see:

1. **Total options count**
2. **First 5 options structure** (size, style, material)
3. **Size distribution** - How many of each size
4. **Style distribution** - How many of each style (color)
5. **Material distribution** - How many of each material

---

## 🚀 Next Steps

### 1. Restart Dev Server & Test

```bash
# Clear cache if needed
rm -rf .next

# Restart
npm run dev
```

### 2. Open Frame Selector & Check Console

Navigate to the frame selector and look for these debug logs:

```
🔍 DEBUG: Total FRAME_OPTIONS: 2359
🔍 DEBUG: First 5 options: [...]
🔍 DEBUG: Size distribution: {...}
🔍 DEBUG: Style distribution: {...}
🔍 DEBUG: Material distribution: {...}
```

---

## 🎯 What to Look For

### Expected Values

**Sizes** should be:
- `'small'`
- `'medium'`
- `'large'`
- `'extra_large'`

**Styles** should be normalized to:
- `'white'`
- `'black'`
- `'natural'`
- `'silver'`
- `'gold'`

**Materials** should be:
- `'wood'`
- `'canvas'`
- `'metal'`
- `'acrylic'`

### Potential Issues

If you see:

❌ **Sizes like**: `"16x20"`, `"30x40"`, `"12.0078x15.9842"` (actual dimensions)
- **Problem**: Size mapping not working
- **Cause**: `mapSizeToCategory()` not being called correctly

❌ **Styles like**: `"oxford blue"`, `"blk"`, `"light grey"` (raw Prodigi colors)
- **Problem**: Color normalization not working
- **Cause**: `normalizeFrameColor()` not working or being bypassed

❌ **Materials like**: `undefined`, `null`, or weird values
- **Problem**: Material extraction failing
- **Cause**: `extractMaterial()` logic issues

---

## 🛠️ Possible Fixes

### If Sizes Are Wrong

The `mapSizeToCategory()` function (lines 323-347 in `prodigi-frame-catalog.ts`) converts dimensions to categories based on diagonal size:

```typescript
const diagonal = Math.sqrt(widthCm * widthCm + heightCm * heightCm);

if (diagonal < 35) return 'small';        // < ~30cm diagonal
if (diagonal < 55) return 'medium';       // ~30-50cm diagonal
if (diagonal < 75) return 'large';        // ~50-70cm diagonal
return 'extra_large';                      // > 70cm diagonal
```

**Check**: Are width/height values valid numbers?

### If Styles Are Wrong

The `normalizeFrameColor()` function (lines 352-374) maps Prodigi colors:

```typescript
const colorMap: { [key: string]: string } = {
  'black': 'black',
  'blk': 'black',
  'dark grey': 'black',
  'white': 'white',
  'wht': 'white',
  'light grey': 'white',
  'natural': 'natural',
  'nat': 'natural',
  'oak': 'natural',
  'walnut': 'natural',
  'brown': 'natural',
  'espresso': 'natural',
  'gold': 'gold',
  'gold fitting': 'gold',
  'silver': 'silver',
  'silver fitting': 'silver'
};
```

**Check**: Are there colors from Prodigi not in this map?

### If Materials Are Wrong

The `extractMaterial()` function (lines 379-385) detects material:

```typescript
if (product.paperType?.includes('canvas')) return 'canvas';
if (product.productType?.toLowerCase().includes('canvas')) return 'canvas';
if (product.productType?.toLowerCase().includes('metal')) return 'metal';
if (product.productType?.toLowerCase().includes('acrylic')) return 'acrylic';
return 'wood'; // Default
```

**Check**: What are the actual productType values in the data?

---

## 📊 Expected Debug Output

If everything is working correctly, you should see:

```
🔍 DEBUG: Total FRAME_OPTIONS: 2359
🔍 DEBUG: First 5 options: [
  { size: 'medium', style: 'white', material: 'canvas' },
  { size: 'large', style: 'black', material: 'canvas' },
  { size: 'small', style: 'natural', material: 'wood' },
  { size: 'medium', style: 'white', material: 'canvas' },
  { size: 'extra_large', style: 'silver', material: 'metal' }
]
🔍 DEBUG: Size distribution: { 
  small: 534, 
  medium: 876, 
  large: 658, 
  extra_large: 291 
}
🔍 DEBUG: Style distribution: { 
  white: 1823, 
  black: 287, 
  natural: 156, 
  silver: 67, 
  gold: 26 
}
🔍 DEBUG: Material distribution: { 
  canvas: 1876, 
  wood: 356, 
  metal: 89, 
  acrylic: 38 
}
```

---

## ✅ Once We See the Debug Output

We'll be able to:
1. **Identify the exact issue** with filtering
2. **Fix the data mapping** if needed
3. **Update the filter logic** if the issue is in matching
4. **Get your frame selector working** with all 2359 options!

---

## 🎯 Goal

Get the frame selector to show:
- All available sizes
- All available colors (5 options: white, black, natural, silver, gold)
- All available materials
- **Matching frames** based on user selection

The data is there (2359 options!), we just need to ensure the filtering works correctly! 🚀

