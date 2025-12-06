'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart as ShoppingCartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  X,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { FramePreview } from '@/components/FramePreview';
import { formatSizeWithCm } from '@/lib/utils/size-conversion';
import { formatPrice } from '@/lib/prodigi-v2/utils';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const normalizeImageUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    try {
      const supa = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data } = supa.storage.from('curated-images').getPublicUrl(url);
      return data?.publicUrl || url;
    } catch {
      return url;
    }
  };

  const { cartData, loading, updateQuantity, removeFromCart } = useCart();
  const cartItems = cartData?.cartItems || [];
  const totals = cartData?.totals || { subtotal: 0, taxAmount: 0, shippingAmount: 0, total: 0, itemCount: 0, currency: 'USD' };
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getFrameSizeLabel = (size: string) => {
    if (/^\d+x\d+$/.test(size)) {
      return size.replace('x', '×');
    }
    const legacyLabels: Record<string, string> = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extra_large: 'Extra Large',
    };
    return legacyLabels[size] || size;
  };

  const handleQuantityChange = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
    } else {
      await updateQuantity(cartItemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to proceed to checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add items to your cart before checking out.',
        variant: 'destructive',
      });
      return;
    }

    onClose();
    router.push('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Shopping Cart</h2>
            {totals.itemCount > 0 && (
              <Badge variant="secondary">
                {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-4">Add some framed art to get started!</p>
              <Button onClick={onClose} variant="outline">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex gap-3">
                    {/* Frame Preview */}
                    <div className="flex-shrink-0">
                      <FramePreview
                        imageUrl={normalizeImageUrl(item.products.images.image_url || item.products.images.thumbnail_url)}
                        imagePrompt={item.products.images.prompt}
                        frameSize={item.products.frame_size}
                        frameStyle={item.products.frame_style}
                        frameMaterial={item.products.frame_material}
                        price={item.products.price * item.quantity}
                        showDetails={false}
                        showWallContext={false}
                        className="w-24 h-24"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {getFrameSizeLabel(item.products.frame_size)} Frame
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        &ldquo;{item.products.images.prompt}&rdquo;
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center border rounded">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={loading}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={loading || item.quantity >= 10}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          onClick={() => removeFromCart(item.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="text-sm font-semibold">
                        {formatPrice((item.price || item.products.price) * item.quantity, item.currency || item.products.currency || 'USD')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Summary and Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(totals.subtotal, totals.currency || 'USD')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
                Shipping will be calculated at checkout
              </div>
            </div>

            <Separator />

            <Button 
              className="w-full" 
              onClick={handleCheckout}
              disabled={loading}
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Checkout
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={onClose}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

