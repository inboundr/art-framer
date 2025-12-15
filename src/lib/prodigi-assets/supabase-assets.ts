/**
 * Supabase Assets Utility
 * Converts local asset paths to Supabase storage URLs
 */

import { supabase } from '@/lib/supabase/client';

const PRODIGI_ASSETS_BUCKET = 'prodigi-assets';

/**
 * Converts a local asset path to a Supabase storage URL
 * 
 * @param localPath - Local path like "/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp"
 * @returns Supabase public URL or the original path if conversion fails
 */
export async function getSupabaseAssetUrl(localPath: string): Promise<string> {
  // Remove leading slash and convert to storage path
  let storagePath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  // IMPORTANT: Strip "prodigi-assets/" prefix if present (same logic as sync version)
  // Only strip if it's "prodigi-assets/" not "prodigi-assets-extracted/"
  if (storagePath.startsWith('prodigi-assets/') && !storagePath.startsWith('prodigi-assets-extracted/')) {
    storagePath = storagePath.slice('prodigi-assets/'.length);
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(PRODIGI_ASSETS_BUCKET)
      .getPublicUrl(storagePath);
    
    if (error) {
      console.warn(`Failed to get Supabase URL for ${localPath}:`, error);
      return localPath; // Fallback to original path
    }
    
    return data.publicUrl;
  } catch (error) {
    console.warn(`Error getting Supabase URL for ${localPath}:`, error);
    return localPath; // Fallback to original path
  }
}

/**
 * Sanitize file path for Supabase Storage
 * Replaces problematic characters that Supabase doesn't accept
 * This matches the sanitization used in the upload script
 * Preserves directory structure, only sanitizes problematic characters
 */
function sanitizeStoragePath(filePath: string): string {
  // Split path into directory and filename
  const pathParts = filePath.split('/');
  const directory = pathParts.slice(0, -1).join('/');
  const filename = pathParts[pathParts.length - 1];
  
  // Sanitize only the filename (not directory structure)
  const sanitizedFilename = filename
    .replace(/–/g, '-') // Replace em dash (U+2013) with regular dash
    .replace(/—/g, '-') // Replace en dash (U+2014) with regular dash
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[^\w\s\-._()]/g, '-') // Replace other special chars with dash (keep dots, underscores, parens, spaces)
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space (keep spaces)
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .trim();
  
  // Reconstruct path
  return directory ? `${directory}/${sanitizedFilename}` : sanitizedFilename;
}

/**
 * Synchronously converts a local asset path to a Supabase storage URL
 * This uses the public URL pattern directly without async calls
 * 
 * @param localPath - Local path like "/prodigi-assets/frames/classic/textures/black-diffuse-1x.webp"
 *                    or "/prodigi-assets-extracted/prodigi-classic-frames-photo-assets/..."
 * @returns Supabase public URL
 */
export function getSupabaseAssetUrlSync(localPath: string): string {
  // Remove leading slash and convert to storage path
  let storagePath = localPath.startsWith('/') ? localPath.slice(1) : localPath;
  
  // IMPORTANT: Files are uploaded to Supabase with paths relative to the public/ directory
  // - Files from public/prodigi-assets/ are stored as "prodigi-assets/frames/..."
  // - Files from public/prodigi-assets-extracted/ are stored as "prodigi-assets-extracted/..."
  // - Files from public/samples/ are stored as "samples/..."
  //
  // The bucket name is "prodigi-assets", so when constructing the URL:
  // - For "prodigi-assets/frames/..." → we need to strip the prefix to avoid duplication
  // - For "prodigi-assets-extracted/..." → we keep it as-is (different folder)
  // - For "samples/..." → we keep it as-is (different folder)
  //
  // Only strip "prodigi-assets/" prefix if it's the first segment (not "prodigi-assets-extracted")
  if (storagePath.startsWith('prodigi-assets/') && !storagePath.startsWith('prodigi-assets-extracted/')) {
    storagePath = storagePath.slice('prodigi-assets/'.length);
  }
  
  // Sanitize the path to match uploaded file names (handles em dashes, special chars, etc.)
  storagePath = sanitizeStoragePath(storagePath);
  
  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    // Fail fast - Supabase URL must be configured
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set. Assets have been migrated to Supabase Storage.');
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required. Assets are now served from Supabase Storage.');
  }
  
  // URL-encode each path segment to handle spaces and special characters
  // Split by '/' and encode each segment separately to preserve directory structure
  const encodedPath = storagePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  
  // Construct public URL: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  // The bucket name is "prodigi-assets" and the path is:
  // - "frames/..." (after stripping prodigi-assets/ prefix)
  // - "prodigi-assets-extracted/..." (kept as-is)
  // - "samples/..." (kept as-is)
  return `${supabaseUrl}/storage/v1/object/public/${PRODIGI_ASSETS_BUCKET}/${encodedPath}`;
}

/**
 * Batch convert multiple paths to Supabase URLs
 */
export function getSupabaseAssetUrlsSync(localPaths: string[]): string[] {
  return localPaths.map(getSupabaseAssetUrlSync);
}

