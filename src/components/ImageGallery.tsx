'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGallery, useImageInteractions } from '@/hooks/useSupabaseGallery';
import { Image } from '@/lib/supabase/images';
import { useDynamicLayoutSafe, useDynamicAnimationsSafe, useDynamicThemeSafe, useIntersectionAnimationSafe } from '@/hooks/useDynamicHooksSafe';

interface ImageCardProps {
  image: Image;
  onLike: (imageId: string) => void;
  onUnlike: (imageId: string) => void;
  isLiked?: boolean;
  isInteracting?: boolean;
}

function ImageCard({ image, onLike, onUnlike, isLiked = false, isInteracting = false }: ImageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { theme, isDark, getAdaptiveColor } = useDynamicThemeSafe();
  const { animatePreset, createTransition } = useDynamicAnimationsSafe();
  const { isMobile } = useDynamicLayoutSafe();

  // Intersection animation for smooth entry
  const { ref: animationRef, hasAnimated } = useIntersectionAnimationSafe(
    'fadeIn',
    { duration: 400 },
    { threshold: 0.1 }
  );

  // Set both refs
  useEffect(() => {
    if (cardRef.current) {
      animationRef(cardRef.current);
    }
  }, [animationRef]);

  // Hover animations
  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !isMobile) {
      animatePreset(cardRef.current, 'scaleIn', { duration: 200 });
    }
  }, [animatePreset, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && !isMobile) {
      animatePreset(cardRef.current, 'scaleOut', { duration: 150 });
    }
  }, [animatePreset, isMobile]);

  // Like animation
  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (cardRef.current) {
      animatePreset(cardRef.current, 'bounce', { duration: 400 });
    }
    
    if (isLiked) {
      onUnlike(image.id);
    } else {
      onLike(image.id);
    }
  }, [image.id, isLiked, onLike, onUnlike, animatePreset]);

  const getAspectRatioClass = () => {
    // Map our aspect ratios to CSS classes
    switch (image.aspect_ratio) {
      case 'square':
        return 'aspect-square';
      case 'wide':
        return 'aspect-[4/3] md:aspect-[3/2]';
      case 'tall':
        return 'aspect-[3/4] md:aspect-[2/3]';
      default:
        return 'aspect-square';
    }
  };

  return (
    <div 
      ref={cardRef}
      className="break-inside-avoid mb-2"
      style={{
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? 'translateY(0)' : 'translateY(20px)',
        transition: createTransition([
          { property: 'opacity', duration: 400 },
          { property: 'transform', duration: 400 },
        ]),
      }}
    >
      <div 
        className="relative group cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transition: createTransition([
            { property: 'transform', duration: 200 },
            { property: 'box-shadow', duration: 200 },
          ]),
        }}
      >
        {/* Image Container */}
        <div className={`${getAspectRatioClass()} w-full overflow-hidden rounded-lg bg-dark-tertiary`}>
          {/* Gradient Background */}
          <div 
            className="w-full h-full bg-gradient-to-br from-pink-primary/20 via-purple-500/20 to-blue-500/20 relative"
            style={{
              background: 'linear-gradient(151deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
            }}
          >
            {/* Checker Pattern Overlay */}
            <div className="absolute top-0 left-0 w-full h-full opacity-100">
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 19 19" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-[18px] h-[18px]"
              >
                <g clipPath="url(#clip0_8_95304)">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M0.164062 0.810547H9.13966V9.78615H0.164062V0.810547ZM9.13966 9.78615H18.1153V18.7617H9.13966V9.78615Z" 
                    fill="#09090B"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_8_95304">
                    <rect width="17.9512" height="17.9512" fill="white" transform="translate(0.164062 0.810547)"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            
            {/* Actual Image */}
            <img 
              src={image.image_url || '/placeholder.svg'}
              alt={image.prompt}
              className="w-full h-full object-cover absolute top-0 left-0"
              loading="lazy"
            />
          </div>
        </div>

        {/* Like Button - Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-colors">
            <span className="text-white text-xs font-medium">{image.likes}</span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 21 21" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              <path 
                d="M9.56016 16.9852C9.85794 17.1407 10.2046 17.1407 10.5013 16.9852C12.0713 16.1652 17.0313 13.1963 17.0313 8.37074C17.0345 7.35178 16.6335 6.37313 15.9161 5.6495C15.1987 4.92586 14.2236 4.51633 13.2046 4.51074C12.5758 4.51866 11.9584 4.67937 11.4056 4.97901C10.8528 5.27866 10.3811 5.70824 10.0313 6.23074C9.68153 5.70839 9.21004 5.2789 8.65742 4.97927C8.1048 4.67964 7.48762 4.51884 6.85905 4.51074C5.8399 4.51603 4.86449 4.92544 4.14686 5.64911C3.42923 6.37277 3.02802 7.35159 3.03127 8.37074C3.03127 13.1974 7.99016 16.1652 9.56016 16.9852Z" 
                stroke="white" 
                strokeWidth="1.67" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg" />
      </div>
    </div>
  );
}

export function ImageGallery() {
  const { images, loading: isLoading, hasMore, loadMore } = useGallery();
  const { likeImage, unlikeImage, interactionLoading } = useImageInteractions();
  
  // Hydration-safe state
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Dynamic UI hooks with safe fallbacks
  const { 
    isMobile, 
    isTablet, 
    breakpoint, 
    optimalImageGrid, 
    getSpacing,
    getResponsiveClasses 
  } = useDynamicLayoutSafe();
  const { theme, isDark } = useDynamicThemeSafe();
  const { createTransition, staggeredAnimate } = useDynamicAnimationsSafe();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  
  // Ensure hydration safety
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
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
  }, [loadMore, hasMore, isLoading]);

  return (
    <div 
      className="flex flex-col items-center self-stretch min-h-screen"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        transition: createTransition([
          { property: 'background-color', duration: 300 },
          { property: 'color', duration: 300 },
        ]),
      }}
    >
      <div 
        className="flex flex-col items-center w-full max-w-7xl mx-auto"
        style={{ 
          padding: isHydrated ? `${getSpacing(24)} ${getSpacing(4)}` : '24px 4px',
        }}
      >
        {/* Masonry Layout Container */}
        <div className="w-full">
          {/* Dynamic Responsive Masonry Columns */}
          <div 
            className={isHydrated ? getResponsiveClasses({
              xs: 'columns-1',
              sm: 'columns-2',
              md: 'columns-3',
              lg: 'columns-4',
              xl: 'columns-5',
              '2xl': 'columns-6',
            }) : 'columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6'}
            style={{
              gap: isHydrated ? `${optimalImageGrid.gap}px` : '16px',
              transition: isHydrated ? createTransition([
                { property: 'column-count', duration: 300 },
                { property: 'gap', duration: 300 },
              ]) : undefined,
            }}
          >
            {images.map((image, index) => (
              <ImageCard 
                key={`${image.id}-${index}`}
                image={image}
                onLike={likeImage}
                onUnlike={unlikeImage}
                isLiked={false} // TODO: Implement liked state tracking
                isInteracting={interactionLoading === image.id}
              />
            ))}
          </div>
        </div>

        {/* Loading indicator for infinite scroll */}
        {hasMore && (
          <div 
            ref={loadingRef}
            className="w-full text-center py-4"
            style={{ marginTop: isHydrated ? getSpacing(32) : '32px' }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{
                    border: isHydrated ? `2px solid ${theme.colors.border}` : '2px solid hsl(214.3, 31.8%, 91.4%)',
                    borderTopColor: isHydrated ? theme.colors.primary : 'hsl(346, 77%, 49%)',
                  }}
                />
                <span style={{ color: isHydrated ? theme.colors.mutedForeground : 'hsl(215.4, 16.3%, 46.9%)' }}>
                  Loading more images...
                </span>
              </div>
            ) : (
              <div className="w-4 h-4" /> // Invisible element for intersection observer
            )}
          </div>
        )}
      </div>
    </div>
  );
}
