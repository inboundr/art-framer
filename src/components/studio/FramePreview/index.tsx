/**
 * Frame Preview Component
 * 3D preview of frame with controls
 */

'use client';

import { useState, Suspense } from 'react';
import { useStudioStore } from '@/store/studio';
import { Scene3D } from './Scene3D';
import { PreviewControls } from './PreviewControls';
import { ViewModeSelector } from './ViewModeSelector';
import { RoomScene, type RoomEnvironment } from './RoomScene';
import { EnvironmentSelector } from './EnvironmentSelector';
import { DynamicErrorBoundary } from '@/components/DynamicErrorBoundary';

export type ViewMode = '3d' | 'room' | 'ar' | 'compare';

export function FramePreview() {
  const { config } = useStudioStore();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [showControls, setShowControls] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [roomEnvironment, setRoomEnvironment] = useState<RoomEnvironment>('living-room');

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
          <DynamicErrorBoundary
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center p-8">
                  <div className="text-4xl mb-4">🖼️</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Preview Loading
                  </h3>
                  <p className="text-sm text-gray-600">
                    Frame preview is loading...
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
          </DynamicErrorBoundary>
        </div>
      )}

      {/* Room View */}
      {viewMode === 'room' && (
        <div className="w-full h-full relative">
          {/* Environment Selector */}
          <div className="absolute top-4 left-4 z-20">
            <EnvironmentSelector
              environment={roomEnvironment}
              onChange={setRoomEnvironment}
            />
          </div>
          
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
              environment={roomEnvironment}
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

    </div>
  );
}

