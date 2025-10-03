import React, { useState } from 'react';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { Button } from '@/components/ui/button';
import { FrameSelector } from '@/components/FrameSelector';
import { Package, Download, Share2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';

interface CreationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  promptText: string;
  imageId?: string; // Add imageId prop
  isMobile?: boolean;
}

export function CreationsModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  promptText, 
  imageId,
  isMobile = false 
}: CreationsModalProps) {
  const [showFrameSelector, setShowFrameSelector] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart } = useCart();

  if (!isOpen) return null;

  const handleBuyAsFrame = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to purchase framed art.',
        variant: 'destructive',
      });
      return;
    }
    setShowFrameSelector(true);
  };

  const handleFrameSelect = (frame: any) => {
    setSelectedFrame(frame);
  };

  const handleAddToCart = async (frame: any) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }

    if (!imageId) {
      toast({
        title: 'Image Error',
        description: 'Image ID is missing. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that imageId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(imageId)) {
      toast({
        title: 'Image Not Ready',
        description: 'The image is still being processed. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Determine if this is a curated image by checking if it starts with 'CUR-' in the URL or has specific characteristics
      const isCuratedImage = imageUrl.includes('curated') || imageUrl.includes('placeholder') || 
                            promptText.includes('Curated') || promptText.includes('Abstract') ||
                            promptText.includes('Nature') || promptText.includes('Portrait') ||
                            promptText.includes('Modern') || promptText.includes('Artistic');

      let response;
      if (isCuratedImage) {
        // Use curated products API
        response = await fetch('/api/curated-products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            curatedImageId: imageId,
            frameSize: frame.size,
            frameStyle: frame.style,
            frameMaterial: frame.material,
            price: frame.price,
          }),
        });
      } else {
        // Use regular products API
        response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            imageId: imageId,
            frameSize: frame.size,
            frameStyle: frame.style,
            frameMaterial: frame.material,
            price: frame.price,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const data = await response.json();
      
      // Use the cart context to add to cart
      const success = await addToCart(data.product.id, 1);

      if (!success) {
        throw new Error('Failed to add to cart');
      }

      toast({
        title: 'Added to Cart',
        description: 'Framed art has been added to your cart!',
      });

      setShowFrameSelector(false);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add framed art to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    // Implement download functionality
    const link = document.createElement('a');
    link.href = getProxiedImageUrl(imageUrl);
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
          <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b border-border">
            <button
              onClick={onClose}
              className="flex w-10 h-10 items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
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
            <div className="relative w-full h-[50vh] min-h-[300px] bg-secondary border border-border m-4">
              <div
                className="w-full h-full relative rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
                }}
              >
                <img
                  src={getProxiedImageUrl(imageUrl)}
                  alt="Generated AI Image"
                  className="w-full h-full object-cover absolute left-0 top-0"
                />
              </div>
            </div>

            {/* Mobile Details */}
            <div className="flex flex-col px-4 pb-20 space-y-6">
              {/* User Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex w-10 h-10 items-center justify-center rounded-full bg-background">
                    <img 
                      src="https://api.builder.io/api/v1/image/assets/TEMP/a620186a6b3fd1d48fb3473778ffea7db5ca5824?width=68" 
                      alt="User Profile" 
                      className="w-9 h-9 rounded-full"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm font-semibold">medhatem2</span>
                    <span className="text-muted-foreground text-xs">Just now</span>
                  </div>
                </div>
                <button className="flex h-9 px-4 items-center justify-center rounded-lg bg-muted/18 hover:bg-muted/30 transition-colors">
                  <span className="text-muted-foreground text-sm font-semibold">Download</span>
                </button>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Retry</span>
                </button>
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Magic fill</span>
                </button>
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Remix</span>
                </button>
                <button className="flex h-10 px-4 items-center justify-center rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <span className="text-muted-foreground text-sm font-medium">Upscale</span>
                </button>
              </div>

              {/* Mobile Prompt Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-foreground text-sm font-semibold">Prompt</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {promptText}
                  </p>
                </div>
              </div>

              {/* Mobile Model Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-foreground text-sm font-semibold block">Model</span>
                  <span className="text-muted-foreground text-sm">Art Framer AI</span>
                </div>
                <div className="space-y-1">
                  <span className="text-foreground text-sm font-semibold block">Style</span>
                  <span className="text-muted-foreground text-sm">Realistic</span>
                </div>
                <div className="space-y-1">
                  <span className="text-foreground text-sm font-semibold block">Resolution</span>
                  <span className="text-muted-foreground text-sm">1:1 (1024 x 1024)</span>
                </div>
                <div className="space-y-1">
                  <span className="text-foreground text-sm font-semibold block">Seed</span>
                  <span className="text-muted-foreground text-sm">{Math.floor(Math.random() * 1000000000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="flex h-full">
        {/* Desktop Layout */}
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
            <div className="w-full h-full max-w-4xl max-h-[80vh] flex items-center justify-center">
              <div
                className="w-full h-full rounded-lg overflow-hidden shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 159, 189, 0.20) 0%, rgba(246, 136, 194, 0.20) 20%, rgba(229, 115, 204, 0.20) 40%, rgba(200, 101, 219, 0.20) 60%, rgba(154, 94, 237, 0.20) 90%, rgba(61, 94, 255, 0.20) 100%)'
                }}
              >
                <img
                  src={getProxiedImageUrl(imageUrl)}
                  alt="Generated AI Image"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
              
          {/* Right Sidebar */}
          <div className="w-full sm:w-80 sm:min-w-80 sm:max-w-80 flex flex-col bg-secondary border-l border-border">
            <div className="flex flex-col h-full px-4 py-6 overflow-y-auto">
              {/* Profile Section */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-background p-0.5">
                  <img 
                    src="https://api.builder.io/api/v1/image/assets/TEMP/a620186a6b3fd1d48fb3473778ffea7db5ca5824?width=68" 
                    alt="User Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-foreground text-sm font-semibold">medhatem2</div>
                  <div className="text-muted-foreground text-xs">Just now</div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 mb-6">
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
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex h-9 px-3 items-center justify-center rounded-lg bg-muted/18 hover:bg-muted/30 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  <span className="text-muted-foreground text-sm font-semibold">Download</span>
                </Button>

                <Button
                  onClick={handleBuyAsFrame}
                  className="flex h-9 px-3 items-center justify-center rounded-lg bg-primary hover:bg-primary/90 transition-colors ml-auto"
                >
                  <Package className="w-4 h-4 mr-1" />
                  <span className="text-white text-sm font-semibold">Order Framed Print</span>
                </Button>
              </div>
              
              {/* Public/Private Toggle and Retry */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 bg-background rounded-full p-0.5 shadow-inner">
                  <button className="flex h-8 px-4 items-center justify-center rounded-full bg-secondary shadow-sm">
                    <span className="text-foreground text-sm font-medium">Public</span>
                  </button>
                  <button className="flex h-8 px-4 items-center justify-center rounded-full hover:bg-secondary/50 transition-colors">
                    <span className="text-muted-foreground text-sm font-medium">Private</span>
                  </button>
                </div>
                
                <button className="flex h-9 px-4 items-center justify-center rounded-md border border-border hover:bg-background/50 transition-colors">
                  <span className="text-foreground text-sm font-medium">Retry</span>
                </button>
              </div>
              
              {/* Edit Image Section */}
              <div className="mb-6">
                <h3 className="text-foreground text-sm font-semibold mb-3">Edit image</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button className="flex h-10 items-center justify-center rounded-md border border-border hover:bg-background/50 transition-colors">
                    <span className="text-muted-foreground text-sm font-semibold">Magic fill</span>
                  </button>
                  <button className="flex h-10 items-center justify-center rounded-md border border-border hover:bg-background/50 transition-colors">
                    <span className="text-muted-foreground text-sm font-semibold">Remix</span>
                  </button>
                  <button className="flex h-10 items-center justify-center rounded-md border border-border hover:bg-background/50 transition-colors">
                    <span className="text-muted-foreground text-sm font-semibold">Upscale</span>
                  </button>
                </div>
              </div>
              
              {/* Prompt Section */}
              <div className="flex-1">
                <h3 className="text-foreground text-sm font-semibold mb-3">Prompt</h3>
                <div className="text-muted-foreground text-sm leading-relaxed break-words">
                  {promptText}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frame Selector Modal */}
      {showFrameSelector && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm">
          <div className="flex h-full">
            <div className="flex-1 bg-background overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Choose Your Frame</h2>
                    <p className="text-muted-foreground">
                      Select the perfect frame for your AI-generated art
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFrameSelector(false)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>

                {/* Frame Selector */}
                <FrameSelector
                  imageUrl={imageUrl}
                  imagePrompt={promptText}
                  onFrameSelect={handleFrameSelect}
                  onAddToCart={handleAddToCart}
                  selectedFrame={selectedFrame}
                  showPreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
