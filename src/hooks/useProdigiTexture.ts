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
import { validateTexturePaths, markTexturePathAsValid, markTexturePathAsInvalid } from '@/lib/prodigi-textures/texture-validator';

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

  // Get texture keys for loading - validate paths first
  const textureKeys = useMemo(() => {
    if (!enabled || texturePaths.length === 0) {
      return [];
    }
    const paths = texturePaths.map(({ path }) => path);
    // Validate paths before loading - this prevents loading non-existent textures
    return validateTexturePaths(paths);
  }, [enabled, texturePaths]);

  // Load textures using drei's useTexture
  // IMPORTANT: drei's useTexture uses Suspense internally
  // If textures fail to load, Suspense will throw an error
  // This error is caught by the ErrorBoundary in the component tree
  // We validate paths first to minimize errors, but can't prevent all of them
  // The ErrorBoundary should provide fallback materials, not crash the app
  
  // Only call useTexture if we have valid texture keys
  // Pass empty array if no valid textures - drei handles this gracefully
  // Note: We can't wrap useTexture in try-catch because it uses Suspense
  // Errors are handled by ErrorBoundary in the component tree
  const loadedTexturesRaw = useTexture(textureKeys.length > 0 ? textureKeys : []);
  const loadedTextures = Array.isArray(loadedTexturesRaw) 
    ? loadedTexturesRaw 
    : (loadedTexturesRaw ? [loadedTexturesRaw] : []) as THREE.Texture[];
  
  // Mark successfully loaded textures as valid
  useEffect(() => {
    if (loadedTextures.length > 0 && textureKeys.length > 0) {
      textureKeys.forEach((path, index) => {
        if (loadedTextures[index] && loadedTextures[index] instanceof THREE.Texture) {
          markTexturePathAsValid(path);
        }
      });
    }
  }, [loadedTextures, textureKeys]);

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
      // No textures loaded or no textures to load - this is OK, we'll use fallback
      setIsLoading(false);
      setError(null); // Don't set error if no textures - fallback is expected
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

