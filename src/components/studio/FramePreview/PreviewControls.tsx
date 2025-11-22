/**
 * Preview Controls Component
 * Interactive controls for 3D preview
 */

'use client';

import { useStudioStore } from '@/store/studio';

interface PreviewControlsProps {
  autoRotate: boolean;
  onAutoRotateToggle: () => void;
  onResetView: () => void;
}

export function PreviewControls({ autoRotate, onAutoRotateToggle, onResetView }: PreviewControlsProps) {
  const { config, updateConfig, undo, redo, canUndo, canRedo } = useStudioStore();

  return (
    <>
      {/* Desktop version - Full controls */}
      <div className="hidden md:block bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - View controls */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Center - Size info */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Size:</span>
            <select
              value={config.size}
              onChange={(e) => updateConfig({ size: e.target.value })}
              className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
            >
              <option value="8x10">8x10"</option>
              <option value="11x14">11x14"</option>
              <option value="16x20">16x20"</option>
              <option value="18x24">18x24"</option>
              <option value="20x24">20x24"</option>
              <option value="20x30">20x30"</option>
              <option value="24x30">24x30"</option>
              <option value="24x36">24x36"</option>
              <option value="30x40">30x40"</option>
              <option value="36x48">36x48"</option>
            </select>
          </div>

          {/* Right side - History controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300"
              title="Undo"
            >
              ↶ Undo
            </button>

            <button
              onClick={redo}
              disabled={!canRedo()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300"
              title="Redo"
            >
              ↷ Redo
            </button>
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
            <option value="8x10">8×10"</option>
            <option value="11x14">11×14"</option>
            <option value="16x20">16×20"</option>
            <option value="18x24">18×24"</option>
            <option value="20x24">20×24"</option>
            <option value="20x30">20×30"</option>
            <option value="24x30">24×30"</option>
            <option value="24x36">24×36"</option>
            <option value="30x40">30×40"</option>
            <option value="36x48">36×48"</option>
          </select>

          {/* Icon buttons */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            ↶
          </button>

          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            ↷
          </button>

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

