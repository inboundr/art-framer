# Material System Approach

## Philosophy

**Color-based materials are PRIMARY. Textures are OPTIONAL.**

The Prodigi images/textures you provided were used to **discover and extract** material properties (colors, metalness, roughness), not to create a runtime dependency on texture files.

## How It Works

### 1. Material Discovery (One-Time Process)
- Analyze Prodigi frame images/textures
- Extract material properties:
  - `baseColor`: Dominant color from the image
  - `metalness`: How metallic (0-1) - extracted from reflective surfaces
  - `roughness`: How smooth/rough (0-1) - extracted from surface texture
  - `envMapIntensity`: Reflection strength
- Store in `frame-texture-config.ts` database

### 2. Runtime Rendering (Always)
- **Primary Method**: Use color-based materials from `frame-texture-config.ts`
  - Always available
  - No external dependencies
  - Fast and reliable
  - Accurate colors and material properties

- **Optional Enhancement**: Load texture images if available
  - Only if explicitly enabled (`useTextures={true}`)
  - Falls back gracefully to color-based materials
  - Never required for rendering

## Configuration Database

The `FRAME_TEXTURE_DATABASE` in `frame-texture-config.ts` contains:

```typescript
{
  frameType: {
    color: {
      baseColor: '#1a1a1a',      // Extracted from Prodigi image
      metalness: 0.05,            // Discovered from texture analysis
      roughness: 0.6,             // Discovered from texture analysis
      envMapIntensity: 0.3,       // Tuned for realistic rendering
      textureSource: '...',       // Reference: which image was analyzed
      notes: '...'                // Description of material
    }
  }
}
```

## Benefits

1. **No Texture Dependency**: System works perfectly without any texture files
2. **Fast Rendering**: Color-based materials are instant
3. **Accurate Colors**: Extracted directly from Prodigi images
4. **Realistic Materials**: Properties discovered from texture analysis
5. **Graceful Degradation**: Textures enhance but never required
6. **Easy Updates**: Update material properties without managing texture files

## Usage

### Default (Color-Based Materials)
```typescript
// Always uses color-based materials from config
const { material } = useFrameMaterial({
  frameType: 'classic',
  color: 'black',
  useTextures: false  // Default
});
```

### With Optional Textures
```typescript
// Uses color-based materials, enhances with textures if available
const { material } = useFrameMaterial({
  frameType: 'classic',
  color: 'black',
  useTextures: true  // Optional enhancement
});
```

## Adding New Frame Types/Colors

1. Analyze Prodigi image for the frame type/color
2. Extract:
   - Dominant color → `baseColor`
   - Surface reflectivity → `metalness`
   - Surface texture → `roughness`
3. Add to `FRAME_TEXTURE_DATABASE`
4. No texture files needed!

## Texture Files (Optional)

If texture files exist:
- They can enhance the visual quality
- They're loaded only if `useTextures={true}`
- If they fail to load, system uses color-based materials
- Never required for the system to work

