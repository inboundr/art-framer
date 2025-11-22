# 3D Preview Update Issues - Analysis & Fixes

## 🔍 **Issues Identified**

### 1. **No Memoization Key** ❌
**Problem**: FrameModel doesn't have a key prop, so React might not re-render when config changes drastically

**Impact**: When switching product types or making major changes, the 3D model might not update

### 2. **Incomplete Color Mappings** ⚠️
**Problem**: Color maps in FrameModel only have basic colors, missing many Prodigi colors

**Current Colors:**
```typescript
const colorMap: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  natural: '#C19A6B',
  brown: '#654321',
  gold: '#FFD700',
  silver: '#C0C0C0',
  'dark grey': '#555555',
  'light grey': '#CCCCCC',
};
```

**Missing:** 'cream', 'oak', 'walnut', 'mahogany', etc.

### 3. **Wrap Not Updating** ❌
**Problem**: Wrap color changes but the 3D edges might not update because of aggressive memoization

### 4. **Glaze Display Logic** ⚠️
**Problem**: Glaze visibility logic is:
```typescript
const showGlaze = ['framed-print', 'framed-canvas', 'acrylic'].includes(productType) && glaze && glaze !== 'none';
```

But `framed-canvas` doesn't support glaze in Prodigi! This creates visual mismatch.

### 5. **Mount Color Mapping Incomplete** ⚠️
**Problem**: Only has basic mount colors:
```typescript
const colorMap: Record<string, string> = {
  white: '#FFFFFF',
  'off-white': '#F8F8F0',
  cream: '#FFFDD0',
  black: '#000000',
};
```

Missing: 'Off White', 'Snow white', etc. (case sensitivity issues)

### 6. **No Key Prop for Cache Busting** ❌
**Problem**: Scene3D and FrameModel don't have key props that change when major config changes occur

### 7. **Glaze Material Same for All Types** ⚠️
**Problem**: All glaze types use the same material, but 'motheye' should look different from 'acrylic'

---

## 🎯 **Fixes Required**

1. Add comprehensive color mappings
2. Add key prop to FrameModel for cache busting
3. Fix glaze visibility logic (remove framed-canvas)
4. Improve wrap color updates
5. Case-insensitive color matching
6. Better memoization dependencies
7. Distinct materials for different glaze types
8. Add finish handling for acrylic/metal

