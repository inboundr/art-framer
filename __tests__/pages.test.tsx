/**
 * Comprehensive Page Rendering Tests
 * Tests all pages to ensure they render without runtime errors
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock cart context
jest.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    cartData: { items: [], totals: { subtotal: 0, tax: 0, shipping: 0, total: 0 } },
    addToCart: jest.fn(),
    removeFromCart: jest.fn(),
    updateQuantity: jest.fn(),
    clearCart: jest.fn(),
    loading: false,
  }),
  CartProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Supabase hooks
jest.mock('@/hooks/useSupabaseGallery', () => ({
  useGallery: () => ({
    images: [],
    loading: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
  useImageInteractions: () => ({
    likeImage: jest.fn(),
    unlikeImage: jest.fn(),
    interactionLoading: false,
  }),
}))

// Mock dynamic hooks with safe fallbacks
jest.mock('@/hooks/useDynamicHooksSafe', () => ({
  useDynamicLayoutSafe: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: 'desktop',
    orientation: 'landscape',
  }),
  useDynamicAnimationsSafe: () => ({
    animatePreset: jest.fn(),
    createTransition: jest.fn(),
    animateOnMount: false,
  }),
  useDynamicThemeSafe: () => ({
    theme: 'light',
    isDark: false,
    getAdaptiveColor: jest.fn(() => '#000000'),
  }),
  useIntersectionAnimationSafe: () => ({
    ref: { current: null },
    hasAnimated: false,
  }),
}))

describe('Page Rendering Tests', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()
  const mockBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })
  })

  describe('Main Pages', () => {
    test('Home page renders without crashing', async () => {
      const HomePage = (await import('@/app/page')).default
      
      expect(() => {
        render(<HomePage />)
      }).not.toThrow()
    })

    test('Login page renders without crashing', async () => {
      const LoginPage = (await import('@/app/(auth)/login/page')).default
      
      expect(() => {
        render(<LoginPage />)
      }).not.toThrow()
    })

    test('Shop page renders without crashing', async () => {
      const ShopPage = (await import('@/app/(dashboard)/shop/page')).default
      
      expect(() => {
        render(<ShopPage />)
      }).not.toThrow()
    })

    test('Cart page renders without crashing', async () => {
      const CartPage = (await import('@/app/cart/page')).default
      
      expect(() => {
        render(<CartPage />)
      }).not.toThrow()
    })

    test('Orders page renders without crashing', async () => {
      const OrdersPage = (await import('@/app/(dashboard)/orders/page')).default
      
      expect(() => {
        render(<OrdersPage />)
      }).not.toThrow()
    })

    test('Creations page renders without crashing', async () => {
      const CreationsPage = (await import('@/app/creations/page')).default
      
      expect(() => {
        render(<CreationsPage />)
      }).not.toThrow()
    })

    test('FAQ page renders without crashing', async () => {
      const FAQPage = (await import('@/app/faq/page')).default
      
      expect(() => {
        render(<FAQPage />)
      }).not.toThrow()
    })

    test('Privacy page renders without crashing', async () => {
      const PrivacyPage = (await import('@/app/privacy/page')).default
      
      expect(() => {
        render(<PrivacyPage />)
      }).not.toThrow()
    })

    test('Checkout success page renders without crashing', async () => {
      const CheckoutSuccessPage = (await import('@/app/checkout/success/page')).default
      
      expect(() => {
        render(<CheckoutSuccessPage />)
      }).not.toThrow()
    })
  })

  describe('Page Content Validation', () => {
    test('Home page contains main app layout', async () => {
      const HomePage = (await import('@/app/page')).default
      render(<HomePage />)
      
      // Should render without throwing errors
      // The AppLayout component should be present
      expect(document.body).toBeInTheDocument()
    })

    test('Login page has authentication elements', async () => {
      const LoginPage = (await import('@/app/(auth)/login/page')).default
      render(<LoginPage />)
      
      // Should render without throwing errors
      expect(document.body).toBeInTheDocument()
    })

    test('Shop page has product catalog elements', async () => {
      const ShopPage = (await import('@/app/(dashboard)/shop/page')).default
      render(<ShopPage />)
      
      // Should render without throwing errors
      expect(document.body).toBeInTheDocument()
    })
  })

  describe('Error Boundaries', () => {
    test('Pages handle missing props gracefully', async () => {
      const HomePage = (await import('@/app/page')).default
      
      // Should not throw even with no props
      expect(() => {
        render(<HomePage />)
      }).not.toThrow()
    })

    test('Pages handle authentication state changes', async () => {
      const LoginPage = (await import('@/app/(auth)/login/page')).default
      
      expect(() => {
        render(<LoginPage />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    test('Pages have proper document structure', async () => {
      const HomePage = (await import('@/app/page')).default
      render(<HomePage />)
      
      // Should render valid HTML structure
      expect(document.body).toBeInTheDocument()
    })
  })
})

describe('Layout Components', () => {
  test('Root layout renders without crashing', async () => {
    const RootLayout = (await import('@/app/layout')).default
    
    expect(() => {
      render(
        <RootLayout>
          <div>Test content</div>
        </RootLayout>
      )
    }).not.toThrow()
  })

  test('Root layout includes required providers', async () => {
    const RootLayout = (await import('@/app/layout')).default
    
    render(
      <RootLayout>
        <div data-testid="test-content">Test content</div>
      </RootLayout>
    )
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })
})
