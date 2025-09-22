'use client';

import React from 'react';

interface StylesOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryNow: () => void;
}

export function StylesOnboardingModal({ isOpen, onClose, onTryNow }: StylesOnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        role="dialog"
        aria-labelledby="styles-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 
            id="styles-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Introducing Ideogram Styles
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              fill="none" 
              viewBox="0 0 20 20"
              className="text-gray-500"
            >
              <path 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="m5 5 10 10M5 15 15 5"
              />
            </svg>
          </button>
        </div>

        {/* Video Section */}
        <div className="px-6 pb-4">
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <video
              autoPlay
              loop
              playsInline
              muted
              className="w-full h-auto"
              style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
              src="https://storage.googleapis.com/ideogram-static/ideogram_style_library_demo.mp4"
            >
              <source src="https://storage.googleapis.com/ideogram-static/ideogram_style_library_demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Description and Action */}
        <div className="px-6 pb-6">
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Ideogram Styles makes it easy to turn basic prompts into sophisticated, consistent aesthetics in seconds.
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={onTryNow}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
