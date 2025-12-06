'use client';

import React from 'react';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CheckoutFlow } from '@/components/CheckoutFlow';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useEffect } from 'react';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartData } = useCart();
  const cartItems = cartData?.cartItems || [];

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0) {
      router.push('/cart');
    }
  }, [cartItems.length, router]);

  const handleCheckoutSuccess = (orderId: string) => {
    router.push(`/checkout/success?order_id=${orderId}`);
  };

  const handleCheckoutCancel = () => {
    router.push('/cart');
  };

  return (
    <AuthenticatedLayout>
      <div className="flex flex-col min-h-screen bg-gray-50">
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

