'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCuratedGallery } from '@/hooks/useCuratedGallery';
import { CuratedImage } from '@/lib/curated-images';
import { Heart, Eye, Download, Share2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDynamicAnimationsSafe } from '@/hooks/useDynamicHooksSafe';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CuratedImageCardProps {
  image: CuratedImage;
  onImageClick?: (image: CuratedImage) => void;
  onBuyAsFrame?: (image: CuratedImage) => void;
  onOpenAuthModal?: () => void;
  animationDelay?: number;
}

function CuratedImageCard({ image, onImageClick, onBuyAsFrame, onOpenAuthModal, animationDelay = 0 }: CuratedImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { createTransition } = useDynamicAnimationsSafe();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImageClick = () => {
    onImageClick?.(image);
  };

  const handleBuyAsFrame = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering image click
    if (!user) {
      // Store the selected image in localStorage for after login
      localStorage.setItem('pending-cart-image', JSON.stringify({
        id: image.id,
        image_url: image.image_url,
        title: image.title,
        description: image.description,
        aspect_ratio: image.aspect_ratio,
        timestamp: Date.now()
      }));
      
      // Show auth modal for non-authenticated users
      if (onOpenAuthModal) {
        onOpenAuthModal();
      }
      return;
    }
    // Directly trigger the frame selection without opening CreationsModal
    onBuyAsFrame?.(image);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageClick?.(image);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement like functionality
    console.log('Like clicked for image:', image.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: image.title,
        text: `Check out this beautiful AI-generated art: ${image.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Link has been copied to clipboard.',
      });
    }
  };

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  return (
    <Card 
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg"
      style={{
        animationDelay: `${animationDelay}ms`,
        transition: createTransition([
          { property: 'transform', duration: 300 },
          { property: 'box-shadow', duration: 300 },
        ]),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleImageClick}
    >
      <CardContent className="p-0 relative">
        {/* Image Container */}
        <div className="relative overflow-hidden group">
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <img
            src={image.image_url}
            alt={image.title}
            className={`w-full h-auto object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            loading="lazy"
          />
          
          {/* Order Frame Button - Top Right Corner */}
          <div 
            className={`absolute top-2 right-2 transition-all duration-300 pointer-events-auto ${
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <Button 
              size="sm" 
              variant="default" 
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-3 py-2 shadow-lg"
              onClick={handleBuyAsFrame}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Order Frame
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}

interface CuratedImageGalleryProps {
  className?: string;
  showFilters?: boolean;
  enableAnimations?: boolean;
  onImageClick?: (image: CuratedImage) => void;
  onBuyAsFrame?: (image: CuratedImage) => void;
  onOpenAuthModal?: () => void;
}

export function CuratedImageGallery({ 
  className = '',
  showFilters = true,
  enableAnimations = true,
  onImageClick,
  onBuyAsFrame,
  onOpenAuthModal
}: CuratedImageGalleryProps) {
  const { images, loading, error, hasMore, loadMore } = useCuratedGallery();
  const { user } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery render:', { 
      imagesCount: images.length, 
      loading, 
      hasError: !!error,
      hasMore,
      errorMessage: error?.message
    });
  }, [images.length, loading, error, hasMore]);

  // Additional debug logging for initial load
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery initial load check:', { 
      images: images.length > 0 ? `${images.length} images loaded` : 'no images yet',
      loading,
      error: error ? error.message : 'no error',
      hasMore
    });
  }, []);

  // Additional debug logging for hook state
  useEffect(() => {
    console.log('🖼️ CuratedImageGallery hook state:', { 
      images: images.length > 0 ? `${images.length} images` : 'no images',
      loading,
      error: error ? error.message : 'no error',
      hasMore
    });
  }, [images, loading, error, hasMore]);

  // Check for pending cart image after login
  useEffect(() => {
    if (user) {
      const pendingImageData = localStorage.getItem('pending-cart-image');
      if (pendingImageData) {
        try {
          const pendingImage = JSON.parse(pendingImageData);
          // Check if the data is not too old (within 1 hour)
          const isRecent = Date.now() - pendingImage.timestamp < 60 * 60 * 1000;
          if (isRecent) {
            console.log('🛒 Found pending cart image after login:', pendingImage);
            // Convert to CuratedImage format and show modal
            const curatedImage: CuratedImage = {
              id: pendingImage.id,
              image_url: pendingImage.image_url,
              title: pendingImage.title,
              description: pendingImage.description,
              category: 'curated',
              tags: [],
              thumbnail_url: null,
              width: 800,
              height: 600,
              aspect_ratio: pendingImage.aspect_ratio,
              display_order: 0,
              is_featured: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            // Directly trigger frame selection for pending image
            onBuyAsFrame?.(curatedImage);
            // Clear the pending image
            localStorage.removeItem('pending-cart-image');
          } else {
            // Clear old pending image
            localStorage.removeItem('pending-cart-image');
          }
        } catch (error) {
          console.error('Error parsing pending cart image:', error);
          localStorage.removeItem('pending-cart-image');
        }
      }
    }
  }, [user]);
  const [isHydrated, setIsHydrated] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Dynamic animations hook
  const { createTransition } = useDynamicAnimationsSafe();

  // Ensure hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleBuyAsFrame = (image: CuratedImage) => {
    // Directly trigger frame selection without opening CreationsModal
    onBuyAsFrame?.(image);
  };


  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Only create observer if we have more content to load
    if (!hasMore || loading) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          console.log('🔄 Curated gallery intersection observer triggered loadMore');
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading]); // Remove loadMore from dependencies to prevent infinite re-creation

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load images</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-col items-center self-stretch bg-background text-foreground ${className}`}
    >
      <div 
        className="flex flex-col items-center w-full max-w-7xl mx-auto py-6 px-4"
      >
        {/* Masonry Layout Container */}
        <div className="w-full">
          {/* Dynamic Responsive Masonry Columns */}
          <div 
            className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-4"
          >
            {images.map((image, index) => (
              <CuratedImageCard 
                key={`${image.id}-${index}`}
                image={image}
                onImageClick={onImageClick}
                onBuyAsFrame={handleBuyAsFrame}
                onOpenAuthModal={onOpenAuthModal}
                animationDelay={enableAnimations ? index * 100 : 0}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div 
            ref={loadingRef}
            className="flex justify-center items-center py-8"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
                <span className="text-muted-foreground">Loading more images...</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Scroll to load more</div>
            )}
          </div>
        )}

        {/* No more images */}
        {!hasMore && images.length > 0 && (
          <div className="flex justify-center items-center py-8">
            <div className="text-muted-foreground">No more images to load</div>
          </div>
        )}

        {/* Empty state */}
        {!loading && images.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">No images found</h3>
              <p className="text-muted-foreground">Check back later for new curated content.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
