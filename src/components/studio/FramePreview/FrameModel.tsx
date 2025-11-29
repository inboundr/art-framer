/**
 * Frame Model Component
 * Generates 3D frame geometry and materials
 */

'use client';

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useFrameMaterial } from '@/hooks/useFrameMaterial';
import { useMountTexture } from '@/hooks/useMountTexture';
import { useCanvasTexture } from '@/hooks/useCanvasTexture';
import type { FrameType } from '@/lib/prodigi-textures/texture-mapper';

interface FrameModelProps {
  color: string;
  style: string;
  size: string;
  mount?: string;
  mountColor?: string;
  glaze?: string;
  wrap?: string;
  productType?: string;
  finish?: string;
}

export function FrameModel({
  color,
  style,
  size,
  mount,
  mountColor,
  glaze,
  wrap,
  productType = 'framed-print',
  finish,
}: FrameModelProps) {
  // Parse size
  const [widthInches, heightInches] = size.split('x').map(Number);
  const width = (widthInches || 16) / 12; // Convert to feet (Three.js units)
  const height = (heightInches || 20) / 12;

  // Determine if we should show a frame based on product type
  const showFrame = ['framed-print', 'framed-canvas'].includes(productType);
  const showMount = productType === 'framed-print' && !!mount && mount !== 'none';
  // IMPORTANT: Framed canvas does NOT support glaze in Prodigi!
  const showGlaze = ['framed-print', 'acrylic'].includes(productType) && !!glaze && glaze !== 'none';

  // Determine frame type from style
  const frameType: FrameType = useMemo(() => {
    const styleLower = style.toLowerCase();
    if (styleLower.includes('aluminium') || styleLower.includes('aluminum')) {
      return 'aluminium';
    }
    if (styleLower.includes('box')) {
      return 'box';
    }
    if (styleLower.includes('spacer')) {
      return 'spacer';
    }
    if (styleLower.includes('float')) {
      return 'float';
    }
    return 'classic'; // Default to classic
  }, [style]);

  // Frame geometry
  const frameGeometry = useMemo(() => {
    return createFrameGeometry(width, height, style);
  }, [width, height, style]);

  // Frame material using Prodigi textures
  const {
    material: frameMaterial,
    isLoading: frameMaterialLoading,
    hasTextures: frameHasTextures,
  } = useFrameMaterial({
    frameType,
    color,
    style,
    useTextures: true, // Enable texture loading
  });

  // Mount/Mat geometry (if present)
  // A mount is a border around the artwork with a window cutout (like a picture mat)
  const mountGeometry = useMemo(() => {
    if (!mount || mount === 'none') return null;

    // Mount extends beyond the frame - typical mount border width
    const mountBorderWidth = 0.15; // Mount border width in Three.js units
    const outerWidth = width + mountBorderWidth * 2;
    const outerHeight = height + mountBorderWidth * 2;

    // Create shape with hole (like frame geometry)
    const shape = new THREE.Shape();
    // Outer rectangle
    shape.moveTo(-outerWidth / 2, -outerHeight / 2);
    shape.lineTo(outerWidth / 2, -outerHeight / 2);
    shape.lineTo(outerWidth / 2, outerHeight / 2);
    shape.lineTo(-outerWidth / 2, outerHeight / 2);
    shape.lineTo(-outerWidth / 2, -outerHeight / 2);

    // Inner rectangle (hole for artwork) - slightly smaller than artwork for reveal
    const reveal = 0.01; // Small reveal around artwork
    const hole = new THREE.Path();
    hole.moveTo(-width / 2 - reveal, -height / 2 - reveal);
    hole.lineTo(width / 2 + reveal, -height / 2 - reveal);
    hole.lineTo(width / 2 + reveal, height / 2 + reveal);
    hole.lineTo(-width / 2 - reveal, height / 2 + reveal);
    hole.lineTo(-width / 2 - reveal, -height / 2 - reveal);
    shape.holes.push(hole);

    // Extrude to give mount some thickness
    const mountThickness = 0.01; // Thin mount board
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: mountThickness,
      bevelEnabled: false,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [mount, width, height]);

  // Mount material using Prodigi textures
  const {
    texture: mountTexture,
    fallbackColor: mountFallbackColor,
  } = useMountTexture({
    color: mountColor || 'white',
    enabled: showMount,
  });

  const mountMaterial = useMemo(() => {
    if (!mountGeometry || !showMount) return null;

    // Build material config - only include map if texture exists
    const mountMaterialConfig: any = {
      color: mountFallbackColor,
      roughness: 0.8,
      metalness: 0.0,
    };
    
    if (mountTexture) {
      mountMaterialConfig.map = mountTexture;
    }

    return new THREE.MeshStandardMaterial(mountMaterialConfig);
  }, [mountGeometry, mountTexture, mountFallbackColor, showMount]);

  // Glaze geometry and material
  const glazeGeometry = useMemo(() => {
    if (!glaze || glaze === 'none') return null;

    return new THREE.PlaneGeometry(width, height);
  }, [glaze, width, height]);

  const glazeMaterial = useMemo(() => {
    if (!glazeGeometry) return null;

    // Different materials for different glaze types
    const glazeType = glaze?.toLowerCase() || 'acrylic';
    
    // Motheye: Ultra-clear, anti-reflective (99% UV protection)
    if (glazeType === 'motheye') {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.02, // Ultra-smooth, almost no reflection
        transmission: 0.95, // Very transparent
        thickness: 0.3,
        clearcoat: 0.5, // Less reflective coating
        clearcoatRoughness: 0.05,
        ior: 1.5, // Index of refraction for glass
      });
    }
    
    // Acrylic / Perspex: Clear plastic, slight reflectivity
    if (glazeType === 'acrylic' || glazeType.includes('perspex')) {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.49, // Acrylic IOR
      });
    }
    
    // Float Glass: Regular glass, more reflective
    if (glazeType.includes('glass')) {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.05,
        transmission: 0.92,
        thickness: 0.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        ior: 1.52, // Glass IOR
        reflectivity: 0.5, // More reflective than acrylic
      });
    }
    
    // Default: Acrylic
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
  }, [glaze, glazeGeometry]);

  // Create special material for acrylic and metal
  // IMPORTANT: Pass finish to get proper material variations
  const specialMaterial = useMemo(() => {
    if (productType === 'acrylic') {
      // Acrylic finish affects roughness
      const isGlossy = !style || style.toLowerCase().includes('gloss');
      
      return new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: isGlossy ? 0.05 : 0.15,
        transmission: 0.1,
        thickness: 0.3,
        clearcoat: 1.0,
        clearcoatRoughness: isGlossy ? 0.05 : 0.15,
        ior: 1.49, // Acrylic IOR
      });
    }
    
    if (productType === 'metal') {
      // Metal finish affects roughness
      const isGlossy = !style || style.toLowerCase().includes('gloss');
      
      return new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        metalness: 0.9,
        roughness: isGlossy ? 0.2 : 0.5,
        envMapIntensity: 1.5, // Enhanced reflections for metal
      });
    }
    
    return null;
  }, [productType, style]);

  // Canvas textures
  const wrapType = useMemo(() => {
    if (!wrap) return undefined;
    const wrapLower = wrap.toLowerCase();
    if (wrapLower.includes('image')) return 'image' as const;
    if (wrapLower.includes('mirror')) return 'mirror' as const;
    if (wrapLower.includes('white')) return 'white' as const;
    return 'black' as const;
  }, [wrap]);

  const {
    substrateTexture,
    wrapTexture,
  } = useCanvasTexture({
    substrateType: 'substrate',
    wrapType,
    enabled: ['canvas', 'framed-canvas'].includes(productType),
  });

  // For canvas products, create edge geometries and back panel
  // IMPORTANT: Including wrap in dependencies ensures edges update when wrap changes
  const canvasEdges = useMemo(() => {
    if (!['canvas', 'framed-canvas'].includes(productType)) return null;
    
    const edgeDepth = 0.08; // Canvas depth (how thick the canvas is)
    const edgeThickness = 0.01; // How thick each edge strip is
    
    // Use wrap texture if available, otherwise fallback to color
    const wrapColorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'imagewrap': '#606060', // Dark gray to indicate image wraps around
      'mirrorwrap': '#909090', // Light gray to indicate mirror effect
    };
    
    const wrapLower = (wrap || 'Black').toLowerCase();
    const fallbackColor = wrapColorMap[wrapLower] || '#000000';
    
    // Build edge material config - only include map if texture exists
    const edgeMaterialConfig: any = {
      color: fallbackColor,
      roughness: 0.7,
      metalness: 0.0,
    };
    if (wrapTexture) {
      edgeMaterialConfig.map = wrapTexture;
    }
    const edgeMaterial = new THREE.MeshStandardMaterial(edgeMaterialConfig);
    
    // Back panel material (canvas backing) - use substrate texture if available
    const backMaterialConfig: any = {
      color: '#D4C4B0', // Canvas backing color (beige)
      roughness: 0.9,
      metalness: 0.0,
    };
    if (substrateTexture) {
      backMaterialConfig.map = substrateTexture;
    }
    const backMaterial = new THREE.MeshStandardMaterial(backMaterialConfig);
    
    // Create 4 edge strips (top, bottom, left, right) + back panel
    return [
      // Top edge
      {
        geometry: new THREE.BoxGeometry(width, edgeThickness, edgeDepth),
        position: [0, height / 2, -edgeDepth / 2] as [number, number, number],
        material: edgeMaterial,
        key: `top-${wrap}`, // Key for React to track changes
      },
      // Bottom edge
      {
        geometry: new THREE.BoxGeometry(width, edgeThickness, edgeDepth),
        position: [0, -height / 2, -edgeDepth / 2] as [number, number, number],
        material: edgeMaterial,
        key: `bottom-${wrap}`,
      },
      // Left edge
      {
        geometry: new THREE.BoxGeometry(edgeThickness, height, edgeDepth),
        position: [-width / 2, 0, -edgeDepth / 2] as [number, number, number],
        material: edgeMaterial,
        key: `left-${wrap}`,
      },
      // Right edge
      {
        geometry: new THREE.BoxGeometry(edgeThickness, height, edgeDepth),
        position: [width / 2, 0, -edgeDepth / 2] as [number, number, number],
        material: edgeMaterial,
        key: `right-${wrap}`,
      },
      // Back panel
      {
        geometry: new THREE.PlaneGeometry(width - edgeThickness * 2, height - edgeThickness * 2),
        position: [0, 0, -edgeDepth] as [number, number, number],
        material: backMaterial,
        key: 'back',
      },
    ];
  }, [productType, width, height, wrap, wrapTexture, substrateTexture]); // wrap and textures in dependencies!

  return (
    <group>
      {/* Frame (only for framed products) */}
      {showFrame && (
        <mesh
          geometry={frameGeometry}
          material={frameMaterial}
          castShadow
          position={[0, 0, -0.05]}
        />
      )}

      {/* Mount/Mat - positioned between frame and artwork */}
      {showMount && mountGeometry && mountMaterial && (
        <mesh
          geometry={mountGeometry}
          material={mountMaterial}
          position={[0, 0, -0.03]}
        />
      )}

      {/* Glaze */}
      {showGlaze && glazeGeometry && glazeMaterial && (
        <mesh geometry={glazeGeometry} material={glazeMaterial} position={[0, 0, 0.01]} />
      )}

      {/* Canvas edges (4 sides showing wrap color) */}
      {canvasEdges && canvasEdges.map((edge) => (
        <mesh
          key={edge.key}
          geometry={edge.geometry}
          material={edge.material}
          position={edge.position}
        />
      ))}

      {/* Special material overlay for acrylic/metal */}
      {specialMaterial && (
        <mesh
          geometry={new THREE.PlaneGeometry(width, height)}
          material={specialMaterial}
          position={[0, 0, 0.02]}
        />
      )}
    </group>
  );
}

/**
 * Create frame geometry based on style
 */
function createFrameGeometry(
  width: number,
  height: number,
  style: string
): THREE.ExtrudeGeometry {
  const frameWidth = 0.08; // Frame border width
  const depth = style === 'ornate' ? 0.12 : 0.08;

  // Outer rectangle
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 - frameWidth, -height / 2 - frameWidth);
  shape.lineTo(width / 2 + frameWidth, -height / 2 - frameWidth);
  shape.lineTo(width / 2 + frameWidth, height / 2 + frameWidth);
  shape.lineTo(-width / 2 - frameWidth, height / 2 + frameWidth);
  shape.lineTo(-width / 2 - frameWidth, -height / 2 - frameWidth);

  // Inner rectangle (hole for artwork)
  const hole = new THREE.Path();
  hole.moveTo(-width / 2, -height / 2);
  hole.lineTo(width / 2, -height / 2);
  hole.lineTo(width / 2, height / 2);
  hole.lineTo(-width / 2, height / 2);
  hole.lineTo(-width / 2, -height / 2);

  shape.holes.push(hole);

  // Extrude settings based on style
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth,
    bevelEnabled: style !== 'modern',
    bevelThickness: style === 'ornate' ? 0.015 : 0.008,
    bevelSize: style === 'ornate' ? 0.015 : 0.008,
    bevelSegments: style === 'ornate' ? 8 : 2,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

