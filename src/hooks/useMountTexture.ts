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
  enabled = false, // Default to false - color-based materials are primary
}: UseMountTextureOptions): UseMountTextureResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get texture path
  const texturePath = useMemo(() => {
    if (!enabled) return null;
    return getMountTexturePath(color);
  }, [color, enabled]);

  // Load texture using drei's useTexture
  // IMPORTANT: drei's useTexture uses Suspense internally
  // If textures fail to load, Suspense will throw an error
  // This error is caught by the ErrorBoundary in the component tree
  // We validate paths first to minimize errors, but can't prevent all of them
  // The ErrorBoundary should provide fallback materials, not crash the app
  // 
  // Pass empty array if no texture path to avoid loading placeholder.png
  // This prevents the 404 error for /placeholder.png
  const textureArray = texturePath ? [texturePath] : [];
  
  // Only call useTexture if we have a valid texture path
  // Pass empty array if no valid textures - drei handles this gracefully
  // Note: We can't wrap useTexture in try-catch because it uses Suspense
  // Errors are handled by ErrorBoundary in the component tree
  const loadedTextureRaw = useTexture(textureArray);
  const loadedTexture = texturePath && loadedTextureRaw
    ? (Array.isArray(loadedTextureRaw) ? loadedTextureRaw[0] : loadedTextureRaw)
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
    // These colors were extracted from Prodigi mount images
    const mountColorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'off-white': '#F8F8F0',
      'offwhite': '#F8F8F0',
      'off white': '#F8F8F0',
      'snow white': '#FFFAFA',
      'snowwhite': '#FFFAFA',
      'snow-white': '#FFFAFA',
    };
    
    // Normalize color name - handle variations
    const normalized = color.toLowerCase().trim().replace(/\s+/g, '-');
    const directMatch = mountColorMap[normalized];
    
    // Try with spaces replaced by hyphens
    if (directMatch) {
      return directMatch;
    }
    
    // Try original normalized (with spaces)
    const withSpaces = color.toLowerCase().trim();
    if (mountColorMap[withSpaces]) {
      return mountColorMap[withSpaces];
    }
    
    // Default to white for unknown colors
    return '#FFFFFF';
  }, [color]);

  return {
    texture,
    isLoading: enabled ? isLoading : false,
    error,
    fallbackColor,
  };
}

