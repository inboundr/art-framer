/**
 * useFrameMaterial Hook
 * Creates Three.js materials from Prodigi textures
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useProdigiTexture, type UseProdigiTextureOptions } from './useProdigiTexture';
import { getFrameTextureConfig } from '@/lib/prodigi-textures/frame-texture-config';

export interface UseFrameMaterialOptions extends UseProdigiTextureOptions {
  useTextures?: boolean;
}

export function useFrameMaterial(options: UseFrameMaterialOptions) {
  const { useTextures = true, frameType, color, ...textureOptions } = options;
  
  // Get enhanced configuration from our database
  const textureConfig = useMemo(
    () => getFrameTextureConfig(frameType, color),
    [frameType, color]
  );
  
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
    frameType,
    color,
    enabled: useTextures,
  });

  // Create material
  const material = useMemo(() => {
    // Build material config using enhanced texture configuration
    const materialConfig: any = {
      metalness: textureConfig.metalness,
      roughness: textureConfig.roughness,
      color: textureConfig.baseColor,
      envMapIntensity: textureConfig.envMapIntensity || 0.5,
    };

    // Only add textures if they exist (don't pass undefined)
    if (useTextures && hasTextures && !error) {
      if (diffuseMap) {
        materialConfig.map = diffuseMap;
        
        // Apply texture repeat from configuration
        if (textureConfig.textureRepeat) {
          diffuseMap.repeat.set(
            textureConfig.textureRepeat[0],
            textureConfig.textureRepeat[1]
          );
          diffuseMap.wrapS = THREE.RepeatWrapping;
          diffuseMap.wrapT = THREE.RepeatWrapping;
        }
        
        // Apply texture rotation if specified
        if (textureConfig.textureRotation !== undefined) {
          diffuseMap.rotation = textureConfig.textureRotation;
        }
        
        diffuseMap.needsUpdate = true;
      }
      
      if (normalMap) {
        materialConfig.normalMap = normalMap;
        if (textureConfig.bumpScale) {
          materialConfig.normalScale = new THREE.Vector2(
            textureConfig.bumpScale,
            textureConfig.bumpScale
          );
        }
        
        // Match repeat settings
        if (textureConfig.textureRepeat) {
          normalMap.repeat.set(
            textureConfig.textureRepeat[0],
            textureConfig.textureRepeat[1]
          );
          normalMap.wrapS = THREE.RepeatWrapping;
          normalMap.wrapT = THREE.RepeatWrapping;
        }
        normalMap.needsUpdate = true;
      }
      
      if (roughnessMap) {
        materialConfig.roughnessMap = roughnessMap;
        // Match repeat settings
        if (textureConfig.textureRepeat) {
          roughnessMap.repeat.set(
            textureConfig.textureRepeat[0],
            textureConfig.textureRepeat[1]
          );
          roughnessMap.wrapS = THREE.RepeatWrapping;
          roughnessMap.wrapT = THREE.RepeatWrapping;
        }
        roughnessMap.needsUpdate = true;
      }
      
      if (metalnessMap) {
        materialConfig.metalnessMap = metalnessMap;
        // Match repeat settings
        if (textureConfig.textureRepeat) {
          metalnessMap.repeat.set(
            textureConfig.textureRepeat[0],
            textureConfig.textureRepeat[1]
          );
          metalnessMap.wrapS = THREE.RepeatWrapping;
          metalnessMap.wrapT = THREE.RepeatWrapping;
        }
        metalnessMap.needsUpdate = true;
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
    textureConfig,
  ]);

  return {
    material,
    isLoading,
    error,
    hasTextures,
    fallbackColor: textureConfig.baseColor,
    materialProperties: {
      metalness: textureConfig.metalness,
      roughness: textureConfig.roughness,
    },
    textureConfig, // Return the full config for reference
  };
}

