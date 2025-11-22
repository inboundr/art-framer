/**
 * Frame Model Component
 * Generates 3D frame geometry and materials
 */

'use client';

import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface FrameModelProps {
  color: string;
  style: string;
  size: string;
  mount?: string;
  mountColor?: string;
  glaze?: string;
  wrap?: string;
  productType?: string;
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
}: FrameModelProps) {
  // Parse size
  const [widthInches, heightInches] = size.split('x').map(Number);
  const width = (widthInches || 16) / 12; // Convert to feet (Three.js units)
  const height = (heightInches || 20) / 12;

  // Determine if we should show a frame based on product type
  const showFrame = ['framed-print', 'framed-canvas'].includes(productType);
  const showMount = productType === 'framed-print' && mount && mount !== 'none';
  // IMPORTANT: Framed canvas does NOT support glaze in Prodigi!
  const showGlaze = ['framed-print', 'acrylic'].includes(productType) && glaze && glaze !== 'none';

  // Frame geometry
  const frameGeometry = useMemo(() => {
    return createFrameGeometry(width, height, style);
  }, [width, height, style]);

  // Frame material
  const frameMaterial = useMemo(() => {
    // Comprehensive color mapping for all Prodigi frame colors
    const colorMap: Record<string, string> = {
      // Basic colors
      'black': '#000000',
      'white': '#FFFFFF',
      'natural': '#C19A6B',
      'brown': '#654321',
      'dark brown': '#3E2723',
      'light brown': '#8D6E63',
      
      // Metallics
      'gold': '#FFD700',
      'silver': '#C0C0C0',
      'copper': '#B87333',
      'bronze': '#CD7F32',
      
      // Greys
      'grey': '#808080',
      'gray': '#808080',
      'dark grey': '#555555',
      'dark gray': '#555555',
      'light grey': '#CCCCCC',
      'light gray': '#CCCCCC',
      'charcoal': '#36454F',
      
      // Woods
      'oak': '#B7A57A',
      'walnut': '#5C4033',
      'mahogany': '#C04000',
      'cherry': '#9A463D',
      'maple': '#D4AA78',
      
      // Other
      'cream': '#FFFDD0',
      'beige': '#F5F5DC',
      'ivory': '#FFFFF0',
    };

    // Case-insensitive lookup
    const colorLower = color.toLowerCase();
    const hexColor = colorMap[colorLower] || '#000000';
    
    // Determine material properties based on color type
    const isMetallic = ['gold', 'silver', 'copper', 'bronze'].includes(colorLower);
    
    const materialConfig: any = {
      color: hexColor,
      metalness: isMetallic ? 0.8 : 0.1,
      roughness: isMetallic ? 0.3 : 0.5,
    };

    return new THREE.MeshStandardMaterial(materialConfig);
  }, [color]);

  // Mount/Mat geometry (if present)
  const mountGeometry = useMemo(() => {
    if (!mount || mount === 'none') return null;

    const mountWidth = width + 0.1; // Slightly larger than artwork
    const mountHeight = height + 0.1;

    return new THREE.PlaneGeometry(mountWidth, mountHeight);
  }, [mount, width, height]);

  // Mount material
  const mountMaterial = useMemo(() => {
    if (!mountGeometry) return null;

    // Comprehensive mount color mapping
    const colorMap: Record<string, string> = {
      'white': '#FFFFFF',
      'off-white': '#F8F8F0',
      'off white': '#F8F8F0',
      'offwhite': '#F8F8F0',
      'snow white': '#FFFAFA',
      'cream': '#FFFDD0',
      'ivory': '#FFFFF0',
      'black': '#000000',
      'grey': '#D3D3D3',
      'gray': '#D3D3D3',
      'light grey': '#E8E8E8',
      'light gray': '#E8E8E8',
    };

    // Case-insensitive lookup
    const colorLower = (mountColor || 'white').toLowerCase();
    const hexColor = colorMap[colorLower] || '#FFFFFF';

    return new THREE.MeshStandardMaterial({
      color: hexColor,
      roughness: 0.8,
      metalness: 0.0,
    });
  }, [mountColor, mountGeometry]);

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

  // For canvas products, create edge geometries and back panel
  // IMPORTANT: Including wrap in dependencies ensures edges update when wrap changes
  const canvasEdges = useMemo(() => {
    if (!['canvas', 'framed-canvas'].includes(productType)) return null;
    
    const edgeDepth = 0.08; // Canvas depth (how thick the canvas is)
    const edgeThickness = 0.01; // How thick each edge strip is
    
    // Comprehensive wrap color mapping (case-insensitive)
    const wrapColorMap: Record<string, string> = {
      'black': '#000000',
      'white': '#FFFFFF',
      'imagewrap': '#606060', // Dark gray to indicate image wraps around
      'mirrorwrap': '#909090', // Light gray to indicate mirror effect
    };
    
    // Case-insensitive lookup
    const wrapLower = (wrap || 'Black').toLowerCase();
    const color = wrapColorMap[wrapLower] || '#000000';
    
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.0,
    });
    
    // Back panel material (canvas backing)
    const backMaterial = new THREE.MeshStandardMaterial({
      color: '#D4C4B0', // Canvas backing color (beige)
      roughness: 0.9,
      metalness: 0.0,
    });
    
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
  }, [productType, width, height, wrap]); // wrap is in dependencies!

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

      {/* Mount/Mat */}
      {showMount && mountGeometry && mountMaterial && (
        <mesh
          geometry={mountGeometry}
          material={mountMaterial}
          position={[0, 0, -0.02]}
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

