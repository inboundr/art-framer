'use client';

import { Header } from './Header';
import { CartSidebar } from './CartSidebar';
import { AuthModal } from './AuthModal';
import { useCartSidebar } from '@/contexts/CartSidebarContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GlobalHeader() {
  const router = useRouter();
  const { isOpen: cartSidebarOpen, openCart, closeCart: closeCartSidebar } = useCartSidebar();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);

  return (
    <>
      <Header
        onOpenAuthModal={(redirectPath) => {
          setAuthRedirectPath(redirectPath || null);
          setAuthModalVisible(true);
        }}
        onOpenCart={openCart}
      />
      <CartSidebar
        isOpen={cartSidebarOpen}
        onClose={closeCartSidebar}
      />
      <AuthModal
        isOpen={authModalVisible}
        onClose={() => {
          setAuthModalVisible(false);
          setAuthRedirectPath(null);
        }}
        onAuthSuccess={() => {
          setAuthModalVisible(false);
          if (authRedirectPath) {
            router.push(authRedirectPath);
            setAuthRedirectPath(null);
          }
        }}
      />
    </>
  );
}

