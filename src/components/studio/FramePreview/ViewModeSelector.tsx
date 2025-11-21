/**
 * View Mode Selector Component
 * Switch between different preview modes
 */

'use client';

import type { ViewMode } from './index';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ mode, onChange }: ViewModeSelectorProps) {
  const modes: Array<{ value: ViewMode; label: string; icon: string }> = [
    { value: '3d', label: '3D Preview', icon: '🖼️' },
    { value: 'room', label: 'In Room', icon: '🏠' },
    { value: 'ar', label: 'AR Mode', icon: '📱' },
    { value: 'compare', label: 'Compare', icon: '⚖️' },
  ];

  return (
    <div className="inline-flex bg-white rounded-lg shadow-sm p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-all
            ${
              mode === m.value
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <span className="mr-2">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

