/**
 * Frame Preview Component
 * 3D preview of frame with controls
 */

'use client';

import { useState } from 'react';
import { useStudioStore } from '@/store/studio';
import { Scene3D } from './Scene3D';
import { PreviewControls } from './PreviewControls';
import { ViewModeSelector } from './ViewModeSelector';

export type ViewMode = '3d' | 'room' | 'ar' | 'compare';

export function FramePreview() {
  const { config } = useStudioStore();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [showControls, setShowControls] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  if (!config.imageUrl) {
    return null;
  }

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className="relative h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* View Mode Selector */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-10 flex items-center justify-between">
        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-gray-700 font-semibold rounded-lg shadow-sm text-xs sm:text-sm hover:bg-gray-50 hover:shadow-md transition-all border border-gray-200"
          >
            <span className="hidden sm:inline">{showControls ? 'Hide Controls' : 'Show Controls'}</span>
            <span className="sm:hidden">{showControls ? 'Hide' : 'Show'}</span>
          </button>
        </div>
      </div>

      {/* 3D Scene */}
      {viewMode === '3d' && (
        <div className="w-full h-full">
          <Scene3D 
            config={config} 
            autoRotate={autoRotate}
            resetTrigger={resetTrigger}
          />
        </div>
      )}

      {/* Room View */}
      {viewMode === 'room' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Room Visualization
            </h3>
            <p className="text-gray-600 mb-6">
              Upload a photo of your room to see how this frame looks in your
              space
            </p>
            <button className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Upload Room Photo
            </button>
          </div>
        </div>
      )}

      {/* AR View */}
      {viewMode === 'ar' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AR Mode
            </h3>
            <p className="text-gray-600 mb-6">
              Use your camera to place the frame in your space in real-time
            </p>
            <button className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Open Camera
            </button>
          </div>
        </div>
      )}

      {/* Compare View */}
      {viewMode === 'compare' && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">⚖️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Compare Options
            </h3>
            <p className="text-gray-600 mb-6">
              See multiple frame options side-by-side
            </p>
            <button className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Generate Variations
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && viewMode === '3d' && (
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 z-10">
          <PreviewControls 
            autoRotate={autoRotate}
            onAutoRotateToggle={() => setAutoRotate(!autoRotate)}
            onResetView={handleResetView}
          />
        </div>
      )}

      {/* Info Overlay - Hidden on small mobile, shown on sm and up */}
      <div className="hidden sm:block absolute top-16 sm:top-20 right-2 sm:right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="text-gray-600 font-medium">Size:</span>
            <span className="font-bold text-gray-900">{config.size}</span>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <span className="text-gray-600 font-medium">Frame:</span>
            <span className="font-bold text-gray-900 capitalize">{config.frameColor}</span>
          </div>
          {config.glaze && config.glaze !== 'none' && (
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <span className="text-gray-600 font-medium">Glaze:</span>
              <span className="font-bold text-gray-900 capitalize">{config.glaze}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

