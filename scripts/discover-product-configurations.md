# Product Configuration Discovery

## Special Configurations Found

### 1. Canvas Edge Depth
- **19mm (Slim Canvas)**: Thinner canvas edge, uses SKUs like `global-slimcan-*` or `global-fra-slimcan-*`
- **38mm (Standard Canvas)**: Standard canvas edge, uses SKUs like `global-can-*` or `global-fra-can-*`
- **Attribute**: `edge: "19mm"` or `edge: "38mm"`

### 2. Canvas Type Variations
- **Standard Canvas**: Regular canvas products (`global-can-*`, `global-fra-can-*`)
- **Slim Canvas**: Thinner canvas (`global-slimcan-*`, `global-fra-slimcan-*`)
- **Eco Canvas**: Eco-friendly canvas (may have `eco` in SKU or paperType)

### 3. Framed Canvas Variants
- **Standard Framed Canvas**: `global-fra-can-*` (38mm edge)
- **Slim Framed Canvas**: `global-fra-slimcan-*` (19mm edge)

## Configuration Options Added

### Studio Config
- `edge?: '19mm' | '38mm' | 'auto'` - Edge depth preference
- `canvasType?: 'standard' | 'slim' | 'eco' | 'auto'` - Canvas type preference

### Products API
- Accepts `edge` and `canvasType` in request body
- Stores in `metadata` JSONB field

### Catalog Service
- Uses preferences to score and rank products
- Prefers products matching user's edge/canvas type preferences
- Cache key includes preferences to ensure correct SKU selection

## How It Works

1. **User selects edge/canvas type** in Studio
2. **Preferences sent to products API** when creating product
3. **Catalog service uses preferences** to find matching SKU
4. **Scoring system**:
   - +30 points for matching edge preference
   - +25 points for matching canvas type preference
   - -20/-15 points for not matching
   - +50 points for exact size match
5. **Best matching product selected** based on total score

## Testing Recommendations

1. Test with `edge: '19mm'` → should get slim canvas SKU
2. Test with `edge: '38mm'` → should get standard canvas SKU
3. Test with `canvasType: 'slim'` → should get slimcan SKU
4. Test with `canvasType: 'standard'` → should get regular canvas SKU
5. Test with `edge: 'auto'` → should get best available match

