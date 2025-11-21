/**
 * Welcome Modal Component
 * Shows introduction and entry points
 */

'use client';

import { useState, useEffect } from 'react';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen welcome before
    const hasSeenWelcome = localStorage.getItem('studio-welcome-seen');
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('studio-welcome-seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Art Framer Studio
          </h1>
          <p className="text-gray-600 text-lg">
            Create the perfect custom frame in minutes with AI assistance
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl mb-3">
              💬
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              AI Assistant
            </h3>
            <p className="text-sm text-gray-600">
              Chat naturally about your vision. No technical knowledge needed.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl mb-3">
              🎨
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Smart Analysis
            </h3>
            <p className="text-sm text-gray-600">
              AI analyzes your art and recommends the perfect frame options.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl mb-3">
              🖼️
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              3D Preview
            </h3>
            <p className="text-sm text-gray-600">
              See photorealistic previews with real materials and textures.
            </p>
          </div>

          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-2xl mb-3">
              🏠
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Room Visualization
            </h3>
            <p className="text-sm text-gray-600">
              Place your framed art in your actual room before buying.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Get Started
          </button>
          <button
            onClick={() => {
              handleClose();
              // Could show tour
            }}
            className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Take a Tour
          </button>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-500 text-center mt-4">
          💡 Tip: Start by uploading an image or chatting with the AI about
          what you want to create
        </p>
      </div>
    </div>
  );
}

