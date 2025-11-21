# Prodigi Product Attributes - Complete Guide

**Your definitive guide to working with Prodigi product attributes**

---

## 🎯 Quick Reference

### All Discovered Attributes

| Attribute | Product Types | Values | Required? |
|-----------|--------------|--------|-----------|
| `wrap` | Canvas, Large Frames | Black, White, ImageWrap, MirrorWrap | ✅ Yes |
| `color` | Framed Prints, Large Frames | black, white, brown, dark grey, light grey, natural, gold, silver | ✅ Yes |
| `edge` | Canvas, Frames | 38mm | ℹ️ Auto |
| `frame` | All framed products | Varies by product | ℹ️ Auto |
| `glaze` | Framed Prints | Acrylic / Perspex | ℹ️ Auto |
| `mount` | Framed Prints | 2.4mm | ℹ️ Auto |
| `mountColor` | Framed Prints | Snow white | ℹ️ Auto |
| `paperType` | All print products | Standard canvas (SC), EMA | ℹ️ Auto |
| `substrateWeight` | All print products | 200gsm, 400gsm | ℹ️ Auto |
| `style` | Framed Prints | Framed print / Mount / Perspex | ℹ️ Auto |
| `finish` | Various | Product-specific | ❌ Optional |

---

## 📦 Product Type Requirements

### Canvas Products (`GLOBAL-CAN-*`)

**Required**: `wrap`  
**Options**: Black, White, ImageWrap, MirrorWrap

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  attributes: {
    wrap: 'ImageWrap' // ✅ Required
  }
}
```

### Framed Prints (`GLOBAL-CFPM-*`)

**Required**: `color`  
**Options**: black, brown, dark grey, gold, light grey, natural, silver, white

```typescript
{
  sku: 'GLOBAL-CFPM-16X20',
  attributes: {
    color: 'natural' // ✅ Required
  }
}
```

### Large Framed Canvas (`GLOBAL-FRA-CAN-*`)

**Required**: `color` + `wrap`  
**Color Options**: black, brown, gold, natural, silver, white  
**Wrap Options**: Black, White, ImageWrap, MirrorWrap

```typescript
{
  sku: 'GLOBAL-FRA-CAN-30X40',
  attributes: {
    color: 'black',     // ✅ Required
    wrap: 'ImageWrap'   // ✅ Required
  }
}
```

### Fine Art Prints (`GLOBAL-FAP-*`)

**Required**: None  
**Attributes**: Optional

```typescript
{
  sku: 'GLOBAL-FAP-16X24',
  attributes: {} // ✅ No attributes needed
}
```

---

## 🔧 Using Attribute Helpers

### 1. Validate Attributes Before Order

```typescript
import { ProdigiSDK, validateProductAttributes } from '@/lib/prodigi-v2';

const prodigi = new ProdigiSDK({ /* config */ });

async function createOrderWithValidation(sku: string, attributes: Record<string, string>) {
  // Validate first
  const result = await validateProductAttributes(
    prodigi.products,
    sku,
    attributes
  );

  if (!result.valid) {
    console.error('Validation failed:');
    result.errors.forEach(err => console.error('  ❌', err));
    throw new Error('Invalid product attributes');
  }

  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach(warn => console.warn('  ⚠️', warn));
  }

  // Create order
  return await prodigi.orders.create({
    // ... order data
    items: [{ sku, attributes, /* ... */ }]
  });
}

// Example usage
await createOrderWithValidation('GLOBAL-CAN-10x10', {
  wrap: 'ImageWrap'
});
// ✅ Valid

await createOrderWithValidation('GLOBAL-CFPM-16X20', {
  wrap: 'Black' // Wrong attribute for framed print!
});
// ❌ Error: Missing required attribute 'color'
```

### 2. Get Product Requirements

```typescript
import { ProductAttributeHelper } from '@/lib/prodigi-v2';

const helper = new ProductAttributeHelper(prodigi.products);

// Get full product info
const info = await helper.getProductAttributeInfo('GLOBAL-CFPM-16X20');

console.log('SKU:', info.sku);
console.log('Required attributes:', info.requiredAttributes);
// ['color']

console.log('Available options:');
Object.entries(info.availableAttributes).forEach(([key, values]) => {
  console.log(`  ${key}:`, values);
});
// color: ['black', 'brown', 'dark grey', 'gold', 'light grey', 'natural', 'silver', 'white']
// glaze: ['Acrylic / Perspex']
// mount: ['2.4mm']
// mountColor: ['Snow white']
// ...

console.log('Total variants:', info.variants);
// 8
```

### 3. Auto-Detect Product Category

```typescript
import { getProductCategory, getRequiredAttributesByCategory } from '@/lib/prodigi-v2';

function detectProductType(sku: string) {
  const category = getProductCategory(sku);
  const required = getRequiredAttributesByCategory(sku);

  console.log(`SKU: ${sku}`);
  console.log(`Category: ${category}`);
  console.log(`Required attributes: ${required.join(', ')}`);
}

detectProductType('GLOBAL-CAN-10x10');
// Category: CANVAS
// Required attributes: wrap

detectProductType('GLOBAL-CFPM-16X20');
// Category: FRAMED_PRINT
// Required attributes: color

detectProductType('GLOBAL-FRA-CAN-30X40');
// Category: LARGE_FRAMED_CANVAS
// Required attributes: color, wrap

detectProductType('GLOBAL-FAP-16X24');
// Category: FINE_ART
// Required attributes: (none)
```

### 4. Get Smart Defaults

```typescript
import { getSuggestedAttributes } from '@/lib/prodigi-v2';

// Get suggested default attributes based on product type
const defaults = {
  'GLOBAL-CAN-10x10': getSuggestedAttributes('GLOBAL-CAN-10x10'),
  // { wrap: 'Black' }
  
  'GLOBAL-CFPM-16X20': getSuggestedAttributes('GLOBAL-CFPM-16X20'),
  // { color: 'black' }
  
  'GLOBAL-FRA-CAN-30X40': getSuggestedAttributes('GLOBAL-FRA-CAN-30X40'),
  // { color: 'black', wrap: 'ImageWrap' }
};

// Use defaults as starting point
async function createOrderWithDefaults(sku: string, userPrefs?: Record<string, string>) {
  const defaults = getSuggestedAttributes(sku);
  const attributes = { ...defaults, ...userPrefs };

  return await prodigi.orders.create({
    // ... order with merged attributes
  });
}
```

### 5. Check Specific Requirements

```typescript
const helper = new ProductAttributeHelper(prodigi.products);

// Check if a product requires specific attributes
const requiresColor = await helper.requiresAttributes('GLOBAL-CFPM-16X20', 'color');
console.log('Requires color:', requiresColor); // true

const requiresWrap = await helper.requiresAttributes('GLOBAL-CFPM-16X20', 'wrap');
console.log('Requires wrap:', requiresWrap); // false

// Check multiple requirements
const requiresBoth = await helper.requiresAttributes('GLOBAL-FRA-CAN-30X40', 'color', 'wrap');
console.log('Requires color AND wrap:', requiresBoth); // true
```

### 6. Get All Product Variants

```typescript
const helper = new ProductAttributeHelper(prodigi.products);

// Get all available variants with their attributes
const variants = await helper.getProductVariants('GLOBAL-CFPM-16X20');

console.log(`Found ${variants.length} variants:`);
variants.forEach(variant => {
  console.log(`  ${variant.id}: color=${variant.attributes.color}`);
});

// Output:
// Found 8 variants:
//   var_12345: color=black
//   var_12346: color=white
//   var_12347: color=brown
//   var_12348: color=dark grey
//   var_12349: color=light grey
//   var_12350: color=natural
//   var_12351: color=gold
//   var_12352: color=silver
```

---

## 🎨 Real-World Examples

### Example 1: Frame Selection UI

```typescript
import { ProductAttributeHelper, getProductCategory } from '@/lib/prodigi-v2';

async function buildFrameSelector(sku: string) {
  const helper = new ProductAttributeHelper(prodigi.products);
  const info = await helper.getProductAttributeInfo(sku);
  const category = getProductCategory(sku);

  const ui = {
    category,
    options: {} as Record<string, { label: string; values: string[] }>
  };

  // Build UI options for each required attribute
  for (const attr of info.requiredAttributes) {
    const values = info.availableAttributes[attr];
    
    if (attr === 'wrap') {
      ui.options.wrap = {
        label: 'Canvas Wrap Style',
        values: values.map(v => ({
          value: v,
          label: v === 'ImageWrap' ? 'Image Wrap (extends image)' :
                 v === 'MirrorWrap' ? 'Mirror Wrap (mirrors edge)' :
                 v === 'Black' ? 'Black Edges' : 'White Edges'
        }))
      };
    } else if (attr === 'color') {
      ui.options.color = {
        label: 'Frame Color',
        values: values.map(v => ({
          value: v,
          label: v.charAt(0).toUpperCase() + v.slice(1),
          colorCode: getColorCode(v)
        }))
      };
    }
  }

  return ui;
}

function getColorCode(color: string): string {
  const codes: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'brown': '#8B4513',
    'dark grey': '#555555',
    'light grey': '#D3D3D3',
    'natural': '#DEB887',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
  };
  return codes[color] || '#CCCCCC';
}

// Usage in React/Next.js
export function FrameSelector({ sku }: { sku: string }) {
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    buildFrameSelector(sku).then(setOptions);
  }, [sku]);

  if (!options) return <div>Loading...</div>;

  return (
    <div>
      <h3>Customize Your {options.category}</h3>
      
      {Object.entries(options.options).map(([key, config]) => (
        <div key={key}>
          <label>{config.label}</label>
          <select onChange={e => setSelected({ ...selected, [key]: e.target.value })}>
            {config.values.map(v => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Bulk Order Validation

```typescript
async function validateBulkOrder(items: Array<{ sku: string; attributes: Record<string, string> }>) {
  const helper = new ProductAttributeHelper(prodigi.products);
  const results = [];

  for (const item of items) {
    const result = await helper.validateAttributes(item.sku, item.attributes);
    results.push({
      sku: item.sku,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });
  }

  const allValid = results.every(r => r.valid);
  const summary = {
    allValid,
    totalItems: results.length,
    validItems: results.filter(r => r.valid).length,
    invalidItems: results.filter(r => !r.valid).length,
    results,
  };

  return summary;
}

// Usage
const orderItems = [
  { sku: 'GLOBAL-CAN-10x10', attributes: { wrap: 'Black' } },
  { sku: 'GLOBAL-CFPM-16X20', attributes: { color: 'natural' } },
  { sku: 'GLOBAL-FRA-CAN-30X40', attributes: { color: 'black', wrap: 'ImageWrap' } },
  { sku: 'GLOBAL-FAP-16X24', attributes: {} },
];

const validation = await validateBulkOrder(orderItems);

if (!validation.allValid) {
  console.error(`${validation.invalidItems} items have errors:`);
  validation.results
    .filter(r => !r.valid)
    .forEach(r => {
      console.error(`  ${r.sku}:`);
      r.errors.forEach(err => console.error(`    - ${err}`));
    });
} else {
  console.log('✅ All items valid! Creating order...');
  await prodigi.orders.create({ items: orderItems, /* ... */ });
}
```

### Example 3: Smart Attribute Form

```typescript
import { ProductAttributeHelper, PRODUCT_ATTRIBUTE_CATEGORIES } from '@/lib/prodigi-v2';

async function generateAttributeForm(sku: string) {
  const helper = new ProductAttributeHelper(prodigi.products);
  const info = await helper.getProductAttributeInfo(sku);

  const form = {
    sku,
    fields: [] as Array<{
      name: string;
      type: 'select' | 'radio' | 'color';
      label: string;
      required: boolean;
      options: Array<{ value: string; label: string }>;
    }>
  };

  for (const [key, values] of Object.entries(info.availableAttributes)) {
    if (values.length === 0) continue;

    const required = info.requiredAttributes.includes(key);

    if (key === 'color') {
      form.fields.push({
        name: 'color',
        type: 'color',
        label: 'Frame Color',
        required,
        options: values.map(v => ({
          value: v,
          label: v.charAt(0).toUpperCase() + v.slice(1),
        })),
      });
    } else if (key === 'wrap') {
      form.fields.push({
        name: 'wrap',
        type: 'radio',
        label: 'Wrap Style',
        required,
        options: values.map(v => ({
          value: v,
          label: formatWrapLabel(v),
        })),
      });
    } else if (required) {
      form.fields.push({
        name: key,
        type: 'select',
        label: key.charAt(0).toUpperCase() + key.slice(1),
        required,
        options: values.map(v => ({ value: v, label: v })),
      });
    }
  }

  return form;
}

function formatWrapLabel(wrap: string): string {
  const labels: Record<string, string> = {
    'Black': 'Black Edges',
    'White': 'White Edges',
    'ImageWrap': 'Image Wrap (extends your image)',
    'MirrorWrap': 'Mirror Wrap (mirrors the edge)',
  };
  return labels[wrap] || wrap;
}
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong: Using wrap on framed prints

```typescript
{
  sku: 'GLOBAL-CFPM-16X20',
  attributes: {
    wrap: 'Black' // ❌ Framed prints don't have wrap!
  }
}
```

### ✅ Correct: Use color for framed prints

```typescript
{
  sku: 'GLOBAL-CFPM-16X20',
  attributes: {
    color: 'black' // ✅ Correct attribute
  }
}
```

### ❌ Wrong: Missing required attributes

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  attributes: {} // ❌ Missing wrap!
}
```

### ✅ Correct: Include all required attributes

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  attributes: {
    wrap: 'Black' // ✅ Required attribute provided
  }
}
```

### ❌ Wrong: Invalid attribute value

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  attributes: {
    wrap: 'red' // ❌ Not a valid wrap option!
  }
}
```

### ✅ Correct: Use valid values

```typescript
{
  sku: 'GLOBAL-CAN-10x10',
  attributes: {
    wrap: 'ImageWrap' // ✅ Valid option
  }
}
```

---

## 📚 TypeScript Types Reference

```typescript
import type { ProductAttributes } from '@/lib/prodigi-v2';

// Fully typed attributes
const canvasAttrs: ProductAttributes = {
  wrap: 'ImageWrap',    // Type-safe!
  edge: '38mm',
  frame: '38mm standard stretcher bar',
  paperType: 'Standard canvas (SC)',
  substrateWeight: '400gsm',
};

const framedAttrs: ProductAttributes = {
  color: 'natural',     // Type-safe!
  glaze: 'Acrylic / Perspex',
  mount: '2.4mm',
  mountColor: 'Snow white',
  paperType: 'EMA',
  style: 'Framed print / Mount / Perspex',
  substrateWeight: '200gsm',
};
```

---

## 🎯 Best Practices

1. **Always Validate** - Use validation helpers before creating orders
2. **Auto-Detect Category** - Use `getProductCategory()` for smart defaults
3. **Show Only Required** - Use `requiredAttributes` to simplify UI
4. **Provide Defaults** - Use `getSuggestedAttributes()` for sensible defaults
5. **Type Everything** - Use `ProductAttributes` type for type safety
6. **Handle Errors** - Check validation results before submission
7. **Cache Product Info** - Product details rarely change, cache them
8. **Show Warnings** - Display validation warnings to users

---

## 🚀 Quick Start Checklist

- [ ] Import attribute helpers
- [ ] Get product info for your SKUs
- [ ] Build UI based on required attributes
- [ ] Validate before order creation
- [ ] Handle validation errors gracefully
- [ ] Test with all product types
- [ ] Add default attribute values
- [ ] Implement category detection

**You're now ready to build the perfect frame selection experience!** 🎨

