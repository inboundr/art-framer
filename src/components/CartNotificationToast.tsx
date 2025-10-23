'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface CartNotificationToastProps {
  onViewCart?: () => void;
  onContinueShopping?: () => void;
  itemName?: string;
  itemImage?: string;
  showViewCart?: boolean;
}

export function CartNotificationToast({ 
  onViewCart, 
  onContinueShopping,
  itemName,
  itemImage,
  showViewCart = true 
}: CartNotificationToastProps) {
  const router = useRouter();

  const handleViewCart = () => {
    if (onViewCart) {
      onViewCart();
    } else {
      router.push('/cart');
    }
  };

  const handleContinueShopping = () => {
    if (onContinueShopping) {
      onContinueShopping();
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md backdrop-blur-sm">
      {/* Item Image with Success Icon Overlay */}
      {itemImage ? (
        <div className="flex-shrink-0 relative">
          <img 
            src={itemImage} 
            alt={itemName || 'Item'} 
            className="w-16 h-16 rounded-lg object-cover border-2 border-gray-600 shadow-lg"
          />
          {/* Success Icon - Top Right of Image */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-lg">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      ) : (
        /* Fallback Success Icon if no image */
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      )}

      {/* Content and Buttons */}
      <div className="flex-1 min-w-0">
        {/* Text Content */}
        <div className="mb-3">
          <p className="text-sm font-semibold text-white mb-1">
            {itemName ? `${itemName} added to cart` : 'Item added to cart'}
          </p>
          <p className="text-xs text-gray-300 font-medium">
            Ready to checkout?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {showViewCart && (
            <Button
              size="sm"
              onClick={handleViewCart}
              className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg border-0"
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              View Cart
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleContinueShopping}
            className="h-8 px-3 text-xs font-medium border border-gray-600 hover:border-gray-500 hover:bg-gray-700 text-gray-200 hover:text-white"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy cart notifications
export function useCartNotification() {
  const { toast } = useToast();
  const router = useRouter();

  const showCartNotification = (options: {
    itemName?: string;
    itemImage?: string;
    onViewCart?: () => void;
    onContinueShopping?: () => void;
  } = {}) => {
    toast({
      title: '',
      description: '',
      action: (
        <CartNotificationToast
          itemName={options.itemName}
          itemImage={options.itemImage}
          onViewCart={options.onViewCart}
          onContinueShopping={options.onContinueShopping}
        />
      ),
      duration: 5000, // 5 seconds
      className: "top-4 right-4 z-50", // Better positioning
    });
  };

  return { showCartNotification };
}
