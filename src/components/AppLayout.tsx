'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { GenerationPanel } from './GenerationPanel';
import { SearchBar } from './SearchBar';
import { NotificationBar } from './NotificationBar';
import { CuratedImageGallery } from './CuratedImageGallery';
import { AuthModal } from './AuthModal';
import { WelcomeModal } from './WelcomeModal';
import { StylesOnboardingModal } from './StylesOnboardingModal';
import { useAuth } from '@/hooks/useAuth';
// Temporarily simplified imports to resolve bundler issues
// import { DynamicThemeProvider, ThemeToggle, DynamicStatusIndicator } from './DynamicThemeProvider';
// import { DynamicErrorBoundary } from './DynamicErrorBoundary';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, updateProfile } = useAuth();
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

  // Check if user should see welcome modal (only on second login)
  useEffect(() => {
    if (user) {
      const loginCount = parseInt(localStorage.getItem('art-framer-login-count') || '0');
      const hasSeenWelcome = localStorage.getItem('art-framer-welcome-seen');
      
      // Increment login count
      localStorage.setItem('art-framer-login-count', (loginCount + 1).toString());
      
      // Show welcome modal only on second login and if not seen before
      if (loginCount === 1 && !hasSeenWelcome) {
        setWelcomeModalVisible(true);
      }
    }
  }, [user]);

  // Check if user should see styles onboarding modal (for second-time users)
  // Check for styles onboarding
  useEffect(() => {
    if (user && profile) {
      // Show styles onboarding for users with login_count >= 2 who haven't seen it yet
      if (profile.login_count >= 2 && !profile.has_seen_styles_onboarding) {
        setStylesOnboardingVisible(true);
      }
    }
  }, [user, profile]);

  // Check for pending generation from localStorage (when coming from creations page)
  useEffect(() => {
    const pendingGeneration = localStorage.getItem('pending-generation');
    if (pendingGeneration && user) {
      try {
        const { prompt, settings } = JSON.parse(pendingGeneration);
        localStorage.removeItem('pending-generation');
        
        // Set the prompt and settings and open generation panel
        setCurrentPrompt(prompt);
        setGenerationSettings(settings);
        setGenerationPanelVisible(true);
      } catch (error) {
        console.error('Error parsing pending generation:', error);
        localStorage.removeItem('pending-generation');
      }
    }
  }, [user]);

  const handleOpenGenerationPanel = (promptText: string, settings: {
    aspectRatio: string;
    numberOfImages: number;
    model: string;
    renderSpeed: string;
    style: string;
    color: string;
    referenceImages: string[];
  }) => {
    // Check if user is authenticated
    if (!user) {
      // Store the pending generation request
      setPendingGenerationRequest({
        prompt: promptText,
        settings: settings
      });
      setAuthModalVisible(true);
      return;
    }
    
    // User is authenticated, show generation panel with prompt and settings
    setCurrentPrompt(promptText);
    setGenerationSettings(settings);
    setGenerationPanelVisible(true);
  };

  const handleCloseGenerationPanel = () => {
    setGenerationPanelVisible(false);
  };

  return (
    // Temporarily removed dynamic components to resolve bundler issues
    // <DynamicErrorBoundary>
    //   <DynamicThemeProvider>
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
          {children ? (
            // Render children (for other pages like creations)
            children
          ) : (
            // Render default home page content
            <div className="flex flex-col min-h-screen bg-background">
              {/* Notification Bar */}
              {showNotification && (
                <NotificationBar onClose={() => setShowNotification(false)} />
              )}
              
              {/* Top Spacer */}
              <div className="h-16 min-h-16 self-stretch bg-background" />
              
              {/* Search/Navigation Bar */}
              <SearchBar onOpenGenerationPanel={handleOpenGenerationPanel} />
              
              {/* Main Curated Image Gallery */}
              <CuratedImageGallery onOpenAuthModal={() => setAuthModalVisible(true)} />
            </div>
          )}
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
            setPendingGenerationRequest(null); // Clear pending request if modal is closed without auth
          }}
          onAuthSuccess={() => {
            setAuthModalVisible(false);
            
            // Handle redirect after successful authentication
            if (authRedirectPath) {
              router.push(authRedirectPath);
              setAuthRedirectPath(null); // Clear the redirect path
            }
            
            // If there's a pending generation request, process it
            if (pendingGenerationRequest) {
              setCurrentPrompt(pendingGenerationRequest.prompt);
              setGenerationSettings(pendingGenerationRequest.settings);
              setGenerationPanelVisible(true);
              setPendingGenerationRequest(null); // Clear the pending request
            }
          }}
        />
        
        {/* Welcome Modal */}
        <WelcomeModal
          isOpen={welcomeModalVisible}
          onClose={() => setWelcomeModalVisible(false)}
          onStartCreating={() => {
            setWelcomeModalVisible(false);
            
            // Handle redirect after welcome modal
            if (authRedirectPath) {
              router.push(authRedirectPath);
              setAuthRedirectPath(null); // Clear the redirect path
            }
            
            // If there's a pending generation request, process it after welcome modal
            if (pendingGenerationRequest) {
              setCurrentPrompt(pendingGenerationRequest.prompt);
              setGenerationSettings(pendingGenerationRequest.settings);
              setGenerationPanelVisible(true);
              setPendingGenerationRequest(null); // Clear the pending request
            }
          }}
        />
        
        {/* Styles Onboarding Modal */}
        <StylesOnboardingModal
          isOpen={stylesOnboardingVisible}
          onClose={async () => {
            setStylesOnboardingVisible(false);
            if (updateProfile) {
              await updateProfile({ has_seen_styles_onboarding: true });
            }
          }}
          onTryNow={async () => {
            setStylesOnboardingVisible(false);
            if (updateProfile) {
              await updateProfile({ has_seen_styles_onboarding: true });
            }
            // Focus on the style dropdown or show style-related UI
          }}
        />
        
        {/* Development Status Indicator - Temporarily disabled */}
        {/* <DynamicStatusIndicator /> */}
        </div>
      // </DynamicThemeProvider>
    // </DynamicErrorBoundary>
  );
}
