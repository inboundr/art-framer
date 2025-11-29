# Prodigi Assets Analysis & V2 Integration Plan

## Executive Summary

This document provides a comprehensive analysis of the Prodigi asset library (155+ images) and a detailed integration plan for Art-Framer V2. The assets include frame textures, lifestyle photos, corner details, cross-sections, mount samples, and packaging imagery that will significantly enhance frame preview accuracy, AI chat guidance, and overall user experience.

---

## 1. Asset Inventory & Structure Analysis

### 1.1 Asset Categories

#### **A. Frame Blank Textures** (Primary Textures for 3D Rendering)
- **Classic Frames** (8 colors):
  - `Black classic frame_blank.png`
  - `White classic frame_blank.png`
  - `Brown classic frame_blank.jpg`
  - `Dark grey classic frame_blank.jpg`
  - `Light grey classic frame_blank.jpg`
  - `Natural classic frame_blank.png`
  - `Gold Classic Frame_blank.png`
  - `Silver Classic Frame_blank.png`
  - `Classic Antique Gold Frame_blank.png`
  - `Classic Antique Silver Frame_blank.png`

- **Aluminium Frames** (3 colors):
  - `Prodigi-black-aluminium-blank.jpg`
  - `Prodigi-silver-aluminium-frame-blank.jpg`
  - `Prodigi-gold-aluminium-frame-blank.jpg`

- **Canvas Blanks**:
  - `Prodigi-global-canvas-8x10-blank.jpg`
  - `Canvas-substrate-texture.jpg`

- **Cork Board**:
  - `Prodigi-cork-board-blank.jpg`

#### **B. Frame Chevron Patterns** (45-degree angle views showing frame profile)
- Classic frames: black, white, brown, natural, antique gold, antique silver, dark grey, light grey
- Box frames: black, brown, natural, white
- Spacer frames: black, brown, natural, white
- Float frames (canvas): black, brown, white

#### **C. Corner Detail Images** (Close-up shots for realism)
- **Classic Frames**:
  - `Classic black framed print near corner.jpg`
  - `Classic black framed print corner no mount.jpg`
  - `Classic framed print far corner.jpg`

- **Box Frames**:
  - `Box black framed print near corner.jpg`
  - `Box brown framed print near corner no mount.jpg`

- **Canvas Frames**:
  - `Black framed canvas near corner.jpg`
  - `Brown framed canvas near corner.jpg`
  - `Brown framed canvas far corner.jpg`
  - `White framed canvas far corner.jpg`

- **Acrylic Panels**:
  - `Acrylic panel corner.jpg`
  - `Acrylic panel far corner.jpg`
  - `Acrylic panel far corner detail.jpg`
  - `Acylic panel near corner no bolts.jpg`

- **Other Products**:
  - `Stretched 38mm canvas corner.jpg`
  - `Rolled canvas corner.jpg`
  - `Rolled canvas corner curl.jpg`
  - `Rolled canvas art corner detail.jpg`
  - `Mounted print bottom corner.jpg`
  - `Mounted print top corner.jpg`
  - `Mounted print corner on table.jpg`
  - `Instagram black framed corner.jpg`
  - `Dibond corner dog.jpg`

#### **D. Cross-Section Diagrams** (Technical reference)
- `Box frame cross-section.png`
- `Framed canvas cross-section.png`
- `Spacer frame cross-section.png`
- `Instagram frame cross-section.png`

#### **E. Mount/Mat Samples**
- `Black mount.jpg`
- `Off-white mount.jpg`
- `Snow white mount.jpg`

#### **F. Lifestyle/Wall Context Images**
- **Canvas on Wall**:
  - `Canvas framed black wall.jpg`
  - `Canvas framed white wall.jpg`
  - `White framed canvas.jpg`

- **Dibond on Wall**:
  - `Dibond on wall dog.jpg`
  - `Dibond on wall exploring.jpg`

- **Instagram Prints**:
  - `Instagram print on wall.jpg`
  - `Instagram black frame on wall.jpg`

- **Mounted Prints**:
  - `Mounted print on wall.jpg`

#### **G. Product-Specific Assets**

**Acrylic Panels**:
- `Acrylic panel face on.jpg`
- `Hidden hanging system.jpg` (shows mounting hardware)

**Canvas Wraps**:
- `Black wrap on a 38mm stretched canvas.jpg`
- `White wrap on a 38mm stretched canvas.jpg`
- `Image wrap on a 38mm stretched canvas.jpg`
- `Mirror wrap on a 38mm stretched canvas.jpg`
- `White edge 38mm canvas.jpg`

**Eco Canvas**:
- 6 lifestyle images (`Prodigi-environmentally-friendly-eco-canvas-001.jpg` through `006.jpg`)
- 3 rolled canvas images

**Framed Photo Tiles**:
- 6 lifestyle images (`Prodigi-Framed-Photo-Tiles-01.jpg` through `06.jpg`)

**Packaging**:
- Cardboard boxes for classic frames and stretched canvas
- Cardboard tubes for prints/posters/rolled canvas
- Ecocaps for rolled products

#### **H. End-On/Profile Views**
- `Box black framed print end on.jpg`
- `Canvas framed black end-on.jpg`
- `Canvas framed white end-on.jpg`
- `Spacer black framed print end on.jpg`

#### **I. Rear/Back Views**
- `Prodigi-classic-frame-back.jpg`
- `Canvas framed black rear.jpg`
- `Canvas framed white rear.jpg`

#### **J. Angled Views**
- `Canvas framed black angled.jpg`
- `Canvas framed white angled.jpg`
- `Spacer black framed print angled.jpg`
- `Spacer black framed print square angled.jpg`

### 1.2 File Naming Conventions

**Patterns Identified**:
- `{ProductType} {Color} {ViewType}.jpg/png`
- `{ProductType} {Color} frame_blank.png/jpg` (for textures)
- `{ProductType} {Color} framed print {ViewType}.jpg`
- `{ProductType} frame cross-section.png` (technical diagrams)
- `{Color} mount.jpg` (mount samples)

**Color Variations**:
- Standard: `black`, `white`, `brown`, `natural`
- Greys: `dark grey`, `light grey`
- Metallics: `gold`, `silver`, `antique gold`, `antique silver`

**View Types**:
- `blank` - Texture source
- `chevron` - 45° profile view
- `corner` / `near corner` / `far corner` - Corner details
- `face on` - Front view
- `end on` - Side/profile view
- `wall` - Lifestyle/wall context
- `rear` / `back` - Back view
- `angled` - Angled perspective

### 1.3 Asset Statistics

- **Total Images**: 155+ (excluding __MACOSX metadata)
- **Frame Blank Textures**: 13 unique textures
- **Chevron Patterns**: 20+ variations
- **Corner Details**: 25+ images
- **Cross-Sections**: 4 technical diagrams
- **Lifestyle Images**: 15+ wall context images
- **Mount Samples**: 3 color variations
- **Packaging Images**: 8 images

---

## 2. Integration Plan for Art-Framer V2

### 2.1 UX Improvements

#### **A. Frame Preview Enhancements**

**Current State**: FrameModel uses hardcoded hex colors and simple material properties.

**Proposed Improvements**:

1. **Texture-Based Frame Rendering**
   - Replace color-based materials with actual Prodigi frame textures
   - Use `*_blank.png/jpg` files as diffuse maps
   - Extract normal maps from chevron images (using image processing)
   - Apply proper UV mapping to frame geometry

2. **Corner Detail Overlays**
   - Use corner detail images as reference for geometry beveling
   - Add corner detail textures to frame edges for realism
   - Implement dynamic corner detail based on frame style

3. **Mount/Mat Texture Integration**
   - Use mount sample images (`Black mount.jpg`, `Off-white mount.jpg`, `Snow white mount.jpg`) as textures
   - Apply proper material properties (matte finish, slight texture)

4. **Cross-Section Geometry Reference**
   - Use cross-section PNGs to inform frame depth and profile
   - Ensure 3D geometry matches Prodigi's actual frame construction

5. **Lifestyle Context Integration**
   - Use wall context images as environment maps
   - Add realistic shadows and lighting based on lifestyle photos
   - Implement room scene backgrounds using wall images

#### **B. Color Accuracy**

**Current State**: Color mapping uses approximate hex values.

**Proposed Solution**:
1. Extract color swatches from blank frame images
2. Create a color palette database mapping Prodigi color names to actual RGB values
3. Use these colors as fallback when textures fail to load
4. Implement color correction to match Prodigi's actual frame colors

#### **C. Mockup Realism**

1. **3D Model Accuracy**:
   - Use chevron images to determine exact frame profile angles
   - Use end-on views to set correct frame depth
   - Use rear views to model hanging hardware

2. **Material Properties**:
   - Extract roughness/metallic values from blank textures
   - Use chevron images to determine surface reflectivity
   - Apply proper IOR (Index of Refraction) for glazed frames

3. **Lighting & Shadows**:
   - Analyze lifestyle images for lighting conditions
   - Implement environment-based lighting
   - Add realistic shadow casting based on cross-sections

#### **D. Print-Size Visualization**

1. **Reference Images**:
   - Use lifestyle images to show scale context
   - Add size comparison overlays
   - Use packaging images to show shipping size

2. **3D Scale Accuracy**:
   - Ensure frame dimensions match Prodigi specifications
   - Use cross-sections to verify depth accuracy

#### **E. Onboarding & AI Chat**

1. **Visual Examples**:
   - Use lifestyle images in onboarding carousels
   - Show frame options with actual Prodigi photos
   - Display mount samples in selection UI

2. **AI Chat Image References**:
   - Provide AI chat with access to frame blank images
   - Use corner details to explain frame construction
   - Reference cross-sections for technical explanations

---

### 2.2 AI Chat Enhancements

#### **A. Frame Type Education**

**Assets to Use**:
- Frame blank images for visual identification
- Chevron patterns to show frame profiles
- Cross-sections to explain construction
- Corner details to highlight quality

**Implementation**:
```typescript
// Example: AI chat can reference these assets
const frameExamples = {
  'classic': {
    texture: '/prodigi-assets/frames/classic/Black classic frame_blank.png',
    chevron: '/prodigi-assets/frames/classic/Classic black frame chevron.jpg',
    crossSection: '/prodigi-assets/frames/classic/Box frame cross-section.png',
    description: 'Traditional frame with beveled edges...'
  }
}
```

#### **B. Mount/Mat Guidance**

**Assets to Use**:
- `Black mount.jpg`, `Off-white mount.jpg`, `Snow white mount.jpg`
- Framed print images showing mount integration

**Use Cases**:
- Show mount samples when user asks about mat options
- Explain mount color impact on artwork appearance
- Display examples of framed prints with/without mounts

#### **C. Product Type Explanations**

**Assets to Use**:
- Lifestyle images for each product type
- Cross-sections for technical details
- Corner details for quality demonstration

**Examples**:
- Canvas: Show stretched canvas corner details, wrap options
- Acrylic: Show corner details, hanging system
- Dibond: Show wall mounting, corner construction
- Mounted prints: Show corner details, wall context

#### **D. Size & Scale Visualization**

**Assets to Use**:
- Lifestyle images showing products in context
- Packaging images for shipping size reference

---

### 2.3 Rendering & Texture Integration

#### **A. Texture Map Extraction Strategy**

**For Each Frame Color/Type**:

1. **Diffuse Map** (Albedo):
   - Source: `*_blank.png/jpg` files
   - Processing: 
     - Crop to frame area only
     - Remove background if needed
     - Optimize for web (WebP conversion)
     - Generate multiple resolutions (1x, 2x, 4x)

2. **Normal Map** (Surface Detail):
   - Source: Chevron images (45° angle shows surface detail)
   - Processing:
     - Convert chevron images to normal maps using image processing
     - Alternative: Generate from blank textures using height maps
     - Tools: Photoshop, GIMP, or programmatic conversion

3. **Roughness Map**:
   - Source: Analyze blank textures for surface reflectivity
   - Processing:
     - Metallic frames (gold, silver): Low roughness (0.2-0.3)
     - Wood frames (brown, natural): Medium roughness (0.5-0.7)
     - Painted frames (black, white): Medium-high roughness (0.6-0.8)

4. **Metalness Map**:
   - Source: Determine from frame color
   - Processing:
     - Gold/Silver: High metalness (0.8-0.9)
     - Others: Low metalness (0.0-0.1)

#### **B. Texture Processing Pipeline**

**Recommended Tools**:
- ImageMagick or Sharp (Node.js) for batch processing
- WebP conversion for optimization
- Texture compression (Basis Universal or KTX2 for Three.js)

**Processing Steps**:
1. Extract frame area from blank images
2. Generate seamless textures (tileable patterns)
3. Create normal maps from chevron images
4. Optimize file sizes (target: <200KB per texture)
5. Generate mipmaps for Three.js

#### **C. Texture Mapping Strategy**

**Frame Geometry UV Mapping**:
- Map textures to frame profile (front face, bevel, depth)
- Use chevron images to inform UV coordinates
- Apply corner detail textures to frame corners

**Mount/Mat Textures**:
- Use mount sample images as diffuse maps
- Apply to mount geometry with proper scaling

**Canvas Textures**:
- Use `Canvas-substrate-texture.jpg` for canvas material
- Apply to canvas edges and back panel

---

### 2.4 Architecture Changes

#### **A. Recommended Folder Structure**

```
public/
├── prodigi-assets/                    # Main assets directory
│   ├── frames/
│   │   ├── classic/
│   │   │   ├── textures/
│   │   │   │   ├── black-diffuse.webp
│   │   │   │   ├── black-normal.webp
│   │   │   │   ├── black-roughness.webp
│   │   │   │   ├── white-diffuse.webp
│   │   │   │   └── ... (all colors)
│   │   │   ├── chevrons/
│   │   │   │   ├── black-chevron.jpg
│   │   │   │   └── ... (all colors)
│   │   │   ├── corners/
│   │   │   │   ├── black-near-corner.jpg
│   │   │   │   └── ... (all views)
│   │   │   └── cross-sections/
│   │   │       └── classic-cross-section.png
│   │   ├── aluminium/
│   │   │   ├── textures/
│   │   │   └── ...
│   │   ├── box/
│   │   │   └── ...
│   │   └── spacer/
│   │       └── ...
│   ├── mounts/
│   │   ├── black-mount.jpg
│   │   ├── off-white-mount.jpg
│   │   └── snow-white-mount.jpg
│   ├── canvas/
│   │   ├── textures/
│   │   │   ├── substrate-texture.jpg
│   │   │   └── blank-canvas.jpg
│   │   ├── wraps/
│   │   │   ├── black-wrap.jpg
│   │   │   ├── white-wrap.jpg
│   │   │   ├── image-wrap.jpg
│   │   │   └── mirror-wrap.jpg
│   │   └── corners/
│   │       └── ...
│   ├── lifestyle/
│   │   ├── classic-frames/
│   │   ├── canvas/
│   │   ├── acrylic/
│   │   └── ...
│   ├── packaging/
│   │   ├── boxes/
│   │   └── tubes/
│   └── reference/
│       ├── cross-sections/
│       └── technical/
├── prodigi-assets-extracted/          # Original extracted files (keep for reference)
└── ...
```

#### **B. New Components to Create**

1. **`TextureLoader.tsx`** (Utility Component)
   ```typescript
   // Handles loading and caching of Prodigi textures
   // Provides fallback to color-based materials
   // Manages texture optimization and LOD (Level of Detail)
   ```

2. **`FrameTextureProvider.tsx`** (Context Provider)
   ```typescript
   // Provides texture loading state
   // Caches loaded textures
   // Handles texture preloading
   ```

3. **`ProdigiFrameMaterial.tsx`** (Material Component)
   ```typescript
   // Creates Three.js materials from Prodigi textures
   // Handles diffuse, normal, roughness maps
   // Applies proper material properties
   ```

4. **`MountTexture.tsx`** (Material Component)
   ```typescript
   // Handles mount/mat texture loading
   // Applies mount color and texture
   ```

5. **`CanvasTexture.tsx`** (Material Component)
   ```typescript
   // Handles canvas substrate texture
   // Applies wrap textures to canvas edges
   ```

6. **`LifestyleImageGallery.tsx`** (UI Component)
   ```typescript
   // Displays lifestyle images for product types
   // Used in product detail pages and AI chat
   ```

7. **`FrameReferenceViewer.tsx`** (UI Component)
   ```typescript
   // Shows chevron, corner, cross-section views
   // Used in frame selection and AI chat
   ```

#### **C. New Hooks to Create**

1. **`useProdigiTexture.ts`**
   ```typescript
   // Hook for loading Prodigi frame textures
   // Returns texture loading state and texture objects
   // Handles caching and error fallback
   ```

2. **`useFrameMaterial.ts`**
   ```typescript
   // Hook for creating frame materials from textures
   // Returns Three.js material with proper properties
   ```

3. **`useMountTexture.ts`**
   ```typescript
   // Hook for loading mount textures
   ```

4. **`useCanvasTexture.ts`**
   ```typescript
   // Hook for loading canvas textures and wraps
   ```

5. **`useLifestyleImages.ts`**
   ```typescript
   // Hook for loading lifestyle images for a product type
   // Used in galleries and AI chat
   ```

#### **D. New Utilities to Create**

1. **`lib/prodigi-textures/texture-processor.ts`**
   ```typescript
   // Utility functions for texture processing
   // Color extraction from images
   // Normal map generation
   // Texture optimization
   ```

2. **`lib/prodigi-textures/texture-mapper.ts`**
   ```typescript
   // Maps Prodigi color names to texture paths
   // Handles texture path resolution
   // Provides fallback mappings
   ```

3. **`lib/prodigi-textures/color-extractor.ts`**
   ```typescript
   // Extracts dominant colors from frame blank images
   // Creates color palette database
   // Provides color fallbacks
   ```

4. **`lib/prodigi-assets/asset-catalog.ts`**
   ```typescript
   // Catalog of all Prodigi assets
   // Provides asset metadata (type, color, view, etc.)
   // Used by AI chat and UI components
   ```

#### **E. Refactoring Required**

1. **`FrameModel.tsx`**
   - Replace hardcoded color materials with texture-based materials
   - Add texture loading logic
   - Implement fallback to color-based materials
   - Add support for normal/roughness maps

2. **`RoomScene.tsx`**
   - Integrate lifestyle images as environment maps
   - Use wall context images for backgrounds
   - Improve lighting based on lifestyle photos

3. **AI Chat Components**
   - Add asset reference capability
   - Integrate lifestyle images in responses
   - Show frame examples using chevron/corner images

---

### 2.5 Performance Considerations

#### **A. Texture Loading Strategy**

1. **Lazy Loading**:
   - Load textures only when frame is selected
   - Preload common frame colors (black, white, natural)
   - Use intersection observer for gallery images

2. **Texture Compression**:
   - Convert to WebP format (smaller file sizes)
   - Use texture compression (Basis Universal for Three.js)
   - Generate multiple resolutions (1x, 2x, 4x) for LOD

3. **Caching**:
   - Cache loaded textures in memory
   - Use browser cache for texture files
   - Implement texture atlas for multiple frames

#### **B. Image Optimization**

1. **Lifestyle Images**:
   - Lazy load in galleries
   - Use Next.js Image component for optimization
   - Generate thumbnails for previews

2. **Reference Images** (chevrons, corners):
   - Load on demand
   - Use WebP format
   - Compress for web delivery

#### **C. Three.js Optimization**

1. **Material Reuse**:
   - Reuse materials across frame instances
   - Share textures between similar frames

2. **Geometry Optimization**:
   - Cache frame geometries
   - Use instancing for multiple frames

3. **Rendering Optimization**:
   - Use texture LOD based on camera distance
   - Implement frustum culling
   - Use texture streaming for large images

---

## 3. Implementation Roadmap

### Phase 1: Foundation (V2.0) - Weeks 1-2

**Priority: Critical**

1. **Asset Organization**
   - [ ] Organize extracted assets into recommended folder structure
   - [ ] Process frame blank images (crop, optimize, convert to WebP)
   - [ ] Create texture mapping utility (`texture-mapper.ts`)
   - [ ] Create asset catalog (`asset-catalog.ts`)

2. **Core Texture Loading**
   - [ ] Create `useProdigiTexture` hook
   - [ ] Create `TextureLoader` utility component
   - [ ] Implement texture path resolution
   - [ ] Add fallback to color-based materials

3. **Frame Material Integration**
   - [ ] Refactor `FrameModel.tsx` to use textures
   - [ ] Create `ProdigiFrameMaterial` component
   - [ ] Integrate diffuse maps from blank images
   - [ ] Test with all classic frame colors

**Deliverables**:
- Organized asset structure
- Working texture loading system
- Frame previews using actual Prodigi textures

---

### Phase 2: Enhanced Materials (V2.1) - Weeks 3-4

**Priority: High**

1. **Advanced Texture Maps**
   - [ ] Generate normal maps from chevron images
   - [ ] Create roughness maps based on frame type
   - [ ] Implement metalness maps for metallic frames
   - [ ] Integrate all maps into frame materials

2. **Mount & Canvas Textures**
   - [ ] Create `useMountTexture` hook
   - [ ] Integrate mount textures into FrameModel
   - [ ] Create `useCanvasTexture` hook
   - [ ] Integrate canvas substrate texture
   - [ ] Add canvas wrap textures

3. **Corner Details**
   - [ ] Extract corner detail patterns
   - [ ] Apply corner textures to frame geometry
   - [ ] Improve frame corner realism

**Deliverables**:
- Normal/roughness maps working
- Mount textures integrated
- Canvas textures integrated
- Enhanced frame realism

---

### Phase 3: AI Chat & UX (V2.2) - Weeks 5-6

**Priority: Medium-High**

1. **AI Chat Integration**
   - [ ] Create `LifestyleImageGallery` component
   - [ ] Integrate lifestyle images into AI chat responses
   - [ ] Add frame reference viewer to AI chat
   - [ ] Create asset catalog for AI chat access

2. **Product Detail Pages**
   - [ ] Add lifestyle image galleries
   - [ ] Show chevron/corner views
   - [ ] Display cross-sections for technical details
   - [ ] Add mount sample selector

3. **Onboarding**
   - [ ] Create frame selection carousel with Prodigi images
   - [ ] Show lifestyle examples in onboarding
   - [ ] Add visual frame comparison tool

**Deliverables**:
- AI chat with visual examples
- Enhanced product detail pages
- Improved onboarding experience

---

### Phase 4: Advanced Features (V2.3+) - Weeks 7-8

**Priority: Medium**

1. **Environment Integration**
   - [ ] Use lifestyle images as environment maps
   - [ ] Improve RoomScene with Prodigi wall contexts
   - [ ] Add realistic lighting from lifestyle photos

2. **Packaging Visualization**
   - [ ] Show packaging images in checkout
   - [ ] Add shipping size visualization
   - [ ] Display packaging in order confirmation

3. **Performance Optimization**
   - [ ] Implement texture compression
   - [ ] Add texture LOD system
   - [ ] Optimize image loading
   - [ ] Implement texture caching

**Deliverables**:
- Enhanced environment rendering
- Packaging visualization
- Optimized performance

---

## 4. Usage Examples

### 4.1 Frame Preview Renderer

```typescript
// src/components/studio/FramePreview/FrameModel.tsx

import { useProdigiTexture } from '@/hooks/useProdigiTexture';
import { ProdigiFrameMaterial } from '@/components/prodigi/ProdigiFrameMaterial';

export function FrameModel({ color, style, size, mount, mountColor }: FrameModelProps) {
  // Load Prodigi textures
  const { 
    diffuseMap, 
    normalMap, 
    roughnessMap, 
    isLoading, 
    error 
  } = useProdigiTexture({
    frameType: 'classic',
    color: color.toLowerCase(),
    style: style.toLowerCase()
  });

  // Create material with textures
  const frameMaterial = useMemo(() => {
    if (isLoading || error) {
      // Fallback to color-based material
      return createColorBasedMaterial(color);
    }
    
    return new THREE.MeshStandardMaterial({
      map: diffuseMap,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      metalness: getMetalness(color),
      roughness: getRoughness(color, style),
    });
  }, [diffuseMap, normalMap, roughnessMap, isLoading, error, color, style]);

  // ... rest of component
}
```

### 4.2 AI Chat Integration

```typescript
// src/components/studio/AIChat/MessageRenderer.tsx

import { useLifestyleImages } from '@/hooks/useLifestyleImages';
import { LifestyleImageGallery } from '@/components/prodigi/LifestyleImageGallery';

export function MessageRenderer({ message, productType }: Props) {
  const lifestyleImages = useLifestyleImages(productType);

  // When AI suggests a frame type, show examples
  if (message.suggestsFrame) {
    return (
      <div>
        <p>{message.text}</p>
        <LifestyleImageGallery 
          images={lifestyleImages}
          frameType={message.suggestedFrame}
        />
      </div>
    );
  }

  // ... rest of component
}
```

### 4.3 Product Detail Pages

```typescript
// src/app/(dashboard)/shop/[id]/page.tsx

import { FrameReferenceViewer } from '@/components/prodigi/FrameReferenceViewer';
import { LifestyleImageGallery } from '@/components/prodigi/LifestyleImageGallery';

export default function ProductDetailPage({ params }: Props) {
  const product = await getProduct(params.id);

  return (
    <div>
      <ProductPreview product={product} />
      
      {/* Show frame details */}
      <FrameReferenceViewer
        frameType={product.frameType}
        color={product.frameColor}
        views={['chevron', 'corner', 'cross-section']}
      />
      
      {/* Show lifestyle examples */}
      <LifestyleImageGallery
        productType={product.type}
        frameType={product.frameType}
      />
    </div>
  );
}
```

### 4.4 Texture Loading Hook

```typescript
// src/hooks/useProdigiTexture.ts

import { useState, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import { getTexturePath } from '@/lib/prodigi-textures/texture-mapper';

interface UseProdigiTextureOptions {
  frameType: 'classic' | 'aluminium' | 'box' | 'spacer';
  color: string;
  style?: string;
  maps?: ('diffuse' | 'normal' | 'roughness')[];
}

export function useProdigiTexture({
  frameType,
  color,
  style,
  maps = ['diffuse']
}: UseProdigiTextureOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get texture paths
  const texturePaths = useMemo(() => {
    return maps.reduce((acc, mapType) => {
      const path = getTexturePath({ frameType, color, style, mapType });
      if (path) acc[mapType] = path;
      return acc;
    }, {} as Record<string, string>);
  }, [frameType, color, style, maps]);

  // Load textures
  const textures = useTexture(
    Object.values(texturePaths),
    (loaded) => {
      setIsLoading(false);
    },
    (error) => {
      setError(error);
      setIsLoading(false);
    }
  );

  // Map textures to their types
  const textureMap = useMemo(() => {
    const result: Record<string, any> = {};
    Object.entries(texturePaths).forEach(([type, path], index) => {
      result[type] = textures[index];
    });
    return result;
  }, [textures, texturePaths]);

  return {
    ...textureMap,
    isLoading,
    error,
  };
}
```

---

## 5. Technical Specifications

### 5.1 Texture Requirements

**Format**: WebP (primary), PNG (fallback)
**Resolution**: 
- Diffuse: 2048x2048 (1x), 4096x4096 (2x)
- Normal: 1024x1024 (1x), 2048x2048 (2x)
- Roughness: 512x512 (1x), 1024x1024 (2x)

**File Size Targets**:
- Diffuse: <200KB (1x), <500KB (2x)
- Normal: <100KB (1x), <250KB (2x)
- Roughness: <50KB (1x), <100KB (2x)

### 5.2 Color Mapping

**Prodigi Color → Texture Path Mapping**:
```typescript
const COLOR_MAPPING = {
  'black': 'black',
  'white': 'white',
  'brown': 'brown',
  'natural': 'natural',
  'dark grey': 'dark-grey',
  'light grey': 'light-grey',
  'gold': 'gold',
  'silver': 'silver',
  'antique gold': 'antique-gold',
  'antique silver': 'antique-silver',
};
```

### 5.3 Material Properties

**Frame Type Material Properties**:
```typescript
const MATERIAL_PROPERTIES = {
  classic: {
    metalness: 0.1,
    roughness: 0.5,
  },
  aluminium: {
    metalness: 0.9,
    roughness: 0.2,
  },
  box: {
    metalness: 0.1,
    roughness: 0.6,
  },
  spacer: {
    metalness: 0.1,
    roughness: 0.5,
  },
};
```

---

## 6. Testing Strategy

### 6.1 Texture Loading Tests

- Test texture loading for all frame types and colors
- Test fallback to color-based materials
- Test error handling for missing textures
- Test texture caching

### 6.2 Visual Regression Tests

- Compare rendered frames with Prodigi reference images
- Test color accuracy against blank frame images
- Verify corner details match reference
- Check mount texture accuracy

### 6.3 Performance Tests

- Measure texture loading times
- Test memory usage with multiple textures
- Verify texture compression effectiveness
- Test LOD system performance

---

## 7. Success Metrics

1. **Visual Accuracy**: Frame previews match Prodigi reference images (95%+ similarity)
2. **Performance**: Texture loading <500ms, frame render <16ms (60fps)
3. **User Experience**: Increased frame selection confidence (measured via analytics)
4. **AI Chat**: Improved frame recommendation accuracy (measured via user feedback)

---

## 8. Next Steps

1. **Immediate Actions**:
   - Review and approve this integration plan
   - Set up asset processing pipeline
   - Create initial texture processing scripts

2. **Week 1 Tasks**:
   - Organize assets into recommended structure
   - Create texture mapping utilities
   - Implement basic texture loading

3. **Ongoing**:
   - Process textures incrementally
   - Test and refine material properties
   - Gather user feedback on visual accuracy

---

## Appendix A: Asset File Reference

### Classic Frames
- Blanks: `prodigi-classic-frame-blanks/`
- Photos: `prodigi-classic-frames-photo-assets/`
- Colors: Black, White, Brown, Natural, Dark Grey, Light Grey, Gold, Silver, Antique Gold, Antique Silver

### Aluminium Frames
- Blanks: `prodigi-aluminium-frames-blank-assets/Aluminium frames/`
- Colors: Black, Silver, Gold

### Box Frames
- Photos: `prodigi-box-frames-photo-assets/`
- Colors: Black, Brown, Natural, White

### Spacer Frames
- Photos: `prodigi-spacer-frames-photo-assets/`
- Colors: Black, Brown, Natural, White

### Canvas Products
- Stretched: `prodigi-stretched-canvas-photo-assets/`
- Framed: `prodigi-framed-canvas-photo-assets/`
- Rolled: `prodigi-rolled-canvas-photo-assets/`
- Eco: `prodigi-eco-canvas-photo-assets/`, `prodigi-eco-rolled-canvas-photo-assets/`

### Other Products
- Acrylic: `prodigi-acrylic-panels-photo-assets/`
- Dibond: `prodigi-dibond-photo-assets/`
- Mounted: `prodigi-mounted-prints-photo-assets/`
- Instagram: `prodigi-instagram-framed-prints-photo-assets/`
- Photo Tiles: `prodigi-framed-photo-tiles-photo-assets/`
- Cork: `prodigi-framed-cork-pin-board-blank-asset/`

### Packaging
- `Prodigi packaging/`

---

## Appendix B: Texture Processing Commands

### Extract Frame Area from Blank Images
```bash
# Using ImageMagick (example for classic black frame)
convert "prodigi-classic-frame-blanks/Black classic frame_blank.png" \
  -crop 80%x80%+10%+10% \
  -resize 2048x2048 \
  "public/prodigi-assets/frames/classic/textures/black-diffuse.webp"
```

### Generate Normal Map from Chevron
```bash
# Using ImageMagick (requires additional processing)
# This is a simplified example - actual normal map generation is more complex
convert "prodigi-classic-frames-photo-assets/Classic black frame chevron.jpg" \
  -colorspace Gray \
  -normalize \
  "public/prodigi-assets/frames/classic/textures/black-normal.webp"
```

### Batch Process All Frames
```typescript
// scripts/process-prodigi-textures.ts
// Script to batch process all frame textures
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-11-24  
**Author**: AI Assistant  
**Status**: Ready for Implementation



