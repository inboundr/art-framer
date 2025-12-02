'use client';

import React, { useState } from 'react';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ShoppingCart } from '@/components/ShoppingCart';
import { CheckoutFlow } from '@/components/CheckoutFlow';

export default function CartPage() {
  const [showCheckout, setShowCheckout] = useState(false);

  // Note: CartContext already handles cart fetching on mount and user changes
  // No need to manually refresh here - it causes duplicate fetches and loading state toggles

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (orderId: string) => {
    setShowCheckout(false);
    // Redirect to success page or show success message
    window.location.href = `/checkout/success?order_id=${orderId}`;
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
  };

  if (showCheckout) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col min-h-screen bg-background">
          {/* Top Spacer - same as other pages */}
          <div className="h-16 min-h-16 self-stretch bg-background" />
          
          {/* Main Content */}
          <div className="flex-1 container mx-auto px-4 py-8">
            <CheckoutFlow
              onSuccess={handleCheckoutSuccess}
              onCancel={handleCheckoutCancel}
            />
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Top Spacer - same as other pages */}
        <div className="h-16 min-h-16 self-stretch bg-background" />
        
        {/* Main Content */}
        <div className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground mb-8">
              Review your selected items and proceed to checkout.
            </p>
            <ShoppingCart onCheckout={handleCheckout} />
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
