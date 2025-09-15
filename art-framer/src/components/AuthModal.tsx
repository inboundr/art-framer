'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginForm } from './forms/LoginForm';
import { SignupForm } from './forms/SignupForm';
import { WelcomeModal } from './WelcomeModal';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const { user } = useAuth();

  // Close modal and trigger success callback when user is authenticated
  React.useEffect(() => {
    if (user && isOpen) {
      if (isNewSignup) {
        // Show welcome modal for new signups
        setShowWelcomeModal(true);
        onClose();
      } else {
        // Regular login, proceed normally
        onClose();
        onAuthSuccess?.();
      }
    }
  }, [user, isOpen, onClose, onAuthSuccess, isNewSignup]);

  const handleSwitchToSignup = () => {
    setIsLogin(false);
  };

  const handleSwitchToLogin = () => {
    setIsLogin(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLogin ? 'Sign In to Continue' : 'Create Your Account'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLogin ? (
            <LoginForm onSwitchToSignup={handleSwitchToSignup} />
          ) : (
            <SignupForm 
              onSwitchToLogin={handleSwitchToLogin} 
              onSignupStart={() => setIsNewSignup(true)}
            />
          )}
        </div>
      </DialogContent>
      
      {/* Welcome Modal for new signups */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onStartCreating={() => {
          setShowWelcomeModal(false);
          onAuthSuccess?.();
        }}
      />
    </Dialog>
  );
}
