/**
 * useProdigiTexture Hook
 * Loads Prodigi frame textures with fallback support
 */

import { useState, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { 
  getTexturePath, 
  getFallbackColor, 
  getMaterialProperties,
  type FrameType,
  type TextureMapType 
} from '@/lib/prodigi-textures/texture-mapper';

export interface UseProdigiTextureOptions {
  frameType: FrameType;
  color: string;
  style?: string;
  maps?: TextureMapType[];
  resolution?: '1x' | '2x';
  enabled?: boolean;
}

export interface UseProdigiTextureResult {
  // Textures
  diffuseMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
  
  // State
  isLoading: boolean;
  error: Error | null;
  
  // Fallback
  fallbackColor: string;
  materialProperties: { metalness: number; roughness: number };
  
  // Helper
  hasTextures: boolean;
}

export function useProdigiTexture({
  frameType,
  color,
  style,
  maps = ['diffuse'],
  resolution = '1x',
  enabled = true,
}: UseProdigiTextureOptions): UseProdigiTextureResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get texture paths
  const texturePaths = useMemo(() => {
    if (!enabled) return [];
    
    return maps
      .map((mapType) => {
        const path = getTexturePath({ frameType, color, mapType, resolution, style });
        return path ? { type: mapType, path } : null;
      })
      .filter((item): item is { type: TextureMapType; path: string } => item !== null);
  }, [frameType, color, maps, resolution, style, enabled]);

  // Get texture keys for loading
  const textureKeys = useMemo(() => {
    if (!enabled || texturePaths.length === 0) {
      return [];
    }
    return texturePaths.map(({ path }) => path);
  }, [enabled, texturePaths]);

  // Load textures using drei's useTexture
  // useTexture works with Suspense - errors are caught by ErrorBoundary
  // We always call useTexture (can't conditionally call hooks)
  // Pass empty array if no textures - drei should handle this gracefully
  // If it throws, ErrorBoundary will catch it
  const loadedTexturesRaw = useTexture(textureKeys.length > 0 ? textureKeys : []);
  const loadedTextures = Array.isArray(loadedTexturesRaw) 
    ? loadedTexturesRaw 
    : (loadedTexturesRaw ? [loadedTexturesRaw] : []) as THREE.Texture[];

  // Configure loaded textures
  useEffect(() => {
    if (Array.isArray(loadedTextures) && loadedTextures.length > 0) {
      loadedTextures.forEach((texture) => {
        if (texture instanceof THREE.Texture) {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
        }
      });
      setIsLoading(false);
      setError(null);
    } else {
      // No textures loaded or no textures to load
      setIsLoading(false);
    }
  }, [loadedTextures]);

  // Map textures to their types
  const textureMap = useMemo(() => {
    const result: Record<string, THREE.Texture | null> = {
      diffuse: null,
      normal: null,
      roughness: null,
      metalness: null,
    };

    if (Array.isArray(loadedTextures) && loadedTextures.length > 0 && texturePaths.length > 0) {
      texturePaths.forEach(({ type }, index) => {
        const texture = loadedTextures[index];
        if (texture && texture instanceof THREE.Texture) {
          result[type] = texture;
        }
      });
    }

    return result;
  }, [loadedTextures, texturePaths]);

  // Fallback values
  const fallbackColor = useMemo(() => getFallbackColor(color), [color]);
  const materialProperties = useMemo(
    () => getMaterialProperties(frameType, color),
    [frameType, color]
  );

  // Check if we have any textures loaded
  const hasTextures = useMemo(() => {
    return Object.values(textureMap).some((tex) => tex !== null);
  }, [textureMap]);

  // Reset loading state if disabled
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
    }
  }, [enabled]);

  return {
    diffuseMap: textureMap.diffuse,
    normalMap: textureMap.normal,
    roughnessMap: textureMap.roughness,
    metalnessMap: textureMap.metalness,
    isLoading: enabled ? isLoading : false,
    error,
    fallbackColor,
    materialProperties,
    hasTextures,
  };
}

