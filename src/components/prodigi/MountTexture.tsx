/**
 * MountTexture Component
 * Creates mount/mat materials from Prodigi textures
 */

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useMountTexture } from '@/hooks/useMountTexture';

export interface MountTextureProps {
  color: string;
  useTextures?: boolean;
  children?: (material: THREE.Material) => React.ReactNode;
}

/**
 * MountTexture - Creates a mount/mat material from Prodigi textures
 */
export function MountTexture({
  color,
  useTextures = true,
  children,
}: MountTextureProps) {
  const { texture, isLoading, error, fallbackColor } = useMountTexture({
    color,
    enabled: useTextures,
  });

  const material = useMemo(() => {
    if (useTextures && texture && !error) {
      return new THREE.MeshStandardMaterial({
        map: texture,
        color: fallbackColor,
        roughness: 0.8,
        metalness: 0.0,
      });
    }

    // Fallback to color-based material
    return new THREE.MeshStandardMaterial({
      color: fallbackColor,
      roughness: 0.8,
      metalness: 0.0,
    });
  }, [texture, error, useTextures, fallbackColor]);

  if (typeof children === 'function') {
    return <>{children(material)}</>;
  }

  return <primitive object={material} />;
}



