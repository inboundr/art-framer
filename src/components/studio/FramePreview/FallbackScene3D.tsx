/**
 * Fallback Scene3D Component
 * Renders the frame with color-based materials when textures fail to load
 * This ensures the 3D preview always works, even without textures
 */

'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';
import type { FrameConfiguration } from '@/store/studio';

interface FallbackScene3DProps {
  config: FrameConfiguration;
  autoRotate?: boolean;
  resetTrigger?: number;
}

function CameraControls({ autoRotate = false, resetTrigger = 0 }: { autoRotate?: boolean; resetTrigger?: number }) {
  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={3}
      maxDistance={10}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
    />
  );
}

function LoadingPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <div className="text-4xl mb-4">⏳</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Loading Preview
        </h3>
        <p className="text-sm text-gray-600">
          Loading frame preview...
        </p>
      </div>
    </div>
  );
}

/**
 * Fallback Scene3D that renders with color-based materials
 * This is used when texture loading fails, ensuring the preview always works
 */
export function FallbackScene3D({ config, autoRotate = false, resetTrigger = 0 }: FallbackScene3DProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      className="w-full h-full"
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Environment */}
        <Environment preset="studio" />

        {/* Content - Render with textures disabled to use fallback materials */}
        <group>
          {/* Artwork */}
          <ArtworkPlane 
            imageUrl={config.imageUrl || ''} 
            size={config.size}
            hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
            mount={config.mount}
          />
          
          {/* Frame - Key prop forces re-render when critical config changes */}
          {/* IMPORTANT: useTextures={false} ensures we use color-based fallback materials */}
          {/* This prevents texture loading errors from crashing the preview */}
          <FrameModel
            key={`fallback-${config.productType}-${config.frameColor}-${config.frameStyle}-${config.wrap}-${config.glaze}-${config.size}-${config.mount}-${config.mountColor}-${config.edge}-${config.canvasType}`}
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
            useTextures={false} // Disable textures for fallback rendering
          />
        </group>

        {/* Shadows */}
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4.5}
          resolution={256}
        />

        {/* Camera Controls */}
        <CameraControls autoRotate={autoRotate} resetTrigger={resetTrigger} />
      </Suspense>
    </Canvas>
  );
}

