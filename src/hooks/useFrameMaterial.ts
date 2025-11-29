/**
 * useFrameMaterial Hook
 * Creates Three.js materials from Prodigi textures
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useProdigiTexture, type UseProdigiTextureOptions } from './useProdigiTexture';

export interface UseFrameMaterialOptions extends UseProdigiTextureOptions {
  useTextures?: boolean;
}

export function useFrameMaterial(options: UseFrameMaterialOptions) {
  const { useTextures = true, ...textureOptions } = options;
  
  // Load textures
  const {
    diffuseMap,
    normalMap,
    roughnessMap,
    metalnessMap,
    isLoading,
    error,
    fallbackColor,
    materialProperties,
    hasTextures,
  } = useProdigiTexture({
    ...textureOptions,
    enabled: useTextures,
  });

  // Create material
  const material = useMemo(() => {
    // Build material config - only include textures that exist
    const materialConfig: any = {
      metalness: materialProperties.metalness,
      roughness: materialProperties.roughness,
      color: fallbackColor,
    };

    // Only add textures if they exist (don't pass undefined)
    if (useTextures && hasTextures && !error) {
      if (diffuseMap) {
        materialConfig.map = diffuseMap;
      }
      if (normalMap) {
        materialConfig.normalMap = normalMap;
      }
      if (roughnessMap) {
        materialConfig.roughnessMap = roughnessMap;
      }
      if (metalnessMap) {
        materialConfig.metalnessMap = metalnessMap;
      }
    }

    return new THREE.MeshStandardMaterial(materialConfig);
  }, [
    useTextures,
    hasTextures,
    error,
    diffuseMap,
    normalMap,
    roughnessMap,
    metalnessMap,
    fallbackColor,
    materialProperties,
  ]);

  return {
    material,
    isLoading,
    error,
    hasTextures,
    fallbackColor,
    materialProperties,
  };
}

