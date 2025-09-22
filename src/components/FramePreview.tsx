'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Maximize2, Ruler } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { useFrameImages } from '@/hooks/useFrameImages';

interface FramePreviewProps {
  imageUrl: string;
  imagePrompt: string;
  frameSize: string;
  frameStyle: string;
  frameMaterial: string;
  price: number;
  className?: string;
  showDetails?: boolean;
  showWallContext?: boolean;
}

export function FramePreview({
  imageUrl,
  imagePrompt,
  frameSize,
  frameStyle,
  frameMaterial,
  price,
  className = '',
  showDetails = true,
  showWallContext = true
}: FramePreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const { frameDetails, loading: frameLoading } = useFrameImages(frameSize, frameStyle, frameMaterial);

  // Calculate realistic dimensions based on frame size
  const getFrameDimensions = (size: string) => {
    const dimensions = {
      small: { width: 120, height: 150, depth: 8 },
      medium: { width: 180, height: 240, depth: 10 },
      large: { width: 240, height: 300, depth: 12 },
      extra_large: { width: 300, height: 420, depth: 15 },
    };
    return dimensions[size as keyof typeof dimensions] || dimensions.medium;
  };

  const getFrameSizeLabel = (size: string) => {
    const labels = {
      small: 'Small (8" x 10")',
      medium: 'Medium (12" x 16")',
      large: 'Large (16" x 20")',
      extra_large: 'Extra Large (20" x 24")',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const dimensions = getFrameDimensions(frameSize);

  // Wall context component
  const WallContext = ({ children }: { children: React.ReactNode }) => {
    if (!showWallContext) return <>{children}</>;

    return (
      <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 p-8 rounded-lg shadow-inner">
        {/* Wall texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-lg"></div>
        </div>
        
        {/* Wall shadow */}
        <div className="absolute inset-0 rounded-lg shadow-2xl"></div>
        
        {/* Frame shadow on wall */}
        <div 
          className="absolute rounded-lg shadow-lg"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: dimensions.width + 20,
            height: dimensions.height + 20,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
            filter: 'blur(8px)',
          }}
        />
        
        {children}
      </div>
    );
  };

  // Frame component with realistic styling
  const FrameComponent = () => {
    const frameColor = frameStyle === 'gold' ? '#FFD700' :
                      frameStyle === 'silver' ? '#C0C0C0' :
                      frameStyle === 'natural' ? '#8B4513' :
                      frameStyle === 'white' ? '#ffffff' : '#1a1a1a';

    return (
      <div
        className="relative rounded-lg overflow-hidden shadow-lg"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${previewScale})`,
          transformOrigin: 'center',
        }}
      >
        {/* Frame with actual frame image or fallback */}
        {frameDetails?.images?.[0] ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-lg"
            style={{
              backgroundImage: `url(${frameDetails.images[0].url})`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: frameStyle === 'gold' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                         frameStyle === 'silver' ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' :
                         frameStyle === 'natural' ? 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)' :
                         frameStyle === 'white' ? 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)' :
                         'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
              border: `4px solid ${frameColor}`,
            }}
          />
        )}
        
        {/* Inner mat */}
        <div className="absolute inset-4 bg-white rounded-sm shadow-inner overflow-hidden">
          <img
            src={getProxiedImageUrl(imageUrl)}
            alt={imagePrompt}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-image.jpg';
            }}
          />
        </div>
        
        {/* Frame corner details for non-image frames */}
        {!frameDetails?.images?.[0] && (
          <>
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-white/20 rounded-tl-lg"></div>
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-white/20 rounded-tr-lg"></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-white/20 rounded-bl-lg"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-white/20 rounded-br-lg"></div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Wall Context with Frame */}
            <div className="flex justify-center">
              <WallContext>
                <FrameComponent />
              </WallContext>
            </div>

            {/* Frame Details */}
            {showDetails && (
              <div className="space-y-3">
                <div className="text-center">
                  <h4 className="font-semibold text-sm text-foreground">
                    {getFrameSizeLabel(frameSize)} Frame
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {getFrameStyleLabel(frameStyle)} {getFrameMaterialLabel(frameMaterial)}
                  </p>
                </div>

                {/* Size indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Ruler className="h-3 w-3" />
                  <span>{dimensions.width}mm × {dimensions.height}mm</span>
                </div>

                {/* Price */}
                <div className="text-center">
                  <div className="font-bold text-lg text-foreground">
                    {formatPrice(price)}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewScale(prev => prev === 1 ? 1.2 : 1)}
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Frame details badge */}
                {frameLoading ? (
                  <div className="text-center text-xs text-muted-foreground">
                    Loading frame details...
                  </div>
                ) : frameDetails ? (
                  <Badge variant="secondary" className="w-full justify-center">
                    {frameDetails.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="w-full justify-center">
                    {getFrameStyleLabel(frameStyle)} {getFrameMaterialLabel(frameMaterial)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {getFrameSizeLabel(frameSize)} Frame Preview
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Large wall preview */}
            <div className="flex justify-center">
              <div className="relative bg-gradient-to-b from-amber-50 to-amber-100 p-12 rounded-lg shadow-inner">
                {/* Wall texture */}
                <div className="absolute inset-0 opacity-20">
                  <div className="w-full h-full bg-gradient-to-br from-amber-200/30 to-amber-300/30 rounded-lg"></div>
                </div>
                
                {/* Frame shadow on wall */}
                <div 
                  className="absolute rounded-lg shadow-2xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: dimensions.width * 1.5 + 30,
                    height: dimensions.height * 1.5 + 30,
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
                    filter: 'blur(12px)',
                  }}
                />
                
                <FrameComponent />
              </div>
            </div>

            {/* Frame specifications */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold">Frame Details</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div>Size: {getFrameSizeLabel(frameSize)}</div>
                  <div>Style: {getFrameStyleLabel(frameStyle)}</div>
                  <div>Material: {getFrameMaterialLabel(frameMaterial)}</div>
                  <div>Dimensions: {dimensions.width}mm × {dimensions.height}mm</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Artwork</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div className="line-clamp-2">"{imagePrompt}"</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
