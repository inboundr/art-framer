'use client';

import React, { useState } from 'react';
import { LoginForm } from '@/components/forms/LoginForm';
import { SignupForm } from '@/components/forms/SignupForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
        ) : (
          <SignupForm 
            onSwitchToLogin={() => setIsLogin(true)}
            onSignupStart={() => {
              // Optional: Add any signup start logic here
              console.log('Signup process started');
            }}
          />
        )}
      </div>
    </div>
  );
}
