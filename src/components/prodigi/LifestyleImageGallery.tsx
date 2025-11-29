/**
 * LifestyleImageGallery Component
 * Displays lifestyle images for product types
 */

'use client';

import Image from 'next/image';
import { useLifestyleImages } from '@/hooks/useLifestyleImages';
import type { ProductType } from '@/lib/prodigi-assets/asset-catalog';
import { Card, CardContent } from '@/components/ui/card';

export interface LifestyleImageGalleryProps {
  productType: ProductType;
  limit?: number;
  className?: string;
}

/**
 * LifestyleImageGallery - Shows lifestyle images for a product type
 */
export function LifestyleImageGallery({
  productType,
  limit,
  className = '',
}: LifestyleImageGalleryProps) {
  const images = useLifestyleImages({ productType, limit });

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {images.map((imagePath, index) => {
        // Ensure path is absolute (starts with /)
        // Next.js Image component handles URL encoding automatically
        const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        
        return (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-square w-full">
                <Image
                  src={path}
                  alt={`${productType} lifestyle example ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onError={(e) => {
                    console.error('Lifestyle image load error:', path, e);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}



