'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { GenerationPanel } from './GenerationPanel';
import { SearchBar } from './SearchBar';
import { NotificationBar } from './NotificationBar';
import { AuthModal } from './AuthModal';
import { WelcomeModal } from './WelcomeModal';
import { StylesOnboardingModal } from './StylesOnboardingModal';
import { useLazyAuth } from '@/contexts/LazyAuthProvider';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, profile, updateProfile } = useLazyAuth();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [generationPanelVisible, setGenerationPanelVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
  const [stylesOnboardingVisible, setStylesOnboardingVisible] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [generationSettings, setGenerationSettings] = useState({
    aspectRatio: '1x1',
    numberOfImages: 4,
    model: 'V_3',
    renderSpeed: 'BALANCED',
    style: 'AUTO',
    color: 'AUTO',
    referenceImages: [] as string[],
  });
  const [pendingGenerationRequest, setPendingGenerationRequest] = useState<{
    prompt: string;
    settings: {
      aspectRatio: string;
      numberOfImages: number;
      model: string;
      renderSpeed: string;
      style: string;
      color: string;
      referenceImages: string[];
    };
  } | null>(null);
  const [showNotification, setShowNotification] = useState(
    process.env.NEXT_PUBLIC_SHOW_NOTIFICATION_BAR === 'true'
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if user should see welcome modal
  useEffect(() => {
    if (user && !localStorage.getItem('art-framer-welcome-seen')) {
      setWelcomeModalVisible(true);
    }
  }, [user]);

  // Check if user should see styles onboarding modal (for second-time users)
  useEffect(() => {
    if (user && profile && !localStorage.getItem('art-framer-styles-onboarding-seen')) {
      // Check if user has generated images before (has creations)
      const hasCreations = localStorage.getItem('art-framer-has-creations') === 'true';
      if (hasCreations) {
        setStylesOnboardingVisible(true);
      }
    }
  }, [user, profile]);

  // Handle pending generation request after auth
  useEffect(() => {
    if (user && pendingGenerationRequest) {
      setCurrentPrompt(pendingGenerationRequest.prompt);
      setGenerationSettings(pendingGenerationRequest.settings);
      setGenerationPanelVisible(true);
      setPendingGenerationRequest(null);
    }
  }, [user, pendingGenerationRequest]);

  const handleOpenGenerationPanel = (prompt?: string) => {
    if (!user) {
      // Store the generation request and show auth modal
      if (prompt) {
        setPendingGenerationRequest({
          prompt,
          settings: generationSettings,
        });
      }
      setAuthModalVisible(true);
      return;
    }

    if (prompt) {
      setCurrentPrompt(prompt);
    }
    setGenerationPanelVisible(true);
  };

  const handleCloseGenerationPanel = () => {
    setGenerationPanelVisible(false);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground relative">
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isMobile={isMobile} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onOpenAuthModal={(redirectPath) => {
          setAuthRedirectPath(redirectPath || null);
          setAuthModalVisible(true);
        }}
      />
      
      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${
        isMobile ? 'ml-0' : 'ml-20'
      }`}>
        {/* Mobile Header */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-30 flex items-center px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex w-10 h-10 items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="ml-3 text-lg font-semibold">Art Framer</h1>
          </div>
        )}
        
        {/* Content with mobile padding */}
        <div className={isMobile ? 'pt-14' : ''}>
          {children}
        </div>
      </main>
      
      {/* Generation Panel */}
      {generationPanelVisible && (
        <GenerationPanel
          isOpen={generationPanelVisible}
          onClose={handleCloseGenerationPanel}
          promptText={currentPrompt}
          aspectRatio={generationSettings.aspectRatio}
          numberOfImages={generationSettings.numberOfImages}
          model={generationSettings.model}
          renderSpeed={generationSettings.renderSpeed}
          style={generationSettings.style}
          color={generationSettings.color}
          referenceImages={generationSettings.referenceImages}
        />
      )}
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalVisible}
        onClose={() => {
          setAuthModalVisible(false);
          setPendingGenerationRequest(null);
        }}
        onAuthSuccess={() => {
          setAuthModalVisible(false);
          setAuthRedirectPath(null);
          setPendingGenerationRequest(null);
        }}
      />
      
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={welcomeModalVisible}
        onClose={() => setWelcomeModalVisible(false)}
        onStartCreating={() => setWelcomeModalVisible(false)}
      />
      
      {/* Styles Onboarding Modal */}
      <StylesOnboardingModal
        isOpen={stylesOnboardingVisible}
        onClose={() => setStylesOnboardingVisible(false)}
        onTryNow={() => setStylesOnboardingVisible(false)}
      />
    </div>
  );
}
