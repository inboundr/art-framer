/**
 * useCanvasTexture Hook
 * Loads canvas substrate and wrap textures
 */

import { useState, useMemo, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { 
  getCanvasTexturePath, 
  getCanvasWrapTexturePath 
} from '@/lib/prodigi-textures/texture-mapper';

export interface UseCanvasTextureOptions {
  substrateType?: 'substrate' | 'blank';
  wrapType?: 'black' | 'white' | 'image' | 'mirror';
  enabled?: boolean;
}

export interface UseCanvasTextureResult {
  substrateTexture: THREE.Texture | null;
  wrapTexture: THREE.Texture | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCanvasTexture({
  substrateType = 'substrate',
  wrapType,
  enabled = false, // Default to false - color-based materials are primary
}: UseCanvasTextureOptions): UseCanvasTextureResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get texture paths
  const texturePaths = useMemo(() => {
    if (!enabled) return [];
    
    const paths: string[] = [];
    
    if (substrateType) {
      const substratePath = getCanvasTexturePath(substrateType);
      if (substratePath) paths.push(substratePath);
    }
    
    if (wrapType) {
      const wrapPath = getCanvasWrapTexturePath(wrapType);
      if (wrapPath) paths.push(wrapPath);
    }
    
    return paths;
  }, [substrateType, wrapType, enabled]);

  // Load textures using drei's useTexture
  // useTexture works with Suspense - errors are caught by ErrorBoundary
  // We always call useTexture (can't conditionally call hooks)
  // Pass empty array if no textures - drei should handle this gracefully
  const loadedTexturesRaw = useTexture(texturePaths.length > 0 ? texturePaths : []);
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
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        }
      });
      setIsLoading(false);
      setError(null);
    } else {
      // No textures loaded or no textures to load
      setIsLoading(false);
    }
  }, [loadedTextures]);

  // Map textures
  const textureMap = useMemo(() => {
    let substrateTexture: THREE.Texture | null = null;
    let wrapTexture: THREE.Texture | null = null;

    if (loadedTextures && Array.isArray(loadedTextures)) {
      let index = 0;
      
      if (substrateType && loadedTextures[index]) {
        const tex = loadedTextures[index];
        if (tex instanceof THREE.Texture) {
          substrateTexture = tex;
        }
        index++;
      }
      
      if (wrapType && loadedTextures[index]) {
        const tex = loadedTextures[index];
        if (tex instanceof THREE.Texture) {
          wrapTexture = tex;
        }
      }
    }

    return { substrateTexture, wrapTexture };
  }, [loadedTextures, substrateType, wrapType]);

  return {
    ...textureMap,
    isLoading: enabled ? isLoading : false,
    error,
  };
}

