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
import { ExplodedView } from './ExplodedView';
import { UnboxingVideo } from './UnboxingVideo';

export type ViewMode = '3d' | 'exploded' | 'room' | 'unboxing';

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
      {/* View Mode Selector - Vertical on desktop (top-left), horizontal on mobile (bottom-left) */}
      <div className="absolute z-10 
        lg:top-4 lg:left-4 lg:flex-col lg:space-y-2
        bottom-4 left-4 right-4 lg:right-auto flex lg:flex-col flex-row space-x-2 lg:space-x-0 lg:space-y-2">
        <ViewModeSelector mode={viewMode} onChange={setViewMode} config={config} />
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

      {/* Exploded View */}
      {viewMode === 'exploded' && (
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
                      Loading Exploded View
                    </h3>
                    <p className="text-sm text-gray-600">
                      Preparing frame components...
                    </p>
                  </div>
                </div>
              }
            >
              <ExplodedView 
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

      {/* Unboxing Video */}
      {viewMode === 'unboxing' && (
        <div className="w-full h-full">
          <UnboxingVideo />
        </div>
      )}

    </div>
  );
}

