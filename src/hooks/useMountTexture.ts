/**
 * useMountTexture Hook
 * Loads mount/mat textures
 */

import { useState, useMemo, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getMountTexturePath, getFallbackColor } from '@/lib/prodigi-textures/texture-mapper';

export interface UseMountTextureOptions {
  color: string;
  enabled?: boolean;
}

export interface UseMountTextureResult {
  texture: THREE.Texture | null;
  isLoading: boolean;
  error: Error | null;
  fallbackColor: string;
}

export function useMountTexture({
  color,
  enabled = true,
}: UseMountTextureOptions): UseMountTextureResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get texture path
  const texturePath = useMemo(() => {
    if (!enabled) return null;
    return getMountTexturePath(color);
  }, [color, enabled]);

  // Load texture using drei's useTexture
  // useTexture works with Suspense - errors are caught by ErrorBoundary
  // We always call useTexture (can't conditionally call hooks)
  // Use placeholder if no texture path
  const texturePathToLoad = texturePath || '/placeholder.png';
  const loadedTextureRaw = useTexture(texturePathToLoad);
  const loadedTexture = texturePath && loadedTextureRaw && !texturePathToLoad.includes('placeholder')
    ? loadedTextureRaw
    : null;

  // Configure texture
  useEffect(() => {
    if (loadedTexture instanceof THREE.Texture) {
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.minFilter = THREE.LinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      setIsLoading(false);
      setError(null);
    } else {
      // No texture loaded or no texture to load
      setIsLoading(false);
    }
  }, [loadedTexture]);

  const texture = useMemo(() => {
    if (!enabled || !texturePath) return null;
    return loadedTexture instanceof THREE.Texture ? loadedTexture : null;
  }, [enabled, texturePath, loadedTexture]);

  const fallbackColor = useMemo(() => {
    // Mount colors are typically white/off-white/black
    const mountColorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'off-white': '#F8F8F0',
      'offwhite': '#F8F8F0',
      'snow white': '#FFFAFA',
      'snowwhite': '#FFFAFA',
    };
    
    const normalized = color.toLowerCase().trim();
    return mountColorMap[normalized] || '#FFFFFF';
  }, [color]);

  return {
    texture,
    isLoading: enabled ? isLoading : false,
    error,
    fallbackColor,
  };
}

