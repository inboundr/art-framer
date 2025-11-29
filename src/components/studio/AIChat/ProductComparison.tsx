/**
 * Product Comparison Component
 * Displays side-by-side comparison of two product configurations
 */

'use client';

import Image from 'next/image';
import { getChevronImage } from '@/lib/prodigi-assets/asset-catalog';

interface ComparisonOption {
  frameColor?: string;
  frameStyle?: string;
  size?: string;
  productType?: string;
  mount?: string;
  mountColor?: string;
  glaze?: string;
  wrap?: string;
  price?: number;
}

interface ProductComparisonProps {
  option1: ComparisonOption;
  option2: ComparisonOption;
  differences: string[];
  similarities: string[];
  recommendation?: string;
}

export function ProductComparison({
  option1,
  option2,
  differences,
  similarities,
  recommendation,
}: ProductComparisonProps) {
  const getFramePreview = (option: ComparisonOption) => {
    if (option.frameColor && option.frameStyle) {
      return getChevronImage(option.frameStyle, option.frameColor);
    }
    return null;
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Calculating...';
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Compare Options</h4>
        <p className="text-xs text-gray-600">Side-by-side comparison</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Option 1 */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 mb-2">Option 1</div>
          
          {getFramePreview(option1) && (
            <div className="relative aspect-video w-full rounded overflow-hidden mb-2 border border-gray-200">
              <Image
                src={getFramePreview(option1)!}
                alt={`${option1.frameColor} ${option1.frameStyle} frame`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 50vw, 200px"
              />
            </div>
          )}
          
          <div className="space-y-1 text-xs">
            {option1.frameColor && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frame:</span>
                <span className="font-medium capitalize">{option1.frameColor}</span>
              </div>
            )}
            {option1.size && (
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span className="font-medium">{option1.size}</span>
              </div>
            )}
            {option1.productType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{option1.productType.replace('-', ' ')}</span>
              </div>
            )}
            {option1.mount && option1.mount !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mount:</span>
                <span className="font-medium">{option1.mount}</span>
              </div>
            )}
            {option1.glaze && option1.glaze !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Glaze:</span>
                <span className="font-medium capitalize">{option1.glaze}</span>
              </div>
            )}
            {option1.price && (
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-600 font-semibold">Price:</span>
                <span className="font-bold text-blue-700">{formatPrice(option1.price)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Option 2 */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 mb-2">Option 2</div>
          
          {getFramePreview(option2) && (
            <div className="relative aspect-video w-full rounded overflow-hidden mb-2 border border-gray-200">
              <Image
                src={getFramePreview(option2)!}
                alt={`${option2.frameColor} ${option2.frameStyle} frame`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 50vw, 200px"
              />
            </div>
          )}
          
          <div className="space-y-1 text-xs">
            {option2.frameColor && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frame:</span>
                <span className="font-medium capitalize">{option2.frameColor}</span>
              </div>
            )}
            {option2.size && (
              <div className="flex justify-between">
                <span className="text-gray-600">Size:</span>
                <span className="font-medium">{option2.size}</span>
              </div>
            )}
            {option2.productType && (
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{option2.productType.replace('-', ' ')}</span>
              </div>
            )}
            {option2.mount && option2.mount !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mount:</span>
                <span className="font-medium">{option2.mount}</span>
              </div>
            )}
            {option2.glaze && option2.glaze !== 'none' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Glaze:</span>
                <span className="font-medium capitalize">{option2.glaze}</span>
              </div>
            )}
            {option2.price && (
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-600 font-semibold">Price:</span>
                <span className="font-bold text-blue-700">{formatPrice(option2.price)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Differences */}
      {differences.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
          <div className="text-xs font-semibold text-yellow-800 mb-1">Key Differences:</div>
          <ul className="text-xs text-yellow-700 space-y-0.5">
            {differences.map((diff, index) => (
              <li key={index}>• {diff}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Similarities */}
      {similarities.length > 0 && (
        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
          <div className="text-xs font-semibold text-green-800 mb-1">Similarities:</div>
          <ul className="text-xs text-green-700 space-y-0.5">
            {similarities.map((sim, index) => (
              <li key={index}>• {sim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
          <div className="text-xs font-semibold text-blue-800 mb-1">💡 Recommendation:</div>
          <p className="text-xs text-blue-700">{recommendation}</p>
        </div>
      )}
    </div>
  );
}

