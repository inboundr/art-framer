/**
 * AI Studio - Main Page
 * 
 * The complete AI-powered frame customization experience
 */

'use client';

import { useEffect } from 'react';
import { useStudioStore } from '@/store/studio';
import { AIChat } from '@/components/studio/AIChat';
import { FramePreview } from '@/components/studio/FramePreview';
import { ContextPanel } from '@/components/studio/ContextPanel';
import { WelcomeModal } from '@/components/studio/WelcomeModal';
import { ImageUpload } from '@/components/studio/ImageUpload';

export default function StudioPage() {
  const { config, isAnalyzing } = useStudioStore();
  const hasImage = !!config.imageUrl;

  useEffect(() => {
    // Initialize conversation
    const conversationId = `conv-${Date.now()}`;
    useStudioStore.getState().setConversationId(conversationId);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Welcome Modal - shown on first visit */}
      {!hasImage && <WelcomeModal />}

      {/* Three-panel layout */}
      <div className="flex w-full">
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
          <ContextPanel />
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
  );
}

