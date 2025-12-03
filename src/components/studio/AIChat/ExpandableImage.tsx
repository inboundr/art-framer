/**
 * Expandable Image Component
 * Displays images that can be clicked to expand in a modal
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getSupabaseAssetUrlSync } from '@/lib/prodigi-assets/supabase-assets';

interface ExpandableImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailClassName?: string;
  description?: string;
}

export function ExpandableImage({
  src,
  alt,
  className = '',
  thumbnailClassName = '',
  description,
}: ExpandableImageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize path and convert to Supabase URL if it's a Prodigi asset
  let imagePath = src;
  
  // Check if this is already a Supabase URL (contains supabase.co)
  const isSupabaseUrl = imagePath.includes('supabase.co');
  
  if (!isSupabaseUrl) {
    // Remove any protocol (http://, https://) if present
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      try {
        const url = new URL(imagePath);
        // If hostname is "prodigi-assets-extracted", preserve it in the path
        if (url.hostname === 'prodigi-assets-extracted') {
          // Reconstruct path with hostname as part of path
          imagePath = `/prodigi-assets-extracted${url.pathname}`;
        } else {
          // For other URLs, just use pathname
          imagePath = url.pathname;
        }
      } catch {
        // If URL parsing fails, manually extract path
        imagePath = imagePath.replace(/^https?:\/\//, '');
        // If it contains prodigi-assets-extracted, preserve it
        if (imagePath.includes('prodigi-assets-extracted')) {
          const match = imagePath.match(/(prodigi-assets-extracted\/.*)/);
          if (match) {
            imagePath = `/${match[1]}`;
          } else {
            imagePath = `/prodigi-assets-extracted${imagePath.substring(imagePath.indexOf('/'))}`;
          }
        } else {
          // Remove hostname (everything before first /)
          const firstSlash = imagePath.indexOf('/');
          if (firstSlash > 0) {
            imagePath = imagePath.substring(firstSlash);
          } else {
            imagePath = `/${imagePath}`;
          }
        }
      }
    }
    
    // Handle paths that might have hostname-like prefix without protocol
    // e.g., "prodigi-assets-extracted/..." should become "/prodigi-assets-extracted/..."
    if (imagePath.includes('prodigi-assets-extracted')) {
      // Extract everything from /prodigi-assets-extracted onwards
      const match = imagePath.match(/(\/prodigi-assets-extracted\/.*)/);
      if (match) {
        imagePath = match[1];
      } else if (imagePath.includes('prodigi-assets-extracted/')) {
        // Handle case where it's "prodigi-assets-extracted/..." without leading /
        const match2 = imagePath.match(/(prodigi-assets-extracted\/.*)/);
        if (match2) {
          imagePath = `/${match2[1]}`;
        }
      } else if (!imagePath.startsWith('/')) {
        // If it doesn't start with /, add it
        imagePath = `/${imagePath}`;
      }
    } else {
      // For other paths, ensure they start with /
      if (!imagePath.startsWith('/')) {
        imagePath = `/${imagePath}`;
      }
    }
    
    // Convert Prodigi asset paths to Supabase URLs
    if (imagePath.startsWith('/prodigi-assets') || imagePath.startsWith('/prodigi-assets-extracted')) {
      imagePath = getSupabaseAssetUrlSync(imagePath);
    }
  }

  return (
    <>
      <div
        className={`relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group hover:border-blue-300 transition-colors cursor-pointer ${thumbnailClassName}`}
        onClick={() => setIsExpanded(true)}
      >
        <Image
          src={imagePath}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 150px"
          onError={(e) => {
            console.error('Image load error:', imagePath, e);
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 rounded-full p-2">
            <svg
              className="w-5 h-5 text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>
        {description && (
          <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-white truncate px-1">{description}</p>
          </div>
        )}
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              onClick={() => setIsExpanded(false)}
              aria-label="Close"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="relative w-full h-full max-w-5xl max-h-[85vh]">
              <Image
                src={imagePath}
                alt={alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            {description && (
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-white text-sm bg-black/50 rounded-lg px-4 py-2 inline-block">
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

