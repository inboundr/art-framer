/**
 * Context Panel Component
 * Shows pricing, configuration, and suggestions
 */

'use client';

import { useEffect } from 'react';
import { useStudioStore, useTotalPrice } from '@/store/studio';
import { PricingDisplay } from './PricingDisplay';
import { ConfigurationSummary } from './ConfigurationSummary';
import { SmartSuggestions } from './SmartSuggestions';
import { QuickOptions } from './QuickOptions';

export function ContextPanel() {
  const { config, imageAnalysis, suggestions, setSuggestions } = useStudioStore();
  const totalPrice = useTotalPrice();

  // Load suggestions when configuration changes
  useEffect(() => {
    if (!config.imageUrl || !imageAnalysis) return;

    const loadSuggestions = async () => {
      try {
        const response = await fetch('/api/studio/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config,
            imageAnalysis,
            userContext: {
              budget: 250, // Could come from user profile
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error loading suggestions:', error);
      }
    };

    // Debounce suggestions loading
    const timeout = setTimeout(loadSuggestions, 1000);
    return () => clearTimeout(timeout);
  }, [config, imageAnalysis]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Frame</h2>
        <p className="text-sm text-gray-500 mt-1">
          {config.imageUrl ? 'Customize your perfect frame' : 'Upload an image to start'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Pricing */}
        {config.imageUrl && <PricingDisplay />}

        {/* AI Confidence Score */}
        {config.aiConfidenceScore > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                AI Confidence
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {Math.round(config.aiConfidenceScore * 100)}%
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${config.aiConfidenceScore * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">
              This configuration is a great match for your artwork
            </p>
          </div>
        )}

        {/* Smart Suggestions */}
        {suggestions.length > 0 && <SmartSuggestions />}

        {/* Configuration Summary */}
        {config.imageUrl && <ConfigurationSummary />}

        {/* Quick Options */}
        {config.imageUrl && <QuickOptions />}
      </div>

      {/* Footer - CTA */}
      {config.imageUrl && (
        <div className="border-t border-gray-200 p-4 space-y-3 bg-white">
          <button
            className="w-full px-6 py-4 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            onClick={() => {
              // Navigate to checkout
              window.location.href = '/checkout';
            }}
          >
            Add to Cart · ${totalPrice.toFixed(2)}
          </button>

          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
              onClick={async () => {
                try {
                  await useStudioStore.getState().saveConfiguration('My Frame');
                  alert('Configuration saved!');
                } catch (error) {
                  alert('Failed to save configuration');
                }
              }}
            >
              💾 Save
            </button>

            <button
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
              onClick={() => {
                // Share functionality
                navigator.share?.({
                  title: 'My Custom Frame',
                  text: 'Check out my custom frame design!',
                  url: window.location.href,
                });
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

