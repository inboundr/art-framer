import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { Button } from '@/components/ui/button';
import { Package, Download, Share2, XCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useCartNotification } from './CartNotificationToast';
import { supabase } from '@/lib/supabase/client';
import { useStudioStore } from '@/store/studio';

interface CreationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  promptText: string;
  imageId?: string; // Add imageId prop
  isMobile?: boolean;
  isCuratedImage?: boolean; // Add explicit flag to indicate if this is a curated image
  onOpenAuthModal?: () => void;
}

export function CreationsModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  promptText, 
  imageId,
  isMobile = false,
  isCuratedImage = false,
  onOpenAuthModal
}: CreationsModalProps) {
  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { showCartNotification } = useCartNotification();
  const { setImage } = useStudioStore();

  // Normalize any storage path into a public URL so the browser doesn't request /images/...
  const normalizedImageUrl = useMemo(() => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    const bucket = isCuratedImage ? 'curated-images' : 'images';
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(imageUrl);
      return data?.publicUrl || imageUrl;
    } catch {
      return imageUrl;
    }
  }, [imageUrl, isCuratedImage]);

  // Check for pending cart image after login and redirect to studio
  useEffect(() => {
    if (user && isOpen) {
      const pendingImageData = localStorage.getItem('pending-cart-image');
      if (pendingImageData) {
        try {
          const pendingImage = JSON.parse(pendingImageData);
          // Check if the data is not too old (within 1 hour)
          const isRecent = Date.now() - pendingImage.timestamp < 60 * 60 * 1000;
          if (isRecent) {
            console.log('🛒 CreationsModal: Found pending cart image after login:', pendingImage);
            setImage(pendingImage.image_url, pendingImage.id);
            localStorage.removeItem('pending-cart-image');
            
            // Small delay to ensure session persists
            setTimeout(() => {
              console.log('🚀 CreationsModal: Navigating to /studio (after login)');
              window.location.href = '/studio';
            }, 100);
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
  }, [user, isOpen, setImage, router]);

  if (!isOpen) return null;

  const handleBuyAsFrame = async () => {
    console.log('🎨 CreationsModal: handleBuyAsFrame called - redirecting to studio', {
      normalizedImageUrl,
      imageId
    });
    
    if (!user) {
      console.log('🔐 User not authenticated, storing pending image');
      localStorage.setItem('pending-cart-image', JSON.stringify({
        id: imageId || `gen-${Date.now()}`,
        image_url: normalizedImageUrl,
        title: promptText || 'AI Generated Image',
        timestamp: Date.now()
      }));
      if (onOpenAuthModal) {
        onOpenAuthModal();
      } else {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to order a frame.',
          variant: 'destructive',
        });
      }
      return;
    }

    setImage(normalizedImageUrl, imageId || `gen-${Date.now()}`);
    
    // Use window.location.href for more reliable redirect
    await new Promise(resolve => setTimeout(resolve, 100)); // Delay for session persistence
    console.log('🚀 CreationsModal: Navigating to /studio');
    window.location.href = '/studio';
  };

  const handleDownload = () => {
    // Implement download functionality
    const link = document.createElement('a');
    link.href = getProxiedImageUrl(normalizedImageUrl);
    link.download = `ai-art-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AI Generated Art',
        text: `Check out this AI-generated art: "${promptText}"`,
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

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
            <button
              onClick={onClose}
              className="flex w-10 h-10 items-center justify-center rounded-lg hover:bg-gray-100/50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Creation Details</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Main Image */}
            <div className="relative w-full h-[50vh] min-h-[300px] bg-gray-100 border border-gray-200 m-4">
              <div
                className="w-full h-full relative rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
                }}
              >
                <img
                  src={getProxiedImageUrl(normalizedImageUrl)}
                  alt="Generated AI Image"
                  className="w-full h-full object-cover absolute left-0 top-0"
                />
              </div>
            </div>

            {/* Mobile Details */}
            <div className="flex flex-col px-4 pb-20 space-y-6">
              {/* User Info - Commented out as Order Frame button is sufficient */}
              {/* <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex w-10 h-10 items-center justify-center rounded-full bg-gray-50">
                    <img 
                      src="https://api.builder.io/api/v1/image/assets/TEMP/a620186a6b3fd1d48fb3473778ffea7db5ca5824?width=68" 
                      alt="User Profile" 
                      className="w-9 h-9 rounded-full"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-900 text-sm font-semibold">medhatem2</span>
                    <span className="text-gray-600 text-xs">Just now</span>
                  </div>
                </div>
                <button className="flex h-9 px-4 items-center justify-center rounded-lg bg-muted/18 hover:bg-muted/30 transition-colors">
                  <span className="text-muted-foreground text-sm font-semibold">Share</span>
                </button>
              </div> */}

              {/* Mobile Action Buttons - Commented out as Order Frame button on image is sufficient */}
              {/* <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleBuyAsFrame}
                  className="flex h-10 px-4 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
                >
                  <Package className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Order Framed Print</span>
                </button>
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Try Different Frame</span>
                </button>
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Save for Later</span>
                </button>
              </div> */}

              {/* Mobile Prompt Section - Commented out */}
              {/* <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-gray-900 text-sm font-semibold">Prompt</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {promptText}
                  </p>
                </div>
              </div> */}

              {/* Mobile Model Details - Commented out */}
              {/* <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-gray-900 text-sm font-semibold block">Model</span>
                  <span className="text-gray-600 text-sm">Art Framer AI</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-900 text-sm font-semibold block">Style</span>
                  <span className="text-gray-600 text-sm">Realistic</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-900 text-sm font-semibold block">Resolution</span>
                  <span className="text-gray-600 text-sm">1:1 (1024 x 1024)</span>
                </div>
                <div className="space-y-1">
                  <span className="text-gray-900 text-sm font-semibold block">Seed</span>
                  <span className="text-gray-600 text-sm">{Math.floor(Math.random() * 1000000000)}</span>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="flex h-full">
        <div className="flex flex-col lg:flex-row flex-1 bg-background">
          {/* Left Side - Image Area */}
          <div className="flex-1 flex items-center justify-center p-4 relative min-h-[50vh] lg:min-h-full">
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 left-6 z-10 flex w-9 h-9 justify-center items-center rounded-[18px] bg-black/20 hover:bg-black/40 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M5.16406 5.81055L15.1641 15.8105M5.16406 15.8105L15.1641 5.81055" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Image Container */}
            <div className="w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center relative">
              <div
                className="w-full h-full rounded-lg overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
                }}
              >
                <img
                  src={getProxiedImageUrl(normalizedImageUrl)}
                  alt="Generated AI Image"
                  className="w-full h-full object-contain"
                />
                
                {/* Order Frame Button - Top Right Corner */}
                <div className="absolute top-4 right-4">
                  <Button
                    onClick={handleBuyAsFrame}
                    className="flex h-10 px-4 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Order Frame</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
              
          {/* Right Sidebar - Commented out as Order Frame button on image is sufficient */}
          {/*
          <div className="w-full sm:w-80 sm:min-w-80 sm:max-w-80 flex flex-col bg-secondary border-l border-border">
            <div className="flex flex-col h-full px-4 py-6 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 p-0.5">
                  <img 
                    src="https://api.builder.io/api/v1/image/assets/TEMP/a620186a6b3fd1d48fb3473778ffea7db5ca5824?width=68" 
                    alt="User Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-gray-900 text-sm font-semibold">medhatem2</div>
                  <div className="text-gray-600 text-xs">Just now</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button className="flex h-9 px-2 items-center justify-center rounded-lg hover:bg-background/50 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                      <path d="M10.193 16.785C10.4907 16.9405 10.8374 16.9405 11.1341 16.785C12.7041 15.965 17.6641 12.9961 17.6641 8.17055C17.6673 7.15158 17.2663 6.17294 16.5489 5.4493C15.8315 4.72566 14.8564 4.31613 13.8374 4.31055C13.2087 4.31847 12.5913 4.47918 12.0384 4.77882C11.4856 5.07846 11.0139 5.50805 10.6641 6.03055C10.3143 5.5082 9.84285 5.07871 9.29023 4.77907C8.73761 4.47944 8.12043 4.31865 7.49186 4.31055C6.47271 4.31584 5.4973 4.72524 4.77967 5.44891C4.06204 6.17258 3.66083 7.15139 3.66408 8.17055C3.66408 12.9972 8.62297 15.965 10.193 16.785Z" stroke="#D4D4D8" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="flex h-9 px-3 items-center justify-center rounded-lg bg-muted/18 hover:bg-muted/30 transition-colors gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-muted-foreground text-sm font-semibold">Share</span>
                  </Button>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-sm text-muted-foreground mb-1">Starting at</div>
                  <Button
                    onClick={handleBuyAsFrame}
                    className="flex h-10 px-6 items-center justify-center rounded-lg bg-primary hover:bg-primary/90 transition-colors font-semibold text-base"
                  >
                    <Package className="w-5 h-5 mr-2" />
                    <span className="text-white font-semibold">Order Framed Print</span>
                  </Button>
                  <div className="text-xs text-muted-foreground mt-1">Free shipping over $100</div>
                </div>
              </div>
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
