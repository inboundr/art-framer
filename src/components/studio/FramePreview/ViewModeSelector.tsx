/**
 * View Mode Selector Component
 * Switch between different preview modes
 */

'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import type { ViewMode } from './index';
import type { FrameConfiguration } from '@/store/studio';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';

interface ViewModeSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  config: FrameConfiguration;
}

// Thumbnail scene for 3D preview
function ThreeDThumbnail({ config }: { config: FrameConfiguration }) {
  return (
    <Canvas className="w-full h-full" dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} intensity={0.8} />
        <Environment preset="studio" />
        
        <group>
          <ArtworkPlane 
            imageUrl={config.imageUrl || ''} 
            size={config.size}
            hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
            mount={config.mount}
          />
          <FrameModel
            color={config.frameColor}
            style={config.frameStyle}
            size={config.size}
            mount={config.mount}
            mountColor={config.mountColor}
            glaze={config.glaze}
            wrap={config.wrap}
            productType={config.productType}
            finish={config.finish}
            edge={config.edge}
            canvasType={config.canvasType}
            useTextures={false}
          />
        </group>
        
        <OrbitControls enabled={false} />
      </Suspense>
    </Canvas>
  );
}

// Thumbnail scene for exploded view
function ExplodedThumbnail({ config }: { config: FrameConfiguration }) {
  return (
    <Canvas className="w-full h-full" dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[2, 1.5, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} intensity={0.8} />
        <Environment preset="studio" />
        
        {/* Layers stacked in depth */}
        <group rotation={[0, Math.PI / 8, 0]}>
          {/* Frame in front */}
          <group position={[0, 0, 0.8]}>
            <FrameModel
              color={config.frameColor}
              style={config.frameStyle}
              size={config.size}
              mount={config.mount}
              mountColor={config.mountColor}
              glaze={config.glaze}
              wrap={config.wrap}
              productType={config.productType}
              finish={config.finish}
              edge={config.edge}
              canvasType={config.canvasType}
              useTextures={false}
            />
          </group>
          {/* Artwork behind */}
          <group position={[0, 0, -0.8]}>
            <ArtworkPlane 
              imageUrl={config.imageUrl || ''} 
              size={config.size}
              hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
              mount={config.mount}
            />
          </group>
        </group>
        
        <OrbitControls enabled={false} />
      </Suspense>
    </Canvas>
  );
}

// Thumbnail scene for room view
function RoomThumbnail({ config }: { config: FrameConfiguration }) {
  return (
    <Canvas className="w-full h-full" dpr={[1, 1.5]}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={60} />
        <ambientLight intensity={0.6} />
        <spotLight position={[3, 3, 3]} intensity={0.5} />
        <Environment preset="apartment" />
        
        {/* Small frame in center representing room view */}
        <group scale={0.6}>
          <ArtworkPlane 
            imageUrl={config.imageUrl || ''} 
            size={config.size}
            hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
            mount={config.mount}
          />
          <FrameModel
            color={config.frameColor}
            style={config.frameStyle}
            size={config.size}
            mount={config.mount}
            mountColor={config.mountColor}
            glaze={config.glaze}
            wrap={config.wrap}
            productType={config.productType}
            finish={config.finish}
            edge={config.edge}
            canvasType={config.canvasType}
            useTextures={false}
          />
        </group>
        
        <OrbitControls enabled={false} />
      </Suspense>
    </Canvas>
  );
}

export function ViewModeSelector({ mode, onChange, config }: ViewModeSelectorProps) {
  const modes: Array<{ 
    value: ViewMode; 
    label: string; 
    description: string;
    renderThumbnail: () => React.ReactElement;
  }> = [
    { 
      value: '3d', 
      label: '3D Preview', 
      description: 'Interactive 3D view',
      renderThumbnail: () => <ThreeDThumbnail config={config} />
    },
    { 
      value: 'exploded', 
      label: 'Components', 
      description: 'See frame layers',
      renderThumbnail: () => <ExplodedThumbnail config={config} />
    },
    { 
      value: 'room', 
      label: 'In Room', 
      description: 'See in your space',
      renderThumbnail: () => <RoomThumbnail config={config} />
    },
    { 
      value: 'unboxing', 
      label: 'Unboxing', 
      description: 'What to expect',
      renderThumbnail: () => (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    },
  ];

  return (
    <>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`
            group relative overflow-hidden rounded-lg transition-all
            lg:w-32 lg:h-28 w-24 h-20
            ${
              mode === m.value
                ? 'ring-2 ring-black ring-offset-2 shadow-lg scale-105'
                : 'ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow-md'
            }
          `}
          title={m.label}
        >
          {/* Thumbnail Preview */}
          <div className="absolute inset-0 bg-white">
            {m.renderThumbnail()}
          </div>
          
          {/* Overlay with label */}
          <div className={`
            absolute inset-x-0 bottom-0 p-2 transition-all
            ${
              mode === m.value
                ? 'bg-black/80'
                : 'bg-gradient-to-t from-black/60 to-transparent group-hover:from-black/70'
            }
          `}>
            <div className="text-white text-xs font-medium leading-tight">
              {m.label}
            </div>
            <div className="text-white/80 text-[10px] leading-tight mt-0.5 hidden lg:block">
              {m.description}
            </div>
          </div>
        </button>
      ))}
    </>
  );
}

