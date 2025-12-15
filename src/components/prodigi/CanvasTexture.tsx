/**
 * CanvasTexture Component
 * Creates canvas materials from Prodigi textures
 */

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCanvasTexture } from '@/hooks/useCanvasTexture';

export interface CanvasTextureProps {
  substrateType?: 'substrate' | 'blank';
  wrapType?: 'black' | 'white' | 'image' | 'mirror';
  useTextures?: boolean;
  children?: (materials: {
    substrateMaterial: THREE.Material;
    wrapMaterial: THREE.Material;
  }) => React.ReactNode;
}

/**
 * CanvasTexture - Creates canvas materials from Prodigi textures
 */
export function CanvasTexture({
  substrateType = 'substrate',
  wrapType,
  useTextures = false, // Default off: use color-based materials; textures optional
  children,
}: CanvasTextureProps) {
  const { substrateTexture, wrapTexture, isLoading, error } = useCanvasTexture({
    substrateType,
    wrapType,
    enabled: useTextures,
  });

  const substrateMaterial = useMemo(() => {
    if (useTextures && substrateTexture && !error) {
      return new THREE.MeshStandardMaterial({
        map: substrateTexture,
        roughness: 0.9,
        metalness: 0.0,
      });
    }

    // Fallback to canvas-like color
    return new THREE.MeshStandardMaterial({
      color: '#F5F5DC', // Canvas beige
      roughness: 0.9,
      metalness: 0.0,
    });
  }, [substrateTexture, error, useTextures]);

  const wrapMaterial = useMemo(() => {
    if (useTextures && wrapTexture && !error) {
      return new THREE.MeshStandardMaterial({
        map: wrapTexture,
        roughness: 0.7,
        metalness: 0.0,
      });
    }

    // Fallback based on wrap type
    const wrapColorMap: Record<string, string> = {
      black: '#000000',
      white: '#FFFFFF',
      image: '#606060',
      mirror: '#909090',
    };

    return new THREE.MeshStandardMaterial({
      color: wrapType ? wrapColorMap[wrapType] || '#000000' : '#000000',
      roughness: 0.7,
      metalness: 0.0,
    });
  }, [wrapTexture, error, useTextures, wrapType]);

  if (typeof children === 'function') {
    return <>{children({ substrateMaterial, wrapMaterial })}</>;
  }

  return (
    <>
      <primitive object={substrateMaterial} />
      <primitive object={wrapMaterial} />
    </>
  );
}



