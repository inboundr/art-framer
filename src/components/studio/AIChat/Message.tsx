/**
 * Message Component
 * Displays individual chat messages
 */

'use client';

import { marked } from 'marked';
import { ExpandableImage } from './ExpandableImage';
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

  // Extract image URLs from markdown content
  const extractImagesFromMarkdown = (content: string): Array<{ url: string; alt: string }> => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: Array<{ url: string; alt: string }> = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      const alt = match[1] || '';
      let url = match[2];
      
      // Remove any protocol (http://, https://) if present
      if (url.startsWith('http://') || url.startsWith('https://')) {
        try {
          const urlObj = new URL(url);
          // If hostname is "prodigi-assets-extracted", preserve it in the path
          if (urlObj.hostname === 'prodigi-assets-extracted') {
            // Reconstruct path with hostname as part of path
            url = `/prodigi-assets-extracted${urlObj.pathname}`;
          } else {
            // For other URLs, just use pathname
            url = urlObj.pathname;
          }
        } catch {
          // If URL parsing fails, manually extract path
          url = url.replace(/^https?:\/\//, '');
          // If it contains prodigi-assets-extracted, preserve it
          if (url.includes('prodigi-assets-extracted')) {
            const match = url.match(/(prodigi-assets-extracted\/.*)/);
            if (match) {
              url = `/${match[1]}`;
            } else {
              url = `/prodigi-assets-extracted${url.substring(url.indexOf('/'))}`;
            }
          } else {
            // Remove hostname (everything before first /)
            const firstSlash = url.indexOf('/');
            if (firstSlash > 0) {
              url = url.substring(firstSlash);
            } else {
              url = `/${url}`;
            }
          }
        }
      }
      
      // Convert relative paths to absolute local paths
      if (!url.startsWith('/')) {
        // Handle paths that might have prodigi-assets-extracted prefix
        if (url.includes('prodigi-assets-extracted')) {
          url = url.replace(/^.*?prodigi-assets-extracted/, '/prodigi-assets-extracted');
        } else {
          url = `/${url}`;
        }
      }
      
      // Ensure prodigi-assets-extracted paths are correct
      if (url.includes('prodigi-assets-extracted') && !url.startsWith('/prodigi-assets-extracted')) {
        url = url.replace(/.*?(prodigi-assets-extracted.*)/, '/$1');
      }
      
      images.push({ url, alt });
    }
    
    return images;
  };

  // Remove image markdown from content to avoid double rendering
  const cleanContent = (content: string): string => {
    return content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '').trim();
  };

  const markdownImages = extractImagesFromMarkdown(message.content || '');
  const cleanedContent = cleanContent(message.content || '');

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
          {cleanedContent && (
            <div
              className="text-sm prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: marked.parse(cleanedContent),
              }}
            />
          )}
        </div>
        
        {/* Render markdown images as expandable images */}
        {!isUser && markdownImages.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {markdownImages.map((img, index) => (
              <ExpandableImage
                key={index}
                src={img.url}
                alt={img.alt || `Image ${index + 1}`}
                description={img.alt}
              />
            ))}
          </div>
        )}
        
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
            {lifestyleImages.slice(0, 3).map((imagePath, index) => (
              <ExpandableImage
                key={index}
                src={imagePath}
                alt={`Example ${index + 1}`}
                description="lifestyle"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

