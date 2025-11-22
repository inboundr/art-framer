/**
 * Suggestion Card Component
 * Shows AI suggestions with accept/reject buttons (Cursor-style)
 */

'use client';

import { useState } from 'react';
import type { FrameConfiguration } from '@/store/studio';

export interface Suggestion {
  id: string;
  type: 'configuration' | 'pricing' | 'comparison' | 'info';
  title: string;
  description: string;
  changes: Partial<FrameConfiguration>;
  currentValues?: Record<string, any>;
  estimatedPrice?: {
    before: number;
    after: number;
    currency: string;
  };
  confidence?: number;
  reason?: string;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAccept: (suggestion: Suggestion) => void;
  onReject: (suggestion: Suggestion) => void;
  isApplying?: boolean;
}

export function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  isApplying = false,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getChangesList = () => {
    const changes: Array<{ key: string; from?: any; to: any }> = [];
    
    Object.entries(suggestion.changes).forEach(([key, value]) => {
      const current = suggestion.currentValues?.[key];
      if (current !== value) {
        changes.push({
          key: formatKey(key),
          from: current,
          to: value,
        });
      }
    });
    
    return changes;
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'none';
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  const changes = getChangesList();
  const showPriceChange = suggestion.estimatedPrice && 
    suggestion.estimatedPrice.before !== suggestion.estimatedPrice.after;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
            {suggestion.confidence && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {Math.round(suggestion.confidence * 100)}% confident
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{suggestion.description}</p>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 ml-2"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Changes Preview */}
      {isExpanded && changes.length > 0 && (
        <div className="mb-3 p-3 bg-white rounded-md border border-blue-100">
          <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Proposed Changes
          </div>
          <div className="space-y-2">
            {changes.map((change, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{change.key}:</span>
                <div className="flex items-center gap-2">
                  {change.from && (
                    <>
                      <span className="text-gray-500 line-through">
                        {formatValue(change.from)}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <span className="font-semibold text-blue-700">
                    {formatValue(change.to)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Change */}
      {isExpanded && showPriceChange && (
        <div className="mb-3 p-3 bg-white rounded-md border border-blue-100">
          <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Price Impact
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">Estimated Total:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 line-through">
                ${suggestion.estimatedPrice!.before.toFixed(2)}
              </span>
              <span className="text-gray-400">→</span>
              <span className={`font-bold ${
                suggestion.estimatedPrice!.after < suggestion.estimatedPrice!.before
                  ? 'text-green-600'
                  : suggestion.estimatedPrice!.after > suggestion.estimatedPrice!.before
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}>
                ${suggestion.estimatedPrice!.after.toFixed(2)}
              </span>
            </div>
          </div>
          {suggestion.estimatedPrice!.after !== suggestion.estimatedPrice!.before && (
            <div className="mt-1 text-xs text-gray-600">
              {suggestion.estimatedPrice!.after < suggestion.estimatedPrice!.before ? '💰 Saves' : '📈 Adds'}{' '}
              ${Math.abs(suggestion.estimatedPrice!.after - suggestion.estimatedPrice!.before).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      {isExpanded && suggestion.reason && (
        <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-100">
          <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
            Why this suggestion?
          </div>
          <p className="text-sm text-gray-700">{suggestion.reason}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onAccept(suggestion)}
          disabled={isApplying}
          className="flex-1 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Applying...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept
            </>
          )}
        </button>
        
        <button
          onClick={() => onReject(suggestion)}
          disabled={isApplying}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reject
        </button>
      </div>

      {/* Quick Preview Button (optional) */}
      {suggestion.type === 'configuration' && (
        <button
          onClick={() => {
            // TODO: Show temporary preview
          }}
          className="w-full mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          👁️ Preview in 3D (hold to see)
        </button>
      )}
    </div>
  );
}

