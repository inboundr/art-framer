/**
 * AI Studio - Main Page
 * 
 * The complete AI-powered frame customization experience
 */

'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';
import { useStudioStore } from '@/store/studio';
import { useAuth } from '@/hooks/useAuth';
import { AIChat } from '@/components/studio/AIChat';
import { FramePreview } from '@/components/studio/FramePreview';
import { ContextPanel } from '@/components/studio/ContextPanel';
import { WelcomeModal } from '@/components/studio/WelcomeModal';
import { ImageUpload } from '@/components/studio/ImageUpload';
import { AuthModal } from '@/components/AuthModal';
import { Sidebar } from '@/components/Sidebar';

type MobileTab = 'preview' | 'chat' | 'config';

export default function StudioPage() {
  const { config, isAnalyzing } = useStudioStore();
  const { refreshSession, isInitialized } = useAuth();
  const hasImage = !!config.imageUrl;
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [pendingAddToCart, setPendingAddToCart] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    // Initialize conversation
    const conversationId = `conv-${Date.now()}`;
    useStudioStore.getState().setConversationId(conversationId);
    
    // Sync destination country from studio store to localStorage for cart
    const destinationCountry = config.destinationCountry || 'US';
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartDestinationCountry', destinationCountry);
      if (config.shippingMethod) {
        localStorage.setItem('cartShippingMethod', config.shippingMethod);
      }
    }
  }, [config.destinationCountry, config.shippingMethod]);
  
  // Ensure session is restored when navigating to studio page
  useEffect(() => {
    if (isInitialized) {
      console.log('🎨 Studio: Refreshing session on page load');
      refreshSession();
    }
  }, [isInitialized, refreshSession]);

  return (
    <>
      {/* Desktop Layout (lg and above) */}
      <div className="hidden lg:flex h-screen w-full overflow-hidden bg-gray-50">
        {/* Sidebar */}
        <Sidebar onOpenAuthModal={() => setAuthModalVisible(true)} />

        {/* Welcome Modal - shown on first visit */}
        {!hasImage && <WelcomeModal />}

        {/* Three-panel layout - with left padding to account for fixed sidebar */}
        <div className="flex w-full pl-20">
          {/* Left Panel - AI Chat */}
          <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
            <div className="border-b border-gray-200 p-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Art Framer Studio
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered frame customization
              </p>
            </div>
            
            <AIChat />
          </div>

          {/* Center Panel - Frame Preview */}
          <div className="flex-1 flex flex-col">
            {hasImage ? (
              <FramePreview />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <ImageUpload />
              </div>
            )}
          </div>

          {/* Right Panel - Context & Details */}
          <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <ContextPanel onOpenAuthModal={() => {
              setPendingAddToCart(true);
              setAuthModalVisible(true);
            }} />
          </div>
        </div>

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <p className="text-gray-900 font-medium">
                  Analyzing your image...
                </p>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                AI is detecting colors, style, and finding the perfect frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Layout (below lg) */}
      <div className="lg:hidden flex flex-col h-screen w-full overflow-hidden bg-gray-50">
        {/* Mobile Sidebar */}
        <Sidebar 
          isMobile={true}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onOpenAuthModal={() => setAuthModalVisible(true)}
        />

        {/* Backdrop for mobile sidebar */}
        {mobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Welcome Modal - shown on first visit */}
        {!hasImage && <WelcomeModal />}

        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Menu Toggle Button */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Art Framer
              </h1>
              <p className="text-xs text-gray-500">
                AI Studio
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Chat Toggle Button */}
            <button
              onClick={() => setShowMobileChat(!showMobileChat)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Toggle chat"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
            
            {/* Config Toggle Button */}
            <button
              onClick={() => setShowMobileConfig(!showMobileConfig)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Toggle configuration"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {hasImage ? (
            <FramePreview />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <ImageUpload />
            </div>
          )}
        </div>

        {/* Mobile Chat Drawer (slides from bottom) */}
        {showMobileChat && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={() => setShowMobileChat(false)}>
            <div 
              className="bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Handle */}
              <div className="flex items-center justify-center py-3 border-b border-gray-200">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">AI Assistant</h2>
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Chat Content */}
              <div className="flex-1 overflow-hidden">
                <AIChat />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Config Drawer (slides from right) */}
        {showMobileConfig && (
          <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/50" onClick={() => setShowMobileConfig(false)}>
            <div 
              className="bg-white w-full sm:w-96 max-w-full flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
                <h2 className="font-semibold text-gray-900">Configuration</h2>
                <button 
                  onClick={() => setShowMobileConfig(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Config Content */}
              <div className="flex-1 overflow-y-auto">
                <ContextPanel onOpenAuthModal={() => {
                  setPendingAddToCart(true);
                  setAuthModalVisible(true);
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <p className="text-gray-900 font-medium">
                  Analyzing your image...
                </p>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                AI is detecting colors, style, and finding the perfect frame
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalVisible}
        onClose={() => {
          setAuthModalVisible(false);
          setPendingAddToCart(false);
        }}
        onAuthSuccess={() => {
          setAuthModalVisible(false);
          // If there was a pending add to cart, trigger it after auth
          if (pendingAddToCart) {
            setPendingAddToCart(false);
            // Small delay to ensure auth state is updated
            setTimeout(() => {
              // Trigger add to cart by dispatching a custom event
              window.dispatchEvent(new CustomEvent('retry-add-to-cart'));
            }, 500);
          }
        }}
      />
    </>
  );
}

