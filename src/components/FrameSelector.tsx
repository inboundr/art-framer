'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Check, RotateCcw, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFrameImages } from '@/hooks/useFrameImages';

interface FrameOption {
  size: 'small' | 'medium' | 'large' | 'extra_large';
  style: 'black' | 'white' | 'natural' | 'gold' | 'silver';
  material: 'wood' | 'metal' | 'plastic' | 'bamboo';
  price: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  weight: number;
  popular?: boolean;
  recommended?: boolean;
}

interface FrameSelectorProps {
  imageUrl: string;
  imagePrompt: string;
  onFrameSelect: (frame: FrameOption) => void;
  onAddToCart: (frame: FrameOption) => void | Promise<void>;
  selectedFrame?: FrameOption | null;
  showPreview?: boolean;
}

const FRAME_OPTIONS: FrameOption[] = [
  {
    size: 'small',
    style: 'black',
    material: 'wood',
    price: 29.99,
    dimensions: { width: 20, height: 25, depth: 2 },
    weight: 400,
  },
  {
    size: 'medium',
    style: 'black',
    material: 'wood',
    price: 39.99,
    dimensions: { width: 30, height: 40, depth: 2 },
    weight: 600,
    popular: true,
  },
  {
    size: 'large',
    style: 'black',
    material: 'wood',
    price: 59.99,
    dimensions: { width: 40, height: 50, depth: 3 },
    weight: 800,
  },
  {
    size: 'extra_large',
    style: 'black',
    material: 'wood',
    price: 89.99,
    dimensions: { width: 50, height: 70, depth: 3 },
    weight: 1200,
  },
  {
    size: 'medium',
    style: 'white',
    material: 'wood',
    price: 39.99,
    dimensions: { width: 30, height: 40, depth: 2 },
    weight: 600,
  },
  {
    size: 'medium',
    style: 'natural',
    material: 'wood',
    price: 44.99,
    dimensions: { width: 30, height: 40, depth: 2 },
    weight: 600,
  },
  {
    size: 'medium',
    style: 'gold',
    material: 'wood',
    price: 49.99,
    dimensions: { width: 30, height: 40, depth: 2 },
    weight: 600,
  },
  {
    size: 'medium',
    style: 'silver',
    material: 'metal',
    price: 54.99,
    dimensions: { width: 30, height: 40, depth: 2 },
    weight: 700,
    recommended: true,
  },
  {
    size: 'large',
    style: 'natural',
    material: 'bamboo',
    price: 69.99,
    dimensions: { width: 40, height: 50, depth: 3 },
    weight: 750,
  },
];

export function FrameSelector({
  imageUrl,
  imagePrompt,
  onFrameSelect,
  onAddToCart,
  selectedFrame,
  showPreview = true,
}: FrameSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string>('medium');
  const [selectedStyle, setSelectedStyle] = useState<string>('black');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('wood');

  // Get frame images for the selected frame
  const { frameDetails, loading: frameLoading } = useFrameImages(
    selectedSize,
    selectedStyle,
    selectedMaterial
  );
  const [filteredFrames, setFilteredFrames] = useState<FrameOption[]>(FRAME_OPTIONS);
  const [previewScale, setPreviewScale] = useState<number>(1);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get available options based on current selections
  const getAvailableSizes = () => {
    const availableSizes = new Set<string>();
    FRAME_OPTIONS.forEach(frame => {
      if (frame.style === selectedStyle && frame.material === selectedMaterial) {
        availableSizes.add(frame.size);
      }
    });
    return Array.from(availableSizes);
  };

  const getAvailableStyles = () => {
    const availableStyles = new Set<string>();
    FRAME_OPTIONS.forEach(frame => {
      if (frame.size === selectedSize && frame.material === selectedMaterial) {
        availableStyles.add(frame.style);
      }
    });
    return Array.from(availableStyles);
  };

  const getAvailableMaterials = () => {
    const availableMaterials = new Set<string>();
    FRAME_OPTIONS.forEach(frame => {
      if (frame.size === selectedSize && frame.style === selectedStyle) {
        availableMaterials.add(frame.material);
      }
    });
    return Array.from(availableMaterials);
  };

  useEffect(() => {
    // Filter frames based on selected criteria
    const filtered = FRAME_OPTIONS.filter(frame => 
      frame.size === selectedSize && 
      frame.style === selectedStyle && 
      frame.material === selectedMaterial
    );
    setFilteredFrames(filtered);
    
    // Auto-select the first matching frame
    if (filtered.length > 0) {
      console.log('🎨 FrameSelector: Auto-selecting frame', filtered[0]);
      onFrameSelect(filtered[0]);
    } else {
      console.warn('⚠️ FrameSelector: No matching frames found', { selectedSize, selectedStyle, selectedMaterial });
    }
  }, [selectedSize, selectedStyle, selectedMaterial, onFrameSelect]);

  // Auto-adjust selections when options become unavailable
  useEffect(() => {
    const availableSizes = getAvailableSizes();
    const availableStyles = getAvailableStyles();
    const availableMaterials = getAvailableMaterials();

    // If current size is not available, select the first available size
    if (!availableSizes.includes(selectedSize) && availableSizes.length > 0) {
      setSelectedSize(availableSizes[0]);
    }

    // If current style is not available, select the first available style
    if (!availableStyles.includes(selectedStyle) && availableStyles.length > 0) {
      setSelectedStyle(availableStyles[0]);
    }

    // If current material is not available, select the first available material
    if (!availableMaterials.includes(selectedMaterial) && availableMaterials.length > 0) {
      setSelectedMaterial(availableMaterials[0]);
    }
  }, [selectedSize, selectedStyle, selectedMaterial]);

  const handleAddToCart = (frame: FrameOption) => {
    console.log('🔥🔥🔥 handleAddToCart FUNCTION CALLED 🔥🔥🔥');
    console.log('🛒 FrameSelector: handleAddToCart called', { 
      frame, 
      hasUser: !!user, 
      hasOnAddToCart: !!onAddToCart,
      frameDetails: frame ? {
        size: frame.size,
        style: frame.style,
        material: frame.material,
        price: frame.price,
        hasSize: !!frame.size,
        hasStyle: !!frame.style,
        hasMaterial: !!frame.material,
        hasPrice: typeof frame.price === 'number'
      } : null
    });
    
    if (!user) {
      console.error('❌ FrameSelector: No user, cannot add to cart');
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!onAddToCart) {
      console.error('❌ FrameSelector: onAddToCart prop is not defined!', {
        props: { onAddToCart, onFrameSelect, imageUrl, imagePrompt }
      });
      toast({
        title: 'Error',
        description: 'Add to cart handler is not available. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!frame || !frame.size || !frame.style || !frame.material || typeof frame.price !== 'number') {
      console.error('❌ FrameSelector: Invalid frame object', {
        frame,
        hasFrame: !!frame,
        hasSize: !!frame?.size,
        hasStyle: !!frame?.style,
        hasMaterial: !!frame?.material,
        hasPrice: typeof frame?.price === 'number',
        priceValue: frame?.price
      });
      toast({
        title: 'Error',
        description: 'Invalid frame selection. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('✅ FrameSelector: All validations passed, calling onAddToCart with frame', frame);
    try {
      // Call the async function - we need to handle the promise
      console.log('🔄 FrameSelector: About to call onAddToCart...');
      const result = onAddToCart(frame);
      console.log('✅ FrameSelector: onAddToCart returned', { 
        hasResult: result !== undefined,
        resultType: typeof result,
        isPromise: result !== undefined && result !== null && typeof result === 'object' && 'then' in result
      });
      
      // If it's a promise (async function), we MUST handle it
      if (result !== undefined && result !== null && typeof result === 'object' && 'then' in result) {
        console.log('🔄 FrameSelector: Detected Promise, awaiting result...');
        (result as Promise<any>)
          .then(() => {
            console.log('✅ FrameSelector: onAddToCart Promise resolved successfully');
          })
          .catch((error) => {
            console.error('❌ FrameSelector: Error in onAddToCart promise', error);
            console.error('❌ FrameSelector: Error stack', error?.stack);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to add to cart. Please try again.',
              variant: 'destructive',
            });
          });
      } else {
        console.log('⚠️ FrameSelector: onAddToCart did not return a Promise');
      }
    } catch (error) {
      console.error('❌ FrameSelector: Synchronous error calling onAddToCart', error);
      console.error('❌ FrameSelector: Error stack', error instanceof Error ? error.stack : 'No stack');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getSizeLabel = (size: string) => {
    const labels = {
      small: 'Small (8" x 10")',
      medium: 'Medium (12" x 16")',
      large: 'Large (16" x 20")',
      extra_large: 'Extra Large (20" x 24")',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  const getFrameColor = (style: string) => {
    const colors = {
      black: '#1a1a1a',
      white: '#ffffff',
      natural: '#8B4513',
      gold: '#FFD700',
      silver: '#C0C0C0',
    };
    return colors[style as keyof typeof colors] || '#1a1a1a';
  };

  const getFrameShadow = (style: string) => {
    const shadows = {
      black: '0 8px 32px rgba(0, 0, 0, 0.3)',
      white: '0 8px 32px rgba(0, 0, 0, 0.1)',
      natural: '0 8px 32px rgba(139, 69, 19, 0.2)',
      gold: '0 8px 32px rgba(255, 215, 0, 0.3)',
      silver: '0 8px 32px rgba(192, 192, 192, 0.2)',
    };
    return shadows[style as keyof typeof shadows] || '0 8px 32px rgba(0, 0, 0, 0.3)';
  };

  const getPreviewSize = (size: string) => {
    const sizes = {
      small: { width: 200, height: 250 },
      medium: { width: 280, height: 350 },
      large: { width: 360, height: 450 },
      extra_large: { width: 440, height: 550 },
    };
    return sizes[size as keyof typeof sizes] || sizes.medium;
  };

  // Determine current frame - use selectedFrame if provided, otherwise use first filtered frame
  const currentFrame = selectedFrame || (filteredFrames.length > 0 ? filteredFrames[0] : null);
  
  // Log current frame state for debugging
  useEffect(() => {
    console.log('🎨 FrameSelector: Current frame state', {
      hasSelectedFrame: !!selectedFrame,
      selectedFrame: selectedFrame,
      filteredFramesCount: filteredFrames.length,
      firstFilteredFrame: filteredFrames[0],
      currentFrame: currentFrame,
      hasCurrentFrame: !!currentFrame
    });
  }, [selectedFrame, filteredFrames, currentFrame]);
  
  const previewSize = getPreviewSize(selectedSize);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      {/* <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Frame</h2>
          <div className="group relative">
            <Info className="h-4 w-4 text-gray-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
              How to choose your frame
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Image Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-lg border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Frame Preview</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                  disabled={previewScale <= 0.5}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
                  disabled={previewScale >= 2}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewRotation((prev) => (prev + 90) % 360)}
                  aria-label="Rotate"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center">
              {frameLoading && (
                <div className="flex items-center justify-center p-8">
                  <div className="text-sm text-gray-500">Loading frame preview...</div>
                </div>
              )}
              {!frameLoading && (
                <div 
                  className="relative transition-all duration-300 ease-in-out"
                  style={{
                    transform: `scale(${previewScale}) rotate(${previewRotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <div
                    className="relative rounded-lg overflow-hidden"
                    style={{
                      width: previewSize.width,
                      height: previewSize.height,
                      boxShadow: getFrameShadow(selectedStyle),
                      border: `8px solid ${getFrameColor(selectedStyle)}`,
                      background: selectedStyle === 'gold' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
                                 selectedStyle === 'silver' ? 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' :
                                 selectedStyle === 'natural' ? 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)' :
                                 selectedStyle === 'white' ? 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)' :
                                 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                    }}
                  >
                    {/* Inner mat */}
                    <div className="absolute inset-2 bg-white rounded-sm shadow-inner">
                      <img
                        src={imageUrl}
                        alt={imagePrompt}
                        className="w-full h-full object-cover rounded-sm"
                      />
                    </div>
                    
                    {/* Frame corner details */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-white/20 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-white/20 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-white/20 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-white/20 rounded-br-lg"></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Frame details below preview */}
            <div className="mt-6 text-center">
              <h4 className="font-semibold text-lg text-gray-900 mb-2">
                {getSizeLabel(selectedSize)} Frame
              </h4>
              <p className="text-gray-600 mb-1">
                {getStyleLabel(selectedStyle)} {getMaterialLabel(selectedMaterial)}
              </p>
              <p className="text-sm text-gray-500">
                {currentFrame?.dimensions.width}&quot; × {currentFrame?.dimensions.height}&quot; × {currentFrame?.dimensions.depth}&quot;
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {currentFrame?.popular && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Popular
                  </Badge>
                )}
                {currentFrame?.recommended && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    Recommended
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Configuration Options */}
        <div className="space-y-6">
          {/* Frame Size Selection - Dropdown */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Frame Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select frame size" />
                </SelectTrigger>
                <SelectContent>
                  {['small', 'medium', 'large', 'extra_large'].map((size) => {
                    const isAvailable = getAvailableSizes().includes(size);
                    const frameOption = FRAME_OPTIONS.find(f => f.size === size && f.style === selectedStyle && f.material === selectedMaterial);
                    
                    return (
                      <SelectItem 
                        key={size} 
                        value={size} 
                        disabled={!isAvailable}
                        className={!isAvailable ? 'opacity-50' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{getSizeLabel(size)}</span>
                          {frameOption && (
                            <span className="text-sm text-gray-500 ml-2">
                              {frameOption.dimensions.width}" × {frameOption.dimensions.height}"
                            </span>
                          )}
                          {!isAvailable && (
                            <span className="text-xs text-red-500 ml-2">Unavailable</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Frame Style Selection - Compact with color indicators */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Frame Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle}>
                <div className="grid grid-cols-5 gap-2">
                  {['black', 'white', 'natural', 'gold', 'silver'].map((style) => {
                    const isAvailable = getAvailableStyles().includes(style);
                    
                    return (
                      <div key={style} className="relative">
                        <RadioGroupItem 
                          value={style} 
                          id={style} 
                          className="sr-only" 
                          disabled={!isAvailable}
                        />
                        <Label 
                          htmlFor={style} 
                          className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                            !isAvailable 
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                              : selectedStyle === style 
                                ? 'border-purple-500 bg-purple-50' 
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div 
                            className={`w-8 h-8 rounded-full border-2 ${
                              !isAvailable ? 'border-gray-300' : 'border-gray-300'
                            }`}
                            style={{ 
                              backgroundColor: isAvailable ? getFrameColor(style) : '#e5e7eb'
                            }}
                          />
                          {!isAvailable && (
                            <div className="text-xs text-red-500 mt-2">Unavailable</div>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Frame Material Selection */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Frame Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <div className="grid grid-cols-2 gap-3">
                  {['wood', 'metal', 'plastic', 'bamboo'].map((material) => {
                    const isAvailable = getAvailableMaterials().includes(material);
                    
                    return (
                      <div key={material} className="relative">
                        <RadioGroupItem 
                          value={material} 
                          id={material} 
                          className="sr-only" 
                          disabled={!isAvailable}
                        />
                        <Label 
                          htmlFor={material} 
                          className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            !isAvailable 
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' 
                              : selectedMaterial === material 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`text-sm font-medium ${
                            !isAvailable 
                              ? 'text-gray-400' 
                              : selectedMaterial === material 
                                ? 'text-green-700' 
                                : 'text-gray-700'
                          }`}>{getMaterialLabel(material)}</div>
                          {!isAvailable && (
                            <div className="text-xs text-red-500 ml-2">Unavailable</div>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Selected Frame Details & Purchase */}
          {currentFrame && (
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Selected Frame
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg text-gray-900">
                        {getSizeLabel(currentFrame.size)} Frame
                      </h4>
                      <p className="text-gray-600">
                        {getStyleLabel(currentFrame.style)} {getMaterialLabel(currentFrame.material)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">
                        {formatPrice(currentFrame.price)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {currentFrame.dimensions.width}&quot; × {currentFrame.dimensions.height}&quot; × {currentFrame.dimensions.depth}&quot;
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Button 
                      onClick={(e) => {
                        console.log('🔥🔥🔥 BUTTON CLICKED - START 🔥🔥🔥');
                        try {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🛒 Add to Cart button clicked', { 
                            currentFrame, 
                            hasCurrentFrame: !!currentFrame,
                            frameDetails: currentFrame ? {
                              size: currentFrame.size,
                              style: currentFrame.style,
                              material: currentFrame.material,
                              price: currentFrame.price
                            } : null,
                            disabled: !currentFrame,
                            buttonType: 'button'
                          });
                          if (currentFrame) {
                            console.log('✅ FrameSelector: Calling handleAddToCart...');
                            handleAddToCart(currentFrame);
                          } else {
                            console.error('❌ currentFrame is undefined!', { selectedFrame, filteredFrames });
                            toast({
                              title: 'Error',
                              description: 'No frame selected. Please select a frame.',
                              variant: 'destructive',
                            });
                          }
                          console.log('🔥🔥🔥 BUTTON CLICKED - END 🔥🔥🔥');
                        } catch (error) {
                          console.error('🔥🔥🔥 ERROR IN BUTTON CLICK HANDLER 🔥🔥🔥', error);
                          throw error;
                        }
                      }}
                      className="min-w-32 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg"
                      size="lg"
                      disabled={!currentFrame}
                      type="button"
                      data-testid="add-to-cart-button"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
