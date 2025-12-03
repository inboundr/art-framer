/**
 * Preview Controls Component
 * Interactive controls for 3D preview
 */

'use client';

import { useStudioStore } from '@/store/studio';
import { FRAME_SIZES } from '@/lib/utils/size-conversion';

interface PreviewControlsProps {
  autoRotate: boolean;
  onAutoRotateToggle: () => void;
  onResetView: () => void;
}

export function PreviewControls({ autoRotate, onAutoRotateToggle, onResetView }: PreviewControlsProps) {
  const { config, updateConfig } = useStudioStore();

  return (
    <>
      {/* Desktop version - Full controls */}
      <div className="hidden md:block bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          {/* View controls */}
          <button
            onClick={onAutoRotateToggle}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
          >
            {autoRotate ? '⏸️ Stop' : '▶️ Auto-Rotate'}
          </button>

          <button
            onClick={onResetView}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
          >
            🔄 Reset View
          </button>

          {/* Size selector */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Size:</span>
            <select
              value={config.size}
              onChange={(e) => updateConfig({ size: e.target.value })}
              className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
            >
              {FRAME_SIZES.map(size => (
                <option key={size.inches} value={size.inches}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile version - Compact controls */}
      <div className="md:hidden bg-white rounded-xl shadow-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between gap-2">
          {/* Size selector */}
          <select
            value={config.size}
            onChange={(e) => updateConfig({ size: e.target.value })}
            className="flex-1 text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
          >
            {FRAME_SIZES.map(size => (
              <option key={size.inches} value={size.inches}>
                {size.label}
              </option>
            ))}
          </select>


          <button
            onClick={onResetView}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
            title="Reset view"
          >
            🔄
          </button>

          <button
            onClick={onAutoRotateToggle}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm"
            title={autoRotate ? 'Stop rotation' : 'Auto-rotate'}
          >
            {autoRotate ? '⏸️' : '▶️'}
          </button>
        </div>
      </div>
    </>
  );
}

