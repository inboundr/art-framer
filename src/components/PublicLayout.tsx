'use client';

import React, { useState, useEffect } from 'react';
import { GenerationPanel } from './GenerationPanel';
import { SearchBar } from './SearchBar';
import { NotificationBar } from './NotificationBar';
import { CuratedImageGallery } from './CuratedImageGallery';
import { AuthModal } from './AuthModal';
import { WelcomeModal } from './WelcomeModal';
import { useAuth } from '@/hooks/useAuth';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { user } = useAuth(); // Keep this for generation panel logic
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

  // Show welcome modal once for brand new visitors (no sign-in required)
  useEffect(() => {
    try {
      const seen = localStorage.getItem('af_new_visitor_intro_shown');
      if (!seen) {
        setWelcomeModalVisible(true);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Handle pending generation request after auth
  useEffect(() => {
    if (user && pendingGenerationRequest) {
      setCurrentPrompt(pendingGenerationRequest.prompt);
      setGenerationSettings(pendingGenerationRequest.settings);
      setGenerationPanelVisible(true);
      setPendingGenerationRequest(null);
    }
  }, [user, pendingGenerationRequest]);

  const handleOpenGenerationPanel = (prompt?: string, settings?: {
    aspectRatio: string;
    numberOfImages: number;
    model: string;
    renderSpeed: string;
    style: string;
    color: string;
    referenceImages: string[];
  }) => {
    if (!user) {
      // Store the generation request and show auth modal
      if (prompt) {
        setPendingGenerationRequest({
          prompt,
          settings: settings || generationSettings,
        });
      }
      setAuthModalVisible(true);
      return;
    }

    if (prompt) {
      setCurrentPrompt(prompt);
    }
    
    // Update generation settings if provided
    if (settings) {
      setGenerationSettings(settings);
    }
    
    setGenerationPanelVisible(true);
  };

  const handleCloseGenerationPanel = () => {
    setGenerationPanelVisible(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 relative flex-col">
      {/* Main Content */}
      <main className="flex-1 pt-16">
          {children ? (
            // Render children (for other pages like creations)
            children
          ) : (
            // Render default home page content - NO AUTH BLOCKING
            <div className="flex flex-col min-h-screen bg-gray-50">
              {/* Search/Navigation Bar */}
              <SearchBar onOpenGenerationPanel={handleOpenGenerationPanel} />
              
              {/* Main Curated Image Gallery - LOADS IMMEDIATELY */}
              <CuratedImageGallery onOpenAuthModal={() => {
                console.log('🔐 Auth modal triggered from CuratedImageGallery');
                setAuthModalVisible(true);
              }} />
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
          console.log('🔐 Auth modal closed');
          setAuthModalVisible(false);
          setPendingGenerationRequest(null);
        }}
        onAuthSuccess={() => {
          setAuthModalVisible(false);
          setAuthRedirectPath(null);
          // Don't clear pendingGenerationRequest here - let the useEffect handle it
        }}
      />
      
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={welcomeModalVisible}
        onClose={() => {
          try { localStorage.setItem('af_new_visitor_intro_shown', 'true'); } catch {}
          setWelcomeModalVisible(false);
        }}
        onStartCreating={() => {
          try { localStorage.setItem('af_new_visitor_intro_shown', 'true'); } catch {}
          setWelcomeModalVisible(false);
        }}
      />
      
    </div>
  );
}
