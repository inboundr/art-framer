/**
 * Image Suggestions Component
 * Displays visual examples and lifestyle images from Prodigi assets
 */

'use client';

import { ExpandableImage } from './ExpandableImage';

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
        {images.map((image, index) => (
          <ExpandableImage
            key={index}
            src={image.path}
            alt={image.description || `Example ${index + 1}`}
            description={image.type}
          />
        ))}
      </div>

      {images.length > 3 && (
        <p className="text-xs text-gray-500 mt-2">
          Showing {images.length} example{images.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

