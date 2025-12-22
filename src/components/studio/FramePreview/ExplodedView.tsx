/**
 * Exploded View Component
 * Shows frame components separated with perspective
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useRef, useEffect } from 'react';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';
import type { FrameConfiguration } from '@/store/studio';

interface ExplodedViewProps {
  config: FrameConfiguration;
  autoRotate?: boolean;
  resetTrigger?: number;
}

// Component to handle OrbitControls with reset functionality
function CameraControls({ autoRotate = false, resetTrigger = 0 }: { autoRotate?: boolean; resetTrigger?: number }) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      minDistance={3}
      maxDistance={10}
      autoRotate={autoRotate}
      autoRotateSpeed={0.3}
    />
  );
}

export function ExplodedView({ config, autoRotate = false, resetTrigger = 0 }: ExplodedViewProps) {
  // Determine product type structure
  const isFramedCanvas = config.productType === 'framed-canvas';
  const isCanvas = config.productType === 'canvas' || config.productType === 'poster';
  const isAcrylicOrMetal = config.productType === 'acrylic' || config.productType === 'metal';
  
  // FRAMED CANVAS has 2 separate pieces:
  // 1. Canvas with printed image + edges (wrap color) - FRONT
  // 2. Decorative frame (frame color) - BACK
  
  // REGULAR CANVAS has 1 piece only:
  // - Canvas with printed image + edges (wrap color) - ONE COMPLETE PIECE
  // - No separation needed (image is printed ON the canvas)
  
  // ACRYLIC/METAL PRINT has 1 piece only:
  // - Image printed directly ON acrylic/metal surface - ONE COMPLETE PIECE
  // - No frame, no layers, just the printed material
  
  // FRAMED PRINT has 2 layers:
  // 1. Frame with glass - FRONT
  // 2. Print with mount - BACK
  
  return (
    <div className="relative w-full h-full">
      {/* Info Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          {isFramedCanvas 
            ? 'Framed Canvas Structure' 
            : isCanvas 
              ? 'Canvas Product' 
              : isAcrylicOrMetal
                ? `${config.productType === 'acrylic' ? 'Acrylic' : 'Metal'} Print`
                : 'Frame Layers'
          }
        </h3>
        <p className="text-xs text-gray-600">
          {isFramedCanvas 
            ? 'Canvas with your image (front) sits inside the decorative frame (back)'
            : isCanvas 
              ? 'Your image is printed directly on canvas - one complete piece'
              : isAcrylicOrMetal
                ? `Your image is printed directly on ${config.productType} - one complete piece`
                : 'See how the layers stack together - from frame to artwork'
          }
        </p>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        className="w-full h-full"
      >
        <Suspense fallback={<LoadingPlaceholder />}>
          {/* Camera positioned at an angle to see depth */}
          <PerspectiveCamera makeDefault position={[2, 1.5, 5]} fov={45} />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
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

          {isFramedCanvas ? (
            // FRAMED CANVAS: Canvas+Image (front), Decorative Frame (back)
            <group rotation={[0, Math.PI / 8, 0]}>
              {/* Canvas with printed image AND edges (wrap color) - in front */}
              <group position={[0, 0, 1.8]}>
                {/* The image on the canvas */}
                <ArtworkPlane 
                  imageUrl={config.imageUrl || ''} 
                  size={config.size}
                  hasMount={false}
                  mount={undefined}
                />
                {/* Canvas edges showing wrap color - render as canvas product to show edges */}
                <FrameModel
                  key={`canvas-edges-${config.wrap}-${config.size}-${config.edge}`}
                  color={config.frameColor}
                  style={config.frameStyle}
                  size={config.size}
                  mount={undefined}
                  mountColor={undefined}
                  glaze="none"
                  wrap={config.wrap}
                  productType="canvas" // Render as canvas to show only edges, not frame
                  finish={config.finish}
                  edge={config.edge}
                  canvasType={config.canvasType}
                  useTextures={false}
                />
              </group>
              
              {/* Decorative frame (frame color) - behind */}
              <group position={[0, 0, -1.2]}>
                {/* Render only the decorative frame part */}
                <FrameModel
                  key={`frame-only-${config.frameColor}-${config.frameStyle}-${config.size}`}
                  color={config.frameColor}
                  style={config.frameStyle}
                  size={config.size}
                  mount={undefined}
                  mountColor={undefined}
                  glaze="none"
                  wrap={undefined} // No wrap - this is just the decorative frame
                  productType="framed-print" // Render as framed-print to show only frame, no canvas edges
                  finish={config.finish}
                  edge={undefined}
                  canvasType={undefined}
                  useTextures={false}
                />
              </group>
            </group>
          ) : isCanvas ? (
            // REGULAR CANVAS: Single unified piece (image printed on canvas)
            // No separation needed - canvas is ONE complete product
            <group rotation={[0, Math.PI / 8, 0]}>
              {/* Complete canvas product: Image + Canvas edges all together */}
              <group position={[0, 0, 0]}>
                {/* The printed image */}
                <ArtworkPlane 
                  imageUrl={config.imageUrl || ''} 
                  size={config.size}
                  hasMount={false}
                  mount={undefined}
                />
                {/* Canvas edges (wrap color) - part of the same piece */}
                <FrameModel
                  key={`canvas-complete-${config.wrap}-${config.size}-${config.edge}-${config.canvasType}`}
                  color={config.frameColor}
                  style={config.frameStyle}
                  size={config.size}
                  mount={undefined}
                  mountColor={undefined}
                  glaze="none"
                  wrap={config.wrap}
                  productType={config.productType}
                  finish={config.finish}
                  edge={config.edge}
                  canvasType={config.canvasType}
                  useTextures={false}
                />
              </group>
            </group>
          ) : isAcrylicOrMetal ? (
            // ACRYLIC/METAL PRINT: Single unified piece (image printed on material)
            // No frame, no layers - just the printed surface
            <group rotation={[0, Math.PI / 8, 0]}>
              {/* Complete acrylic/metal product: Image printed on surface */}
              <group position={[0, 0, 0]}>
                {/* The image printed on acrylic/metal */}
                <ArtworkPlane 
                  imageUrl={config.imageUrl || ''} 
                  size={config.size}
                  hasMount={false}
                  mount={undefined}
                />
                {/* The acrylic/metal material backing */}
                <FrameModel
                  key={`${config.productType}-complete-${config.finish}-${config.size}`}
                  color={config.frameColor}
                  style={config.frameStyle}
                  size={config.size}
                  mount={undefined}
                  mountColor={undefined}
                  glaze="none"
                  wrap={undefined}
                  productType={config.productType}
                  finish={config.finish}
                  edge={undefined}
                  canvasType={undefined}
                  useTextures={false}
                />
              </group>
            </group>
          ) : (
            // FRAMED PRINT: Frame with glass (front), Print behind
            <group rotation={[0, Math.PI / 8, 0]}>
              {/* Frame with glass - in front */}
              <group position={[0, 0, 1.5]}>
                <FrameModel
                  key={`exploded-${config.productType}-${config.frameColor}-${config.frameStyle}-${config.glaze}-${config.size}-${config.mount}-${config.mountColor}`}
                  color={config.frameColor}
                  style={config.frameStyle}
                  size={config.size}
                  mount={config.mount}
                  mountColor={config.mountColor}
                  glaze={config.glaze}
                  wrap={undefined}
                  productType={config.productType}
                  finish={config.finish}
                  edge={undefined}
                  canvasType={undefined}
                  useTextures={false}
                />
              </group>
              
              {/* Print (with optional mount) - behind frame */}
              <group position={[0, 0, -1.5]}>
                <ArtworkPlane 
                  imageUrl={config.imageUrl || ''} 
                  size={config.size}
                  hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
                  mount={config.mount}
                />
              </group>
            </group>
          )}

          {/* Shadows */}
          <ContactShadows
            position={[0, -2, 0]}
            opacity={0.3}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Controls with reset functionality */}
          <CameraControls autoRotate={autoRotate} resetTrigger={resetTrigger} />
        </Suspense>
      </Canvas>
    </div>
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

