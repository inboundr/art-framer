'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GenerationPanel } from './GenerationPanel';
import { SearchBar } from './SearchBar';
import { NotificationBar } from './NotificationBar';
import { CuratedImageGallery } from './CuratedImageGallery';
import { AuthModal } from './AuthModal';
import { WelcomeModal } from './WelcomeModal';
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
  const [generationPanelVisible, setGenerationPanelVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState<string | null>(null);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);
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
        <div className="flex min-h-screen bg-gray-50 text-gray-900 relative flex-col">
      {/* Main Content */}
      <main className="flex-1 pt-16">
          {children ? (
            // Render children (for other pages like creations)
            children
          ) : (
            // Render default home page content
            <div className="flex flex-col min-h-screen bg-gray-50">
              {/* Search/Navigation Bar */}
              <SearchBar onOpenGenerationPanel={handleOpenGenerationPanel} />
              
              {/* Main Curated Image Gallery */}
              <CuratedImageGallery onOpenAuthModal={() => setAuthModalVisible(true)} />
            </div>
          )}
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
        
        
        {/* Development Status Indicator - Temporarily disabled */}
        {/* <DynamicStatusIndicator /> */}
        </div>
      // </DynamicThemeProvider>
    // </DynamicErrorBoundary>
  );
}
