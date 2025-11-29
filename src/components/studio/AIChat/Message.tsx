/**
 * Message Component
 * Displays individual chat messages
 */

'use client';

import { marked } from 'marked';
import Image from 'next/image';
import { useLifestyleImages } from '@/hooks/useLifestyleImages';
import { ProductComparison } from './ProductComparison';
import { ImageSuggestions } from './ImageSuggestions';

interface ComparisonData {
  option1: any;
  option2: any;
  differences: string[];
  similarities: string[];
  recommendation?: string;
}

interface ImageSuggestion {
  path: string;
  type: string;
  description: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  productType?: string;
  showLifestyleImages?: boolean;
  comparison?: ComparisonData;
  imageSuggestions?: {
    images: ImageSuggestion[];
    productType?: string;
    frameType?: string;
    frameColor?: string;
  };
}

interface MessageProps {
  message: Message;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const lifestyleImages = useLifestyleImages({
    productType: (message.productType as any) || 'framed-print',
    limit: 3,
  });

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div
            className="text-sm prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: marked.parse(message.content || ''),
            }}
          />
        </div>
        
        {!isUser && (
          <div className="flex items-center gap-1 mt-1 px-2">
            <span className="text-xs text-gray-400">AI Assistant</span>
          </div>
        )}
      </div>
      </div>

      {/* Product Comparison */}
      {!isUser && message.comparison && (
        <div className="mt-3 max-w-[85%]">
          <ProductComparison
            option1={message.comparison.option1}
            option2={message.comparison.option2}
            differences={message.comparison.differences}
            similarities={message.comparison.similarities}
            recommendation={message.comparison.recommendation}
          />
        </div>
      )}

      {/* Image Suggestions from Agent */}
      {!isUser && message.imageSuggestions && message.imageSuggestions.images.length > 0 && (
        <div className="mt-3 max-w-[85%]">
          <ImageSuggestions
            images={message.imageSuggestions.images}
            productType={message.imageSuggestions.productType}
            frameType={message.imageSuggestions.frameType}
            frameColor={message.imageSuggestions.frameColor}
          />
        </div>
      )}

      {/* Lifestyle Images for Assistant Messages (fallback) */}
      {!isUser && message.showLifestyleImages && !message.imageSuggestions && lifestyleImages.length > 0 && (
        <div className="mt-3 max-w-[85%]">
          <div className="text-xs text-gray-500 mb-2 font-medium">
            Examples:
          </div>
          <div className="grid grid-cols-3 gap-2">
            {lifestyleImages.slice(0, 3).map((imagePath, index) => {
              // Ensure path is absolute (starts with /)
              // Next.js Image component handles URL encoding automatically
              let path = imagePath;
              if (!path.startsWith('/')) {
                path = `/${path}`;
              }
              
              return (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
                >
                  <Image
                    src={path}
                    alt={`Example ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 150px"
                    onError={(e) => {
                      console.error('Lifestyle image load error:', path, e);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

