/**
 * ProdigiFrameMaterial Component
 * Creates Three.js materials from Prodigi textures
 */

'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrameMaterial } from '@/hooks/useFrameMaterial';
import type { FrameType } from '@/lib/prodigi-textures/texture-mapper';

export interface ProdigiFrameMaterialProps {
  frameType: FrameType;
  color: string;
  style?: string;
  useTextures?: boolean;
  children?: (material: THREE.Material) => React.ReactNode;
}

/**
 * ProdigiFrameMaterial - Creates a Three.js material from Prodigi textures
 * 
 * Usage:
 * ```tsx
 * <ProdigiFrameMaterial frameType="classic" color="black">
 *   {(material) => (
 *     <mesh geometry={frameGeometry} material={material} />
 *   )}
 * </ProdigiFrameMaterial>
 * ```
 */
export function ProdigiFrameMaterial({
  frameType,
  color,
  style,
  useTextures = true,
  children,
}: ProdigiFrameMaterialProps) {
  const { material, isLoading, error, hasTextures } = useFrameMaterial({
    frameType,
    color,
    style,
    useTextures,
  });

  // If children is a render function, call it with the material
  if (typeof children === 'function') {
    return <>{children(material)}</>;
  }

  // Otherwise, return the material as a primitive
  return <primitive object={material} />;
}

/**
 * Hook version for direct material access
 */
export function useProdigiFrameMaterial(
  frameType: FrameType,
  color: string,
  style?: string,
  useTextures?: boolean
) {
  return useFrameMaterial({ frameType, color, style, useTextures });
}



