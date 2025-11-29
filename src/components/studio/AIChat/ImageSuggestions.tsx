/**
 * Image Suggestions Component
 * Displays visual examples and lifestyle images from Prodigi assets
 */

'use client';

import Image from 'next/image';

interface ImageSuggestion {
  path: string;
  type: string;
  description: string;
}

interface ImageSuggestionsProps {
  images: ImageSuggestion[];
  productType?: string;
  frameType?: string;
  frameColor?: string;
}

export function ImageSuggestions({
  images,
  productType,
  frameType,
  frameColor,
}: ImageSuggestionsProps) {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Visual Examples</h4>
        <p className="text-xs text-gray-600">
          {productType && `Examples of ${productType.replace('-', ' ')}`}
          {frameColor && frameType && ` with ${frameColor} ${frameType} frame`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => {
          // Ensure path is absolute (starts with /)
          // Next.js Image component handles URL encoding automatically
          let imagePath = image.path;
          if (!imagePath.startsWith('/')) {
            imagePath = `/${imagePath}`;
          }
          
          return (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group hover:border-blue-300 transition-colors"
            >
              <Image
                src={imagePath}
                alt={image.description || `Example ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 150px"
                onError={(e) => {
                  console.error('Image load error:', imagePath, e);
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate px-1">{image.type}</p>
              </div>
            </div>
          );
        })}
      </div>

      {images.length > 3 && (
        <p className="text-xs text-gray-500 mt-2">
          Showing {images.length} example{images.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

