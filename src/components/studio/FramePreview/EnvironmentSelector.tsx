/**
 * Environment Selector Component
 * Allows users to switch between different room environments
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RoomEnvironment } from './RoomScene';

interface EnvironmentSelectorProps {
  environment: RoomEnvironment;
  onChange: (env: RoomEnvironment) => void;
}

const environments: Array<{
  value: RoomEnvironment;
  label: string;
  icon: string;
  description: string;
}> = [
  { value: 'living-room', label: 'Living Room', icon: '🛋️', description: 'Cozy home space' },
  // Add more environments as you add more GLB files:
  // { value: 'office', label: 'Office', icon: '💼', description: 'Professional workspace' },
  // { value: 'salon', label: 'Salon', icon: '✨', description: 'Elegant display space' },
  // { value: 'bedroom', label: 'Bedroom', icon: '🛏️', description: 'Personal retreat' },
  // { value: 'dining-room', label: 'Dining Room', icon: '🍽️', description: 'Formal dining area' },
  // { value: 'gallery', label: 'Gallery', icon: '🖼️', description: 'Art gallery setting' },
  // { value: 'modern-loft', label: 'Modern Loft', icon: '🏢', description: 'Contemporary urban space' },
  // { value: 'cozy-cafe', label: 'Cozy Cafe', icon: '☕', description: 'Relaxed cafe atmosphere' },
];

export function EnvironmentSelector({ environment, onChange }: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentEnv = environments.find(e => e.value === environment) || environments[0];

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{currentEnv.icon}</span>
        <span className="font-medium text-sm sm:text-base">{currentEnv.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {environments.map((env) => (
                <button
                  key={env.value}
                  onClick={() => {
                    onChange(env.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors
                    ${environment === env.value
                      ? 'bg-black text-white'
                      : 'hover:bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  <span className="text-xl">{env.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{env.label}</div>
                    <div className={`text-xs ${environment === env.value ? 'text-gray-300' : 'text-gray-500'}`}>
                      {env.description}
                    </div>
                  </div>
                  {environment === env.value && (
                    <span className="text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


