'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart as ShoppingCartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  X,
  CreditCard,
  Truck,
  Shield
} from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getProxiedImageUrl } from '@/lib/utils/imageProxy';
import { FramePreview } from '@/components/FramePreview';
import { createClient } from '@supabase/supabase-js';

interface ShoppingCartProps {
  onCheckout?: () => void;
  showAsModal?: boolean;
  trigger?: React.ReactNode;
}

export function ShoppingCart({ onCheckout, showAsModal = false, trigger }: ShoppingCartProps) {
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
  const { cartData, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const cartItems = cartData?.cartItems || [];
  const totals = cartData?.totals || { subtotal: 0, taxAmount: 0, shippingAmount: 0, total: 0, itemCount: 0 };
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('ShoppingCart: Cart data updated', {
      hasCartData: !!cartData,
      cartItemsCount: cartItems.length,
      loading,
      totals
    });
  }, [cartData, cartItems.length, loading, totals]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };


  const getFrameSizeLabel = (size: string) => {
    const labels = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extra_large: 'Extra Large',
    };
    return labels[size as keyof typeof labels] || size;
  };

  const getFrameStyleLabel = (style: string) => {
    return style.charAt(0).toUpperCase() + style.slice(1);
  };

  const getFrameMaterialLabel = (material: string) => {
    return material.charAt(0).toUpperCase() + material.slice(1);
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

    if (showAsModal) {
      setIsOpen(false);
    }
    
    onCheckout?.();
  };

  const handleClearCart = async () => {
    if (cartItems.length === 0) return;
    
    const confirmed = window.confirm('Are you sure you want to clear your cart?');
    if (confirmed) {
      const success = await clearCart();
      if (success) {
        toast({
          title: "Cart cleared",
          description: "All items have been removed from your cart.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to clear cart. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const cartContent = (
    <div className="space-y-4">
      {cartItems.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCartIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-4">Add some framed art to get started!</p>
          {showAsModal && (
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Continue Shopping
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items - Takes up 2/3 of the space */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-6 max-h-96 overflow-y-auto">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-6">
                  {/* Enhanced Frame Preview */}
                  <div className="flex-shrink-0">
                    <FramePreview
                      imageUrl={normalizeImageUrl(item.products.images.image_url || item.products.images.thumbnail_url)}
                      imagePrompt={item.products.images.prompt}
                      frameSize={item.products.frame_size}
                      frameStyle={item.products.frame_style}
                      frameMaterial={item.products.frame_material}
                      price={item.products.price * item.quantity}
                      showDetails={false}
                      showWallContext={true}
                      className="w-40"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base line-clamp-2 mb-2">
                      {getFrameSizeLabel(item.products.frame_size)} Frame
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {getFrameStyleLabel(item.products.frame_style)} {getFrameMaterialLabel(item.products.frame_material)}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                          &ldquo;{item.products.images.prompt}&rdquo;
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={loading}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            handleQuantityChange(item.id, value);
                          }}
                          className="w-12 h-8 text-center border-0 p-0 text-sm"
                          min="1"
                          max="10"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={loading || item.quantity >= 10}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeFromCart(item.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Price */}
                    <div className="text-base">
                      <div className="font-semibold text-lg">
                        {formatPrice(item.products.price * item.quantity)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatPrice(item.products.price)} each
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          </div>

          {/* Right Column - Order Summary and Shipping */}
          <div className="lg:col-span-1 space-y-4">
            {/* Shipping Information */}
            {cartItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping</CardTitle>
                  <p className="text-sm text-gray-600">
                    Shipping costs will be calculated during checkout when you provide your address
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="h-4 w-4" />
                    <span>Accurate shipping rates calculated at checkout</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cart Summary */}
            <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Order Summary</CardTitle>
                {cartItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearCart}
                    className="text-red-500 hover:text-red-700"
                    disabled={loading}
                  >
                    Clear Cart
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span>Subtotal</span>
                  <span className="text-gray-600">({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})</span>
                </span>
                <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span className="font-semibold">{formatPrice(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span>Shipping</span>
                  <span className="text-xs text-amber-600 font-medium" title="Shipping cost calculated at checkout based on your address">
                    *
                  </span>
                </span>
                <span className="text-gray-600 italic">Calculated at checkout</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Subtotal (excl. shipping)</span>
                <span>{formatPrice(totals.subtotal + totals.taxAmount)}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold mb-0.5">Final pricing at checkout</p>
                    <p className="leading-relaxed">
                      Shipping costs and final total will be calculated when you enter your shipping address. 
                      <span className="font-medium"> Prices may vary</span> based on destination and shipping method selected.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  <span>Fast Shipping</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  <span>Easy Returns</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full mt-4" 
                onClick={handleCheckout}
                disabled={loading}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );

  if (showAsModal) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="relative">
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              Cart
              {totals.itemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {totals.itemCount}
                </Badge>
              )}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCartIcon className="h-5 w-5" />
              Shopping Cart
              {totals.itemCount > 0 && (
                <Badge variant="secondary">
                  {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            {cartContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5" />
            Shopping Cart
            {totals.itemCount > 0 && (
              <Badge variant="secondary">
                {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartContent}
        </CardContent>
      </Card>
    </div>
  );
}
