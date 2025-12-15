/**
 * Frame Preview Component
 * 3D preview of frame with controls
 */

'use client';

import { useState, Suspense } from 'react';
import { useStudioStore } from '@/store/studio';
import { Scene3D } from './Scene3D';
import { ViewModeSelector } from './ViewModeSelector';
import { RoomScene } from './RoomScene';
import { DynamicErrorBoundary } from '@/components/DynamicErrorBoundary';
import { FallbackScene3D } from './FallbackScene3D';

export type ViewMode = '3d' | 'room' | 'ar' | 'compare';

export function FramePreview() {
  const { config } = useStudioStore();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [autoRotate] = useState(false);
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
      </div>

      {/* 3D Scene */}
      {viewMode === '3d' && (
        <div className="w-full h-full">
          <DynamicErrorBoundary
            fallback={
              <FallbackScene3D 
                config={config} 
                autoRotate={autoRotate}
                resetTrigger={resetTrigger}
              />
            }
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center p-8">
                    <div className="text-4xl mb-4">⏳</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Loading Preview
                    </h3>
                    <p className="text-sm text-gray-600">
                      Loading frame textures...
                    </p>
                  </div>
                </div>
              }
            >
              <Scene3D 
                config={config} 
                autoRotate={autoRotate}
                resetTrigger={resetTrigger}
              />
            </Suspense>
          </DynamicErrorBoundary>
        </div>
      )}

      {/* Room View */}
      {viewMode === 'room' && (
        <div className="w-full h-full relative">
          {/* Room Scene */}
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading room...</p>
                </div>
              </div>
            }
          >
            <RoomScene
              config={config}
              environment="living-room"
              resetTrigger={resetTrigger}
            />
          </Suspense>
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


    </div>
  );
}

