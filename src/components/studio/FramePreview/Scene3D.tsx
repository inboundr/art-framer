/**
 * 3D Scene Component
 * Renders frame and artwork using Three.js
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';
import type { FrameConfiguration } from '@/store/studio';

interface Scene3DProps {
  config: FrameConfiguration;
}

export function Scene3D({ config }: Scene3DProps) {
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
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Environment */}
        <Environment preset="studio" />

        {/* Content */}
        <group>
          {/* Artwork */}
          <ArtworkPlane imageUrl={config.imageUrl || ''} size={config.size} />
          
          {/* Frame */}
          <FrameModel
            color={config.frameColor}
            style={config.frameStyle}
            size={config.size}
            mount={config.mount}
            mountColor={config.mountColor}
            glaze={config.glaze}
            wrap={config.wrap}
          />
        </group>

        {/* Shadows */}
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />

        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
          minDistance={3}
          maxDistance={8}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
}

function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#cccccc" />
    </mesh>
  );
}

