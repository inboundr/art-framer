/**
 * Exploded View Component
 * Shows frame components separated with perspective
 */

'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useRef, useEffect, useState } from 'react';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';
import type { FrameConfiguration } from '@/store/studio';
import * as THREE from 'three';

interface ExplodedViewProps {
  config: FrameConfiguration;
  autoRotate?: boolean;
  resetTrigger?: number;
}

// Component to handle OrbitControls with reset functionality and focus
function CameraControls({ 
  autoRotate = false, 
  resetTrigger = 0,
  focusPosition = null 
}: { 
  autoRotate?: boolean; 
  resetTrigger?: number;
  focusPosition?: [number, number, number] | null;
}) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetTrigger]);

  // Focus camera on specific position when hotspot is clicked
  useEffect(() => {
    if (focusPosition && controlsRef.current) {
      const [x, y, z] = focusPosition;
      
      // Smoothly animate camera to look at the target
      const targetPosition = new THREE.Vector3(x, y, z);
      controlsRef.current.target.copy(targetPosition);
      
      // Move camera closer to the target
      const cameraOffset = new THREE.Vector3(x + 2, y + 1, z + 3);
      camera.position.lerp(cameraOffset, 0.1);
      
      controlsRef.current.update();
    }
  }, [focusPosition, camera]);

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

// Hotspot data type
interface Hotspot {
  id: string;
  position3D: [number, number, number]; // 3D world position
  label: string;
  description: string;
}

// Component to track 3D positions and convert to 2D screen coordinates
function HotspotMarker({ 
  position, 
  onPositionUpdate 
}: { 
  position: [number, number, number];
  onPositionUpdate: (screenPos: { x: number; y: number }) => void;
}) {
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const updateScreenPosition = () => {
      if (!meshRef.current) return;

      const vector = new THREE.Vector3(...position);
      vector.project(camera);

      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-(vector.y * 0.5) + 0.5) * size.height;

      onPositionUpdate({ x, y });
    };

    updateScreenPosition();
    
    // Update on every frame to handle camera movement
    const interval = setInterval(updateScreenPosition, 16); // ~60fps
    
    return () => clearInterval(interval);
  }, [camera, size, position, onPositionUpdate]);

  // Invisible marker mesh at the 3D position
  return (
    <mesh ref={meshRef} position={position} visible={false}>
      <sphereGeometry args={[0.01]} />
    </mesh>
  );
}

export function ExplodedView({ config, autoRotate = false, resetTrigger = 0 }: ExplodedViewProps) {
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [focusPosition, setFocusPosition] = useState<[number, number, number] | null>(null);
  const [hotspotPositions, setHotspotPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Determine product type structure
  const isFramedCanvas = config.productType === 'framed-canvas';
  const isCanvas = config.productType === 'canvas' || config.productType === 'poster';
  const isAcrylicOrMetal = config.productType === 'acrylic' || config.productType === 'metal';
  
  // Define hotspots based on product type with 3D positions
  const hotspots: Hotspot[] = (() => {
    if (isFramedCanvas) {
      return [
        {
          id: 'canvas',
          position3D: [0, 0, 1.8], // Front layer position
          label: 'Canvas with Image',
          description: 'Your artwork is printed on high-quality canvas, wrapped around wooden stretcher bars'
        },
        {
          id: 'frame',
          position3D: [0, 0, -1.2], // Back layer position
          label: 'Decorative Frame',
          description: 'L-shaped frame that holds the canvas, available in various colors and finishes'
        }
      ];
    }
    
    if (isCanvas) {
      return [
        {
          id: 'canvas-complete',
          position3D: [0, 0, 0], // Center position
          label: 'Canvas Print',
          description: 'Your image is printed directly on canvas and wrapped around the frame - one complete piece'
        }
      ];
    }
    
    if (isAcrylicOrMetal) {
      return [
        {
          id: 'print-complete',
          position3D: [0, 0, 0], // Center position
          label: `${config.productType === 'acrylic' ? 'Acrylic' : 'Metal'} Print`,
          description: `Your image is printed directly on ${config.productType} material for a modern, premium look`
        }
      ];
    }
    
    // Framed Print (default)
    return [
      {
        id: 'frame-glass',
        position3D: [0, 0, 1.5], // Front layer position
        label: 'Frame & Glass',
        description: 'Protective glass or acrylic glaze in your chosen frame style and color'
      },
      {
        id: 'print-mount',
        position3D: [0, 0, -1.5], // Back layer position
        label: 'Print & Mount',
        description: 'Your artwork with optional mount (mat board) for added depth and elegance'
      }
    ];
  })();

  const handleHotspotClick = (hotspot: Hotspot) => {
    setFocusPosition(hotspot.position3D);
    // Reset focus after animation
    setTimeout(() => setFocusPosition(null), 2000);
  };

  const updateHotspotPosition = (id: string, screenPos: { x: number; y: number }) => {
    setHotspotPositions(prev => ({
      ...prev,
      [id]: screenPos
    }));
  };
  
  return (
    <div className="relative w-full h-full">
      {/* Interactive Hotspots - positioned using 3D-to-2D projection */}
      {hotspots.map((hotspot) => {
        const screenPos = hotspotPositions[hotspot.id];
        if (!screenPos) return null; // Don't render until position is calculated

        return (
          <div
            key={hotspot.id}
            className="absolute z-20 pointer-events-auto"
            style={{ 
              left: `${screenPos.x}px`, 
              top: `${screenPos.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={() => setHoveredHotspot(hotspot.id)}
            onMouseLeave={() => setHoveredHotspot(null)}
          >
            {/* Plus Button */}
            <button
              onClick={() => handleHotspotClick(hotspot)}
              className={`
                w-10 h-10 rounded-full bg-white shadow-lg border-2 
                flex items-center justify-center transition-all duration-200
                ${hoveredHotspot === hotspot.id 
                  ? 'border-black scale-110 shadow-xl' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              aria-label={hotspot.label}
            >
              <svg 
                className="w-5 h-5 text-gray-700" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
            </button>

            {/* Tooltip on Hover */}
            {hoveredHotspot === hotspot.id && (
              <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 w-64 pointer-events-none z-30">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-3 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {hotspot.label}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {hotspot.description}
                  </p>
                  {/* Arrow pointing up */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45" />
                </div>
              </div>
            )}
          </div>
        );
      })}

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

          {/* Invisible markers to track 3D positions and convert to 2D screen coordinates */}
          {/* Apply same rotation as the content group */}
          <group rotation={[0, Math.PI / 8, 0]}>
            {hotspots.map((hotspot) => (
              <HotspotMarker
                key={hotspot.id}
                position={hotspot.position3D}
                onPositionUpdate={(screenPos) => updateHotspotPosition(hotspot.id, screenPos)}
              />
            ))}
          </group>

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
          <CameraControls autoRotate={autoRotate} resetTrigger={resetTrigger} focusPosition={focusPosition} />
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

