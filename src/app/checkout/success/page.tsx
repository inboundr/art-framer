'use client';

import { CheckCircle, Package, Truck, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuthPersistence } from '@/hooks/useAuthPersistence';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutSuccessContent() {
  const { isInitialized, isAuthenticated, user, session, error, restoreSession } = useAuthPersistence();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [authChecked, setAuthChecked] = useState(false);

  // Enhanced authentication handling for post-redirect scenarios
  useEffect(() => {
    const handleAuthRestoration = async () => {
      // Wait for auth persistence to initialize
      if (!isInitialized) return;
      
      // If user is not authenticated, try to restore session
      if (!isAuthenticated && isInitialized) {
        console.log('🔐 No user found after redirect, attempting session restoration...');
        
        // Try to restore session with multiple attempts
        let attempts = 0;
        const maxAttempts = 3;
        
        const attemptRestore = async () => {
          attempts++;
          console.log(`🔄 Restoration attempt ${attempts}/${maxAttempts}`);
          
          await restoreSession();
          
          // If still not authenticated and we have attempts left, try again
          if (!isAuthenticated && attempts < maxAttempts) {
            setTimeout(attemptRestore, 1000 * attempts); // Exponential backoff
          } else {
            setAuthChecked(true);
          }
        };
        
        attemptRestore();
      } else {
        setAuthChecked(true);
      }
    };

    handleAuthRestoration();
  }, [isInitialized, isAuthenticated, restoreSession]);

  // Show loading state while checking authentication
  if (!isInitialized || !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your order...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no user after auth check, redirect to login
  if (!isAuthenticated && authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Expired</h2>
              <p className="text-gray-600 mb-6">
                Your session has expired. Please log in again to view your order details.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Thank you for your order. Your framed art is being prepared for shipping.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {sessionId && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <strong>Order ID:</strong> {sessionId}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You&apos;ll receive a confirmation email shortly with tracking information.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                What happens next?
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order Processing</p>
                    <p className="text-sm text-gray-600">
                      We&apos;re preparing your framed art for production. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Production & Framing</p>
                    <p className="text-sm text-gray-600">
                      Your artwork is printed and professionally framed by our partners.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Shipping</p>
                    <p className="text-sm text-gray-600">
                      Your framed art is carefully packaged and shipped to your address.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Truck className="h-3 w-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Delivery</p>
                    <p className="text-sm text-gray-600">
                      You&apos;ll receive tracking information and your art will arrive in 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Need Help?
              </h4>
              <p className="text-sm text-blue-800">
                If you have any questions about your order, please contact our support team. 
                We&apos;re here to help ensure you receive your beautiful framed art in perfect condition.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1">
                <Link href="/creations">
                  Create More Art
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
