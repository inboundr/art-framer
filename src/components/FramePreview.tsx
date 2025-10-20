'use client';

import React, { useState } from 'react';
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

  // Enhanced wall context with realistic room environment
  const WallContext = ({ children }: { children: React.ReactNode }) => {
    if (!showWallContext) return <>{children}</>;

    const wallPadding = Math.max(dimensions.width * 0.3, 40);
    const shadowSize = Math.max(dimensions.width * 0.1, 8);

    return (
      <div 
        className="relative bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-lg shadow-inner overflow-hidden"
        style={{
          padding: wallPadding,
          minWidth: dimensions.width + wallPadding * 2,
          minHeight: dimensions.height + wallPadding * 2,
        }}
      >
        {/* Wall texture with subtle pattern */}
        <div className="absolute inset-0">
          <div 
            className="w-full h-full rounded-lg opacity-30"
            style={{
              background: `
                radial-gradient(circle at 25% 25%, rgba(0,0,0,0.02) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(0,0,0,0.02) 0%, transparent 50%),
                linear-gradient(45deg, rgba(0,0,0,0.01) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(0,0,0,0.01) 25%, transparent 25%)
              `,
              backgroundSize: '60px 60px, 60px 60px, 20px 20px, 20px 20px'
            }}
          />
        </div>
        
        {/* Ambient lighting effect */}
        <div 
          className="absolute rounded-full opacity-20"
          style={{
            top: '10%',
            left: '20%',
            width: '60%',
            height: '40%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.8) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }}
        />
        
        {/* Frame shadow on wall - more realistic */}
        <div 
          className="absolute rounded-lg"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-45%, -45%)',
            width: dimensions.width + shadowSize,
            height: dimensions.height + shadowSize,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 100%)',
            filter: `blur(${shadowSize / 2}px)`,
            borderRadius: '4px',
          }}
        />
        
        {/* Secondary softer shadow */}
        <div 
          className="absolute rounded-lg"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-48%, -48%)',
            width: dimensions.width + shadowSize * 2,
            height: dimensions.height + shadowSize * 2,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%)',
            filter: `blur(${shadowSize}px)`,
          }}
        />
        
        {/* Wall corner details for depth */}
        <div className="absolute top-2 left-2 w-8 h-8 border-l border-t border-slate-200/50 rounded-tl-lg"></div>
        <div className="absolute top-2 right-2 w-8 h-8 border-r border-t border-slate-200/50 rounded-tr-lg"></div>
        <div className="absolute bottom-2 left-2 w-8 h-8 border-l border-b border-slate-200/50 rounded-bl-lg"></div>
        <div className="absolute bottom-2 right-2 w-8 h-8 border-r border-b border-slate-200/50 rounded-br-lg"></div>
        
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  };

  // Enhanced frame component with realistic materials and lighting
  const FrameComponent = () => {
    const frameWidth = Math.max(dimensions.width * 0.08, 12);
    const matWidth = Math.max(dimensions.width * 0.06, 8);
    
    // Advanced frame styling based on material and style
    const getFrameStyles = () => {
      const baseStyles = {
        width: dimensions.width,
        height: dimensions.height,
        transform: `scale(${previewScale})`,
        transformOrigin: 'center',
      };

      const materialStyles = {
        gold: {
          background: `
            linear-gradient(135deg, #FFD700 0%, #FFA500 30%, #FFD700 60%, #B8860B 100%),
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)
          `,
          boxShadow: 'inset 0 2px 4px rgba(255,215,0,0.3), inset 0 -2px 4px rgba(184,134,11,0.3)',
          border: '2px solid #B8860B',
        },
        silver: {
          background: `
            linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 30%, #D3D3D3 60%, #A8A8A8 100%),
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)
          `,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(169,169,169,0.3)',
          border: '2px solid #A8A8A8',
        },
        natural: {
          background: `
            linear-gradient(135deg, #D2B48C 0%, #8B4513 30%, #A0522D 60%, #654321 100%),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)
          `,
          boxShadow: 'inset 0 2px 4px rgba(210,180,140,0.3), inset 0 -2px 4px rgba(101,67,33,0.3)',
          border: '2px solid #654321',
        },
        white: {
          background: `
            linear-gradient(135deg, #ffffff 0%, #f8f8f8 30%, #f0f0f0 60%, #e8e8e8 100%),
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%)
          `,
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(200,200,200,0.3)',
          border: '2px solid #e0e0e0',
        },
        black: {
          background: `
            linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 30%, #0f0f0f 60%, #000000 100%),
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)
          `,
          boxShadow: 'inset 0 2px 4px rgba(80,80,80,0.3), inset 0 -2px 4px rgba(0,0,0,0.8)',
          border: '2px solid #000000',
        },
      };

      return {
        ...baseStyles,
        ...materialStyles[frameStyle as keyof typeof materialStyles] || materialStyles.black,
      };
    };

    return (
      <div
        className="relative rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
        style={getFrameStyles()}
      >
        {/* Frame border with depth */}
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            padding: frameWidth,
          }}
        >
          {/* Mat/mounting area */}
          <div 
            className="relative w-full h-full bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-sm shadow-inner overflow-hidden"
            style={{
              padding: matWidth,
            }}
          >
            {/* Image area */}
            <div className="relative w-full h-full bg-white rounded-sm overflow-hidden shadow-lg">
              {imageUrl ? (
                <img
                  src={getProxiedImageUrl(imageUrl)}
                  alt={imagePrompt}
                  className="w-full h-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
              
              {/* Glass reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-30 pointer-events-none"></div>
            </div>
          </div>
        </div>
        
        {/* Frame corner accents */}
        <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-white/30 rounded-tl-lg"></div>
        <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-white/30 rounded-tr-lg"></div>
        <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-white/30 rounded-bl-lg"></div>
        <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-white/30 rounded-br-lg"></div>
        
        {/* Hanging wire simulation (subtle) */}
        <div 
          className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-400 rounded-full opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #666 20%, #666 80%, transparent 100%)',
          }}
        ></div>
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
                    Wall Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewScale(prev => prev === 1 ? 1.2 : 1)}
                    title="Zoom in/out"
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
            {/* Large immersive room preview */}
            <div className="flex justify-center">
              <div 
                className="relative bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 rounded-lg shadow-2xl overflow-hidden"
                style={{
                  padding: Math.max(dimensions.width * 0.4, 60),
                  minWidth: dimensions.width * 2 + 120,
                  minHeight: dimensions.height * 1.5 + 120,
                }}
              >
                {/* Room environment */}
                <div className="absolute inset-0">
                  {/* Wall texture */}
                  <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                      background: `
                        repeating-linear-gradient(
                          0deg,
                          transparent,
                          transparent 100px,
                          rgba(0,0,0,0.02) 100px,
                          rgba(0,0,0,0.02) 101px
                        ),
                        repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 100px,
                          rgba(0,0,0,0.02) 100px,
                          rgba(0,0,0,0.02) 101px
                        )
                      `,
                    }}
                  />
                  
                  {/* Ceiling light effect */}
                  <div 
                    className="absolute rounded-full opacity-30"
                    style={{
                      top: '5%',
                      left: '30%',
                      width: '40%',
                      height: '30%',
                      background: 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 50%, transparent 80%)',
                      filter: 'blur(40px)',
                    }}
                  />
                  
                  {/* Floor reflection hint */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-300/20 to-transparent rounded-b-lg"
                  />
                </div>
                
                {/* Multiple shadow layers for realism */}
                <div 
                  className="absolute rounded-lg"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-42%, -42%)',
                    width: dimensions.width * 1.5 + 20,
                    height: dimensions.height * 1.5 + 20,
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.15) 100%)',
                    filter: 'blur(8px)',
                    borderRadius: '8px',
                  }}
                />
                
                <div 
                  className="absolute rounded-lg"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-45%, -45%)',
                    width: dimensions.width * 1.5 + 40,
                    height: dimensions.height * 1.5 + 40,
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                />
                
                {/* Ambient room elements */}
                <div className="absolute top-4 left-4 w-12 h-12 bg-slate-200/30 rounded-lg shadow-sm"></div>
                <div className="absolute top-4 right-4 w-8 h-16 bg-slate-200/20 rounded-lg shadow-sm"></div>
                <div className="absolute bottom-4 left-6 w-16 h-4 bg-slate-300/20 rounded-lg shadow-sm"></div>
                
                <div 
                  className="relative z-10"
                  style={{
                    transform: 'scale(1.5)',
                    transformOrigin: 'center',
                  }}
                >
                  <FrameComponent />
                </div>
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
                  <div className="line-clamp-2">&ldquo;{imagePrompt}&rdquo;</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
