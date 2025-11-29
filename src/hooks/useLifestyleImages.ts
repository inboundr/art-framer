/**
 * useLifestyleImages Hook
 * Loads lifestyle images for product types
 */

import { useMemo } from 'react';
import { getLifestyleImages, type ProductType } from '@/lib/prodigi-assets/asset-catalog';

export interface UseLifestyleImagesOptions {
  productType: ProductType;
  limit?: number;
}

export function useLifestyleImages({
  productType,
  limit,
}: UseLifestyleImagesOptions): string[] {
  const images = useMemo(() => {
    const allImages = getLifestyleImages(productType);
    return limit ? allImages.slice(0, limit) : allImages;
  }, [productType, limit]);

  return images;
}



