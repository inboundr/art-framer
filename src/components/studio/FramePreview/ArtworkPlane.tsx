/**
 * Artwork Plane Component
 * Displays the user's image in the 3D scene
 */

'use client';

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface ArtworkPlaneProps {
  imageUrl: string;
  size: string;
  hasMount?: boolean;
  mount?: string; // Mount thickness (1.4mm, 2.0mm, 2.4mm)
}

export function ArtworkPlane({ imageUrl, size, hasMount = false, mount = '2.0mm' }: ArtworkPlaneProps) {
  // Parse size
  const [widthInches, heightInches] = size.split('x').map(Number);
  let width = (widthInches || 16) / 12; // Convert to feet
  let height = (heightInches || 20) / 12;
  
  // If mount is present, artwork should be smaller to fit within mount's inner window
  // Border width varies with mount thickness
  if (hasMount) {
    const mountBorderWidthMap: Record<string, number> = {
      '1.4mm': 0.14,  // Slim mat - slightly narrower border
      '2.0mm': 0.15,  // Standard mat - standard border
      '2.4mm': 0.16,  // Premium mat - slightly wider border
    };
    const mountBorderWidth = mountBorderWidthMap[mount] || 0.15;
    
    width = width - (mountBorderWidth * 2);
    height = height - (mountBorderWidth * 2);
  }

  // Load image texture
  const texture = useTexture(imageUrl);

  // Configure texture
  useMemo(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
    }
  }, [texture]);

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

