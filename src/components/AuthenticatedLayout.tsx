'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { GenerationPanel } from './GenerationPanel';
import { SearchBar } from './SearchBar';
import { NotificationBar } from './NotificationBar';
import { AuthModal } from './AuthModal';
import { WelcomeModal } from './WelcomeModal';
import { CartSidebar } from './CartSidebar';
import { useAuth } from '@/hooks/useAuth';

interface AuthenticatedLayoutProps {
  children: React.ReactNode | ((props: { onOpenAuthModal: () => void }) => React.ReactNode);
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, profile, updateProfile } = useAuth();
  const router = useRouter();
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
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
  const [showNotification, setShowNotification] = useState(
    process.env.NEXT_PUBLIC_SHOW_NOTIFICATION_BAR === 'true'
  );

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
    <div className="flex min-h-screen bg-gray-50 text-gray-900 relative flex-col">
      {/* Main Content */}
      <main className="flex-1 pt-16">
        {typeof children === 'function' 
          ? children({ onOpenAuthModal: () => setAuthModalVisible(true) })
          : children
        }
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

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={cartSidebarOpen}
        onClose={() => setCartSidebarOpen(false)}
      />
      
    </div>
  );
}
