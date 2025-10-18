'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { CreationsModal } from './CreationsModal';

interface UserImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
  width: number;
  height: number;
  likes: number;
  aspect_ratio?: string;
}

interface UserImageCardProps {
  image: UserImage;
  onImageClick: (image: UserImage) => void;
}

function UserImageCard({ image, onImageClick }: UserImageCardProps) {
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
    <div className="break-inside-avoid mb-2">
      <div className="relative group cursor-pointer" onClick={() => onImageClick(image)}>
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
                style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  left: '8px', 
                  zIndex: 10 
                }}
              >
                <g clipPath="url(#clip0_desktop)">
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M0.664062 0.310547H8.66406V8.31055H0.664062V0.310547ZM8.66406 8.31055H16.6641V16.3105H8.66406V8.31055Z" 
                    fill="#09090B"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_desktop">
                    <rect width="16" height="16" fill="white" transform="translate(0.664062 0.310547)"/>
                  </clipPath>
                </defs>
              </svg>
            </div>

            {/* Main Image */}
            <img
              src={getProxiedImageUrl(image.image_url)}
              alt={image.prompt}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-end">
              <div className="p-3 w-full transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                <p className="text-white text-sm font-medium line-clamp-2 mb-2">
                  {image.prompt}
                </p>
                <div className="flex items-center justify-between text-white/80 text-xs">
                  <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>
                    </svg>
                    <span>{image.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserImageGallery() {
  const { user } = useAuth();
  const [images, setImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImage, setSelectedImage] = useState<UserImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const IMAGES_PER_PAGE = 20;

  const fetchUserImages = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    console.log('🔍 UserImageGallery: fetchUserImages called', { pageNum, append, userId: user?.id });
    
    if (!user) {
      console.log('❌ UserImageGallery: No user found, stopping fetch');
      setLoading(false);
      return;
    }

    if (!supabase || !supabase.from) {
      console.error('❌ UserImageGallery: Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      const from = pageNum * IMAGES_PER_PAGE;
      const to = from + IMAGES_PER_PAGE - 1;

      console.log('🔍 UserImageGallery: Making Supabase query', { from, to, userId: user.id });

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('❌ UserImageGallery: Supabase error:', error);
        setLoading(false);
        return;
      }

      const newImages = data || [];
      console.log('✅ UserImageGallery: Fetched images', { count: newImages.length });
      
      if (append) {
        setImages(prev => [...prev, ...newImages]);
      } else {
        setImages(newImages);
      }
      
      setHasMore(newImages.length === IMAGES_PER_PAGE);
    } catch (error) {
      console.error('❌ UserImageGallery: Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, IMAGES_PER_PAGE]);

  useEffect(() => {
    if (user) {
      setPage(0);
      fetchUserImages(0, false);
    }
  }, [user, fetchUserImages]);

  const handleScroll = useCallback(() => {
    if (!galleryRef.current || !hasMore || loading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = galleryRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 1000) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserImages(nextPage, true);
    }
  }, [hasMore, loading, page, fetchUserImages]);

  useEffect(() => {
    const galleryElement = galleryRef.current;
    if (galleryElement) {
      galleryElement.addEventListener('scroll', handleScroll);
      return () => galleryElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleImageClick = (image: UserImage) => {
    setSelectedImage(image);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedImage(null);
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your creations</p>
        </div>
      </div>
    );
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your creations...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
              <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No creations yet</h3>
          <p className="text-muted-foreground mb-6">Start creating amazing AI art to see your images here</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Your First Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Container */}
      <div 
        ref={galleryRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Masonry Grid */}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
            {images.map((image) => (
              <UserImageCard
                key={image.id}
                image={image}
                onImageClick={handleImageClick}
              />
            ))}
          </div>
          
          {/* Loading indicator */}
          {loading && images.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>

      {/* CreationsModal */}
      {selectedImage && (
        <CreationsModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          imageUrl={selectedImage.image_url}
          promptText={selectedImage.prompt}
          imageId={selectedImage.id}
          isMobile={false} // You can add mobile detection here if needed
          isCuratedImage={false} // User images are not curated images
        />
      )}
    </>
  );
}
