/**
 * Converts an Ideogram image URL to use our proxy endpoint to bypass CORS restrictions
 * @param originalUrl - The original Ideogram image URL
 * @returns The proxied URL that can be used in img src attributes
 */
export function getProxiedImageUrl(originalUrl: string): string {
  if (!originalUrl) {
    return '';
  }

  // If it's not an Ideogram URL, return as-is
  if (!originalUrl.startsWith('https://ideogram.ai/')) {
    return originalUrl;
  }

  // Create the proxy URL
  const proxyUrl = new URL('/api/proxy-image', window.location.origin);
  proxyUrl.searchParams.set('url', originalUrl);
  
  return proxyUrl.toString();
}

/**
 * Batch convert multiple image URLs to use proxy
 * @param urls - Array of original image URLs
 * @returns Array of proxied URLs
 */
export function getProxiedImageUrls(urls: string[]): string[] {
  return urls.map(getProxiedImageUrl);
}
