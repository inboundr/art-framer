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
}

export function ArtworkPlane({ imageUrl, size }: ArtworkPlaneProps) {
  // Parse size
  const [widthInches, heightInches] = size.split('x').map(Number);
  const width = (widthInches || 16) / 12; // Convert to feet
  const height = (heightInches || 20) / 12;

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

