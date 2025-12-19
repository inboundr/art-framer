'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Heart, Eye, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCartNotification } from './CartNotificationToast';
import { getProductTypeLabelFromProduct } from '@/lib/utils/product-type-labels';

interface Product {
  id: string;
  frame_size: string; // V2 sizing: actual sizes like "8x10", "16x20", "12x30", etc.
  frame_style: 'black' | 'white' | 'natural' | 'gold' | 'silver';
  frame_material: 'wood' | 'metal' | 'plastic' | 'bamboo';
  price: number;
  cost: number;
  dimensions_cm: {
    width: number;
    height: number;
    depth: number;
  };
  status: 'active' | 'inactive' | 'discontinued';
  sku: string;
  name?: string;
  product_type?: string;
  created_at: string;
  images: {
    id: string;
    prompt: string;
    image_url: string;
    thumbnail_url: string;
    user_id: string;
    created_at: string;
  };
}

interface ProductCatalogProps {
  imageId?: string;
  onProductSelect?: (product: Product) => void;
  showFilters?: boolean;
  limit?: number;
}

export function ProductCatalog({ 
  imageId, 
  onProductSelect, 
  showFilters = true, 
  limit = 20 
}: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    frameSize: '',
    frameStyle: '',
    frameMaterial: '',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();
  const { showCartNotification } = useCartNotification();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (imageId) params.append('imageId', imageId);
      if (filters.frameSize) params.append('frameSize', filters.frameSize);
      if (filters.frameStyle) params.append('frameStyle', filters.frameStyle);
      if (filters.frameMaterial) params.append('frameMaterial', filters.frameMaterial);
      params.append('limit', limit.toString());

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [imageId, filters, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to add items to your cart.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Use v2 checkout API for cart with real-time pricing
      const response = await fetch('/api/v2/checkout/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to add items to your cart.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error('Failed to add to cart');
      }

      // Show enhanced cart notification with action buttons
      showCartNotification({
        itemName: `Product #${productId}`,
        onViewCart: () => {
          window.location.href = '/cart';
        },
        onContinueShopping: () => {
          // Just continue browsing
        }
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add item to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to manage your wishlist.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const isInWishlist = wishlist.has(productId);
      const response = await fetch('/api/wishlist', {
        method: isInWishlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update wishlist');
      }

      setWishlist(prev => {
        const newSet = new Set(prev);
        if (isInWishlist) {
          newSet.delete(productId);
        } else {
          newSet.add(productId);
        }
        return newSet;
      });

      toast({
        title: isInWishlist ? 'Removed from Wishlist' : 'Added to Wishlist',
        description: isInWishlist 
          ? 'Item has been removed from your wishlist.'
          : 'Item has been added to your wishlist.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update wishlist. Please try again.',
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

  const getFrameSizeLabel = (size: string) => {
    // V2 sizing: Display actual size (e.g., "8x10", "16x20")
    // Legacy compatibility: Still handle old enum values during migration
    const legacyLabels: Record<string, string> = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extra_large: 'Extra Large',
    };
    
    // If it's a legacy enum value, use the label
    if (legacyLabels[size]) {
      return legacyLabels[size];
    }
    
    // V2 sizing: Format as "WIDTH×HEIGHT" (e.g., "8×10", "16×20")
    if (/^\d+x\d+$/.test(size)) {
      return size.replace('x', '×');
    }
    
    // Fallback: return as-is
    return size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-t-lg" />
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </CardHeader>
            <CardFooter>
              <div className="h-8 bg-gray-200 rounded w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchProducts}>Try Again</Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No products found</p>
        {showFilters && (
          <Button 
            variant="outline" 
            onClick={() => setFilters({ frameSize: '', frameStyle: '', frameMaterial: '', sortBy: 'created_at', sortOrder: 'desc' })}
          >
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <Select
            value={filters.frameSize}
            onValueChange={(value) => setFilters(prev => ({ ...prev, frameSize: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Frame Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sizes</SelectItem>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
              <SelectItem value="extra_large">Extra Large</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.frameStyle}
            onValueChange={(value) => setFilters(prev => ({ ...prev, frameStyle: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Frame Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Styles</SelectItem>
              <SelectItem value="black">Black</SelectItem>
              <SelectItem value="white">White</SelectItem>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="gold">Gold</SelectItem>
              <SelectItem value="silver">Silver</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.frameMaterial}
            onValueChange={(value) => setFilters(prev => ({ ...prev, frameMaterial: value }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Frame Material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Materials</SelectItem>
              <SelectItem value="wood">Wood</SelectItem>
              <SelectItem value="metal">Metal</SelectItem>
              <SelectItem value="plastic">Plastic</SelectItem>
              <SelectItem value="bamboo">Bamboo</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-shadow">
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-t-lg">
                <img
                  src={product.images.thumbnail_url}
                  alt={product.images.prompt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={() => toggleWishlist(product.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${
                      wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'
                    }`} 
                  />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={() => onProductSelect?.(product)}
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </Button>
              </div>

              {product.status === 'discontinued' && (
                <Badge variant="destructive" className="absolute top-2 left-2">
                  Discontinued
                </Badge>
              )}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">
                {getFrameSizeLabel(product.frame_size)} {getProductTypeLabelFromProduct(product.product_type, product.sku)}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{getFrameStyleLabel(product.frame_style)}</span>
                <span>•</span>
                <span>{getFrameMaterialLabel(product.frame_material)}</span>
              </div>
            </CardHeader>

            <CardContent className="pb-2">
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                &ldquo;{product.images.prompt}&rdquo;
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(product.price)}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-gray-600">4.8</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button 
                className="w-full" 
                onClick={() => addToCart(product.id)}
                disabled={product.status !== 'active'}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
