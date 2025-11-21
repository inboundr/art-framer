/**
 * Smart Suggestions Component
 * Displays AI-powered suggestions with one-tap try-on
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudioStore } from '@/store/studio';

export function SmartSuggestions() {
  const { suggestions, applySuggestion, dismissSuggestion } = useStudioStore();

  if (suggestions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span>✨</span>
        <span>Smart Suggestions</span>
      </h3>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase text-blue-600">
                      {suggestion.type}
                    </span>
                    {suggestion.impact.price !== undefined && (
                      <span
                        className={`text-xs font-semibold ${
                          suggestion.impact.price > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}
                      >
                        {suggestion.impact.price > 0 ? '+' : ''}$
                        {Math.abs(suggestion.impact.price)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-900 font-medium mb-1">
                    {getActionLabel(suggestion)}
                  </p>

                  <p className="text-xs text-gray-600">{suggestion.reason}</p>

                  {/* Impacts */}
                  <div className="flex gap-2 mt-2">
                    {suggestion.impact.aesthetic && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        +{Math.round(suggestion.impact.aesthetic * 100)}% appeal
                      </span>
                    )}
                    {suggestion.impact.quality && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        +{Math.round(suggestion.impact.quality * 100)}% quality
                      </span>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="flex-shrink-0 ml-2 w-6 h-6 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => applySuggestion(suggestion.id)}
                  className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm hover:shadow-md"
                >
                  ✨ Try it
                </button>

                {/* Confidence indicator */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getActionLabel(suggestion: any): string {
  switch (suggestion.type) {
    case 'add':
      return `Add ${suggestion.value}`;
    case 'change':
      return `Change to ${suggestion.value}`;
    case 'upgrade':
      return `Upgrade to ${suggestion.value}`;
    case 'remove':
      return `Remove ${suggestion.target}`;
    default:
      return 'Try this suggestion';
  }
}

