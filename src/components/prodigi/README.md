# Prodigi Components

This directory contains components for integrating Prodigi assets into Art-Framer V2.

## Components

### ProdigiFrameMaterial
Creates Three.js materials from Prodigi frame textures.

```tsx
import { ProdigiFrameMaterial } from '@/components/prodigi';

<ProdigiFrameMaterial frameType="classic" color="black">
  {(material) => (
    <mesh geometry={frameGeometry} material={material} />
  )}
</ProdigiFrameMaterial>
```

### MountTexture
Creates mount/mat materials from Prodigi textures.

```tsx
import { MountTexture } from '@/components/prodigi';

<MountTexture color="white">
  {(material) => (
    <mesh geometry={mountGeometry} material={material} />
  )}
</MountTexture>
```

### CanvasTexture
Creates canvas materials from Prodigi textures.

```tsx
import { CanvasTexture } from '@/components/prodigi';

<CanvasTexture substrateType="substrate" wrapType="black">
  {({ substrateMaterial, wrapMaterial }) => (
    <>
      <mesh geometry={substrateGeometry} material={substrateMaterial} />
      <mesh geometry={wrapGeometry} material={wrapMaterial} />
    </>
  )}
</CanvasTexture>
```

### LifestyleImageGallery
Displays lifestyle images for product types.

```tsx
import { LifestyleImageGallery } from '@/components/prodigi';

<LifestyleImageGallery productType="framed-print" limit={6} />
```

### FrameReferenceViewer
Shows frame reference images (chevron, corner, cross-section).

```tsx
import { FrameReferenceViewer } from '@/components/prodigi';

<FrameReferenceViewer
  frameType="classic"
  color="black"
  views={['chevron', 'corner', 'cross-section']}
/>
```

## Hooks

### useProdigiTexture
Loads Prodigi frame textures.

```tsx
import { useProdigiTexture } from '@/hooks/useProdigiTexture';

const { diffuseMap, normalMap, isLoading, error } = useProdigiTexture({
  frameType: 'classic',
  color: 'black',
  maps: ['diffuse', 'normal'],
});
```

### useFrameMaterial
Creates Three.js materials from Prodigi textures.

```tsx
import { useFrameMaterial } from '@/hooks/useFrameMaterial';

const { material, isLoading, hasTextures } = useFrameMaterial({
  frameType: 'classic',
  color: 'black',
});
```

### useMountTexture
Loads mount textures.

```tsx
import { useMountTexture } from '@/hooks/useMountTexture';

const { texture, fallbackColor } = useMountTexture({
  color: 'white',
});
```

### useCanvasTexture
Loads canvas textures.

```tsx
import { useCanvasTexture } from '@/hooks/useCanvasTexture';

const { substrateTexture, wrapTexture } = useCanvasTexture({
  substrateType: 'substrate',
  wrapType: 'black',
});
```

### useLifestyleImages
Gets lifestyle images for a product type.

```tsx
import { useLifestyleImages } from '@/hooks/useLifestyleImages';

const images = useLifestyleImages({
  productType: 'framed-print',
  limit: 6,
});
```

## Usage in FrameModel

The `FrameModel` component has been updated to use Prodigi textures automatically. It will:

1. Try to load textures from `/prodigi-assets/frames/{frameType}/textures/`
2. Fall back to color-based materials if textures are not available
3. Use Prodigi mount textures when available
4. Use Prodigi canvas textures for canvas products

## Texture Processing

To process Prodigi textures, run:

```bash
npx tsx scripts/process-prodigi-textures.ts
```

This will:
- Convert frame blanks to WebP format
- Generate 1x and 2x resolution versions
- Optimize file sizes
- Create organized output structure

## Asset Structure

Textures should be organized as:

```
public/prodigi-assets/
├── frames/
│   ├── classic/textures/
│   │   ├── black-diffuse-1x.webp
│   │   ├── black-diffuse-2x.webp
│   │   └── ...
│   └── ...
├── mounts/
│   ├── black-mount.webp
│   └── ...
└── canvas/
    ├── textures/
    └── wraps/
```

## Fallback Behavior

All components and hooks support graceful fallback:

- If textures are not available, they fall back to color-based materials
- If texture loading fails, error is logged but component continues
- Color fallbacks are provided for all Prodigi frame colors



