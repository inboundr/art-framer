# Prodigi Assets Quick Reference

## Asset Location Map

### Frame Blank Textures (Primary Textures)

#### Classic Frames
```
prodigi-classic-frame-blanks/
├── Black classic frame_blank.png
├── White classic frame_blank.png
├── Brown classic frame_blank.jpg
├── Dark grey classic frame_blank.jpg
├── Light grey classic frame_blank.jpg
├── Natural classic frame_blank.png
├── Gold Classic Frame_blank.png
├── Silver Classic Frame_blank.png
```

#### Aluminium Frames
```
prodigi-aluminium-frames-blank-assets/Aluminium frames/
├── Prodigi-black-aluminium-blank.jpg
├── Prodigi-silver-aluminium-frame-blank.jpg
└── Prodigi-gold-aluminium-frame-blank.jpg
```

### Chevron Patterns (45° Profile Views)

#### Classic Frames
- `Classic black frame chevron.jpg`
- `Classic white frame chevron.jpg`
- `Classic brown frame chevron.jpg` / `classic-brown-chevron.jpg`
- `Classic natural frame chevron.jpg`
- `Classic antique gold frame chevron.jpg`
- `Classic antique silver frame chevron.jpg`
- `classic-dark-grey-chevron.jpg`
- `classic-light-grey-chevron.jpg`

#### Box Frames
- `Box black framed print chevron.jpg`
- `Box brown framed print chevron.jpg`
- `Box natural framed print chevron.jpg`
- `Box white framed print chevron.jpg`
- `Box framed print chevrons.jpg` (multiple)

#### Spacer Frames
- `Spacer black framed print chevron.jpg`
- `Spacer brown framed print chevron.jpg`
- `Spacer natural framed print chevron.jpg`
- `Spacer white framed print chevron.jpg`

#### Float Frames (Canvas)
- `Float frame black chevron.jpg`
- `Float frame brown chevron.jpg`
- `Float frame white chevron.jpg`

### Corner Details

#### Classic Frames
- `Classic black framed print near corner.jpg`
- `Classic black framed print corner no mount.jpg`
- `Classic framed print far corner.jpg`

#### Box Frames
- `Box black framed print near corner.jpg`
- `Box brown framed print near corner no mount.jpg`

#### Canvas Frames
- `Black framed canvas near corner.jpg`
- `Brown framed canvas near corner.jpg`
- `Brown framed canvas far corner.jpg`
- `White framed canvas far corner.jpg`

#### Acrylic
- `Acrylic panel corner.jpg`
- `Acrylic panel far corner.jpg`
- `Acrylic panel far corner detail.jpg`
- `Acylic panel near corner no bolts.jpg`

#### Other
- `Stretched 38mm canvas corner.jpg`
- `Rolled canvas corner.jpg`
- `Rolled canvas corner curl.jpg`
- `Rolled canvas art corner detail.jpg`
- `Mounted print bottom corner.jpg`
- `Mounted print top corner.jpg`
- `Mounted print corner on table.jpg`
- `Instagram black framed corner.jpg`
- `Dibond corner dog.jpg`

### Cross-Sections (Technical Diagrams)
- `Box frame cross-section.png`
- `Framed canvas cross-section.png`
- `Spacer frame cross-section.png`
- `Instagram frame cross-section.png`

### Mount/Mat Samples
- `Black mount.jpg`
- `Off-white mount.jpg`
- `Snow white mount.jpg`

### Lifestyle/Wall Context Images

#### Canvas on Wall
- `Canvas framed black wall.jpg`
- `Canvas framed white wall.jpg`
- `White framed canvas.jpg`

#### Dibond on Wall
- `Dibond on wall dog.jpg`
- `Dibond on wall exploring.jpg`

#### Instagram Prints
- `Instagram print on wall.jpg`
- `Instagram black frame on wall.jpg`

#### Mounted Prints
- `Mounted print on wall.jpg`

### Canvas Wraps
- `Black wrap on a 38mm stretched canvas.jpg`
- `White wrap on a 38mm stretched canvas.jpg`
- `Image wrap on a 38mm stretched canvas.jpg`
- `Mirror wrap on a 38mm stretched canvas.jpg`
- `White edge 38mm canvas.jpg`

### Canvas Textures
- `Canvas-substrate-texture.jpg`
- `Prodigi-global-canvas-8x10-blank.jpg`

### Product-Specific Assets

#### Acrylic Panels
- `Acrylic panel face on.jpg`
- `Hidden hanging system.jpg`

#### Eco Canvas
- `Prodigi-environmentally-friendly-eco-canvas-001.jpg` through `006.jpg`
- `Prodigi-Eco-rolled-canvas-2.jpg`
- `Prodigi-eco-canvas-hero.jpg`
- `Prodigi-eco-rolled-canvas-3-hr.jpg`

#### Framed Photo Tiles
- `Prodigi-Framed-Photo-Tiles-01.jpg` through `06.jpg`

#### Cork Board
- `Prodigi-cork-board-blank.jpg`

### End-On/Profile Views
- `Box black framed print end on.jpg`
- `Canvas framed black end-on.jpg`
- `Canvas framed white end-on.jpg`
- `Spacer black framed print end on.jpg`

### Rear/Back Views
- `Prodigi-classic-frame-back.jpg`
- `Canvas framed black rear.jpg`
- `Canvas framed white rear.jpg`

### Angled Views
- `Canvas framed black angled.jpg`
- `Canvas framed white angled.jpg`
- `Spacer black framed print angled.jpg`
- `Spacer black framed print square angled.jpg`

### Packaging
- `Prodigi cardboard box – classic frame 1.jpg`
- `Prodigi cardboard box – classic frame 2.jpg`
- `Prodigi cardboard box – stretched canvas.jpg`
- `Prodigi cardboard tubes - prints, posters, rolled canvas 1-4.jpg`
- `Prodigi ecocaps - prints, posters, rolled canvas 1-2.jpg`

---

## Color Name Mapping

### Standard Colors
- `black` → Black
- `white` → White
- `brown` → Brown
- `natural` → Natural

### Greys
- `dark grey` / `dark gray` → Dark Grey
- `light grey` / `light gray` → Light Grey

### Metallics
- `gold` → Gold
- `silver` → Silver
- `antique gold` → Antique Gold
- `antique silver` → Antique Silver

---

## Frame Type Mapping

### Frame Types
- `classic` → Classic Frames
- `aluminium` → Aluminium Frames
- `box` → Box Frames
- `spacer` → Spacer Frames
- `float` → Float Frames (Canvas)

### Product Types
- `framed-print` → Classic/Box/Spacer Frames
- `framed-canvas` → Framed Canvas
- `canvas` → Stretched Canvas
- `acrylic` → Acrylic Panels
- `dibond` → Dibond Prints
- `mounted` → Mounted Prints
- `rolled-canvas` → Rolled Canvas
- `eco-canvas` → Eco Canvas

---

## Texture Path Resolution

### Pattern
```
/prodigi-assets/frames/{frameType}/textures/{color}-{mapType}.webp
```

### Examples
- Classic Black Diffuse: `/prodigi-assets/frames/classic/textures/black-diffuse.webp`
- Classic Black Normal: `/prodigi-assets/frames/classic/textures/black-normal.webp`
- Aluminium Silver Diffuse: `/prodigi-assets/frames/aluminium/textures/silver-diffuse.webp`

### Mount Textures
```
/prodigi-assets/mounts/{color}-mount.webp
```

### Canvas Textures
```
/prodigi-assets/canvas/textures/{textureName}.webp
/prodigi-assets/canvas/wraps/{wrapType}-wrap.webp
```

---

## Asset Usage Matrix

| Asset Type | Use Case | Component | Priority |
|------------|----------|-----------|----------|
| Frame Blanks | Diffuse texture | FrameModel | Critical |
| Chevrons | Normal map source | FrameModel | High |
| Corner Details | Geometry reference | FrameModel | Medium |
| Cross-Sections | Technical reference | AI Chat, Product Pages | Medium |
| Mount Samples | Mount texture | FrameModel | High |
| Lifestyle Images | Context/Examples | AI Chat, Product Pages | High |
| Canvas Textures | Canvas material | FrameModel | High |
| Wrap Images | Canvas edge texture | FrameModel | Medium |
| Packaging | Shipping visualization | Checkout, Orders | Low |

---

## Quick Access Functions

### Get Frame Blank Path
```typescript
function getFrameBlankPath(frameType: string, color: string): string {
  const basePath = '/prodigi-assets-extracted';
  const colorMap = {
    'black': 'Black',
    'white': 'White',
    'brown': 'Brown',
    // ... etc
  };
  
  if (frameType === 'classic') {
    return `${basePath}/prodigi-classic-frame-blanks/${colorMap[color]} classic frame_blank.png`;
  }
  // ... other frame types
}
```

### Get Chevron Path
```typescript
function getChevronPath(frameType: string, color: string): string {
  // Returns path to chevron image for normal map generation
}
```

### Get Lifestyle Images
```typescript
function getLifestyleImages(productType: string): string[] {
  // Returns array of lifestyle image paths for product type
}
```



