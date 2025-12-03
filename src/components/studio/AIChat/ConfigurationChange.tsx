/**
 * Configuration Change Message Component
 * Shows configuration changes in chat with revert functionality
 */

'use client';

import { useState } from 'react';
import { type FrameConfiguration } from '@/store/studio';

export interface ConfigurationChangeData {
  id: string;
  timestamp: number;
  changes: Partial<FrameConfiguration>;
  previousConfig: FrameConfiguration;
  source: 'user' | 'ai' | 'suggestion';
  description?: string;
}

interface ConfigurationChangeProps {
  change: ConfigurationChangeData;
  onRevert: (config: FrameConfiguration) => void;
}

export function ConfigurationChange({ change, onRevert }: ConfigurationChangeProps) {
  const [isReverting, setIsReverting] = useState(false);

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      await onRevert(change.previousConfig);
    } finally {
      setIsReverting(false);
    }
  };

  // Generate a human-readable description of the changes
  const getChangeDescription = () => {
    if (change.description) return change.description;

    const changedKeys = Object.keys(change.changes);
    if (changedKeys.length === 0) return 'No changes';

    const changes = changedKeys.map((key) => {
      const value = change.changes[key as keyof FrameConfiguration];
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
      
      // Format specific values
      if (key === 'size') return `Size: ${value}`;
      if (key === 'frameColor') return `Frame color: ${value}`;
      if (key === 'frameStyle') return `Frame style: ${value}`;
      if (key === 'mount') {
        if (value === 'none') return 'Removed mount';
        return `Mount: ${value}`;
      }
      if (key === 'mountColor') return `Mount color: ${value}`;
      if (key === 'glaze') return `Glaze: ${value}`;
      if (key === 'productType') {
        const types: Record<string, string> = {
          'framed-print': 'Framed Print',
          'canvas': 'Canvas',
          'framed-canvas': 'Framed Canvas',
          'acrylic': 'Acrylic Print',
          'metal': 'Metal Print',
          'poster': 'Poster',
        };
        return `Product: ${types[value as string] || value}`;
      }
      
      return `${formattedKey}: ${value}`;
    });

    return changes.join(', ');
  };

  const getSourceIcon = () => {
    switch (change.source) {
      case 'ai':
        return '🤖';
      case 'suggestion':
        return '💡';
      case 'user':
      default:
        return '✏️';
    }
  };

  const formatTime = () => {
    const now = Date.now();
    const diff = now - change.timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(change.timestamp).toLocaleDateString();
  };

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-lg">
        {getSourceIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 font-medium">
          Configuration Updated
        </div>
        <div className="text-xs text-gray-600 mt-0.5">
          {getChangeDescription()}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {formatTime()}
        </div>
      </div>

      {/* Revert button */}
      <button
        onClick={handleRevert}
        disabled={isReverting}
        className="flex-shrink-0 p-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Revert to this configuration"
      >
        {isReverting ? (
          <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )}
      </button>
    </div>
  );
}

