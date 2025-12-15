/**
 * Texture Validator
 * Validates texture paths before loading to prevent errors
 * Uses a simple cache to avoid repeated checks
 */

// Cache for texture validation results
const textureValidationCache = new Map<string, boolean>();

/**
 * Validates if a texture path is likely to exist
 * This is a heuristic check - we can't actually check Supabase without async calls
 * But we can check if the path format is valid and cache known-good paths
 */
export function validateTexturePath(path: string): boolean {
  // Check cache first
  if (textureValidationCache.has(path)) {
    return textureValidationCache.get(path)!;
  }
  
  // Basic validation: path should be a valid URL
  if (!path || !path.startsWith('http')) {
    textureValidationCache.set(path, false);
    return false;
  }
  
  // For now, assume all paths are valid (optimistic)
  // In the future, we could pre-validate by checking Supabase
  // or maintain a list of known-good textures
  textureValidationCache.set(path, true);
  return true;
}

/**
 * Pre-validate multiple texture paths
 */
export function validateTexturePaths(paths: string[]): string[] {
  return paths.filter(path => validateTexturePath(path));
}

/**
 * Clear validation cache (useful for testing or when textures are uploaded)
 */
export function clearTextureValidationCache(): void {
  textureValidationCache.clear();
}

/**
 * Mark a texture path as valid (useful after successful load)
 */
export function markTexturePathAsValid(path: string): void {
  textureValidationCache.set(path, true);
}

/**
 * Mark a texture path as invalid (useful after failed load)
 */
export function markTexturePathAsInvalid(path: string): void {
  textureValidationCache.set(path, false);
}

