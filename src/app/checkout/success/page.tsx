'use client';

import { CheckCircle, Package, Truck, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuthPersistence } from '@/hooks/useAuthPersistence';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutSuccessContent() {
  const { isInitialized, isAuthenticated, user, session, error, restoreSession } = useAuthPersistence();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [authChecked, setAuthChecked] = useState(false);
  const [storedAddress, setStoredAddress] = useState<any>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressRetrievedRef = useRef(false);

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

  // Retrieve stored shipping address when session ID is available
  // Note: This works with or without authentication (fallback for post-payment scenarios)
  useEffect(() => {
    const retrieveStoredAddress = async () => {
      if (!sessionId || addressLoading || addressRetrievedRef.current) return;

      setAddressLoading(true);
      addressRetrievedRef.current = true; // Mark as retrieved to prevent multiple calls
      try {
        const response = await fetch(`/api/checkout/retrieve-address?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setStoredAddress(data.shippingAddress);
          console.log('✅ Retrieved stored shipping address:', data.shippingAddress);
        } else {
          console.log('⚠️ Could not retrieve stored address:', response.status);
        }
      } catch (error) {
        console.error('Error retrieving stored address:', error);
      } finally {
        setAddressLoading(false);
      }
    };

    retrieveStoredAddress();
  }, [sessionId]); // Only depend on sessionId

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="shadow-xl bg-card border-border">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-pink-primary/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-pink-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">
              Payment Successful!
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Thank you for your order. Your framed art is being prepared for shipping.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {sessionId && (
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Order ID:</strong> {sessionId}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;ll receive a confirmation email shortly with tracking information.
                </p>
              </div>
            )}

            {storedAddress && (
              <div className="bg-muted rounded-lg p-4 border border-border">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-pink-primary" />
                  Shipping Address
                </h4>
                <div className="text-sm text-foreground space-y-1">
                  {storedAddress.firstName && storedAddress.lastName && (
                    <p><strong>Name:</strong> {storedAddress.firstName} {storedAddress.lastName}</p>
                  )}
                  {storedAddress.address1 && (
                    <p><strong>Address:</strong> {storedAddress.address1}</p>
                  )}
                  {storedAddress.address2 && (
                    <p className="ml-4">{storedAddress.address2}</p>
                  )}
                  {storedAddress.city && storedAddress.state && storedAddress.zip && (
                    <p><strong>City:</strong> {storedAddress.city}, {storedAddress.state} {storedAddress.zip}</p>
                  )}
                  {storedAddress.country && (
                    <p><strong>Country:</strong> {storedAddress.country}</p>
                  )}
                  {storedAddress.phone && (
                    <p><strong>Phone:</strong> {storedAddress.phone}</p>
                  )}
                </div>
              </div>
            )}

            {addressLoading && (
              <div className="bg-muted rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  Loading shipping address...
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-pink-primary" />
                What happens next?
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-pink-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Order Processing</p>
                    <p className="text-sm text-muted-foreground">
                      We&apos;re preparing your framed art for production. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-pink-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Production & Framing</p>
                    <p className="text-sm text-muted-foreground">
                      Your artwork is printed and professionally framed by our partners.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-pink-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Shipping</p>
                    <p className="text-sm text-muted-foreground">
                      Your framed art is carefully packaged and shipped to your address.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Truck className="h-3 w-3 text-pink-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll receive tracking information and your art will arrive in 5-7 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 border border-border">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-pink-primary" />
                Need Help?
              </h4>
              <p className="text-sm text-muted-foreground">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <Card className="shadow-xl bg-card border-border">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
