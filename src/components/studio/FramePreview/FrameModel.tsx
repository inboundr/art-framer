/**
 * Frame Model Component
 * Generates 3D frame geometry and materials
 */

'use client';

import { useMemo, useEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useFrameMaterial } from '@/hooks/useFrameMaterial';
import { useMountTexture } from '@/hooks/useMountTexture';
import { useCanvasTexture } from '@/hooks/useCanvasTexture';
import type { FrameType } from '@/lib/prodigi-textures/texture-mapper';
import { applyBoxMappingUVs, getRecommendedUVSettings } from '@/lib/three-utils/frame-uv-mapper';
import { getFrameTextureConfig } from '@/lib/prodigi-textures/frame-texture-config';

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
  edge?: '19mm' | '38mm' | 'auto'; // Edge depth for canvas products
  canvasType?: 'standard' | 'slim' | 'eco' | 'auto'; // Canvas type
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
  edge,
  canvasType,
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

  // Calculate frame dimensions based on Prodigi specifications
  // For framed-canvas: Frame and canvas have different sizes with a 5mm gap
  const frameSpecs = useMemo(() => {
    if (productType === 'framed-canvas') {
      const mmToFeet = 0.00328084;
      
      if (edge === '19mm' || canvasType === 'slim') {
        // Classic framed canvas (slim)
        return {
          frameDepth: 17 * mmToFeet, // Rebate depth: 17mm
          frameFaceWidth: 20 * mmToFeet, // Face width: 20mm
          frameGap: 5 * mmToFeet, // Gap between frame and canvas: 5mm
          canvasDepth: 19 * mmToFeet, // Canvas depth: 19mm (slim)
          totalDepth: 22 * mmToFeet, // Total depth from wall: 22mm
        };
      } else if (canvasType === 'eco') {
        // Eco Frame canvas
        return {
          frameDepth: 40 * mmToFeet, // Rebate depth: 40mm
          frameFaceWidth: 12 * mmToFeet, // Face width: 12mm
          frameGap: 5 * mmToFeet, // Gap: 5mm
          canvasDepth: 38 * mmToFeet, // Canvas depth: 38mm (standard)
          totalDepth: 53 * mmToFeet, // Total depth: 53mm
        };
      } else {
        // Framed canvas (standard)
        return {
          frameDepth: 40 * mmToFeet, // Rebate depth: 40mm
          frameFaceWidth: 12 * mmToFeet, // Face width: 12mm
          frameGap: 5 * mmToFeet, // Gap: 5mm
          canvasDepth: 38 * mmToFeet, // Canvas depth: 38mm (standard)
          totalDepth: 53 * mmToFeet, // Total depth: 53mm
        };
      }
    }
    return null;
  }, [productType, edge, canvasType]);

  // Frame depth for geometry creation
  const frameDepth = useMemo(() => {
    if (frameSpecs) {
      return frameSpecs.frameDepth;
    }
    // For framed-print, use style-based depth
    return style === 'ornate' ? 0.12 : 0.08;
  }, [frameSpecs, style]);

  // Frame geometry with proper UV mapping
  const frameGeometry = useMemo(() => {
    const geometry = createFrameGeometry(width, height, style, frameDepth, productType, frameSpecs);
    
    // Get texture configuration to determine UV mapping settings
    const textureConfig = getFrameTextureConfig(frameType, color);
    
    // Apply proper UV mapping for textures
    // Use box mapping which works well for extruded frames
    if (textureConfig.textureRepeat) {
      applyBoxMappingUVs(geometry, textureConfig.textureRepeat);
    }
    
    return geometry;
  }, [width, height, style, frameType, color, frameDepth, productType, frameSpecs]);

  // Frame material using Prodigi textures
  const {
    material: frameMaterial,
    isLoading: frameMaterialLoading,
    hasTextures: frameHasTextures,
    textureConfig,
  } = useFrameMaterial({
    frameType,
    color,
    style,
    useTextures: true, // Enable texture loading
  });

  // Mount/Mat geometry (if present)
  // A mount is a border around the artwork with a window cutout (like a picture mat)
  // The mount sits INSIDE the frame, creating a border around the artwork
  const mountGeometry = useMemo(() => {
    if (!mount || mount === 'none') return null;

    // Mount border width - how much mat is visible around the artwork
    // Border width varies slightly with mount thickness for visual accuracy
    const mountBorderWidthMap: Record<string, number> = {
      '1.4mm': 0.14,  // Slim mat - slightly narrower border (1.68")
      '2.0mm': 0.15,  // Standard mat - standard border (1.8")
      '2.4mm': 0.16,  // Premium mat - slightly wider border (1.92")
    };
    const mountBorderWidth = mountBorderWidthMap[mount] || 0.15; // Default to standard
    
    // Mount outer dimensions match the artwork opening (frame inner dimensions)
    // The mount sits inside the frame, so its outer edge = artwork dimensions
    const mountOuterWidth = width;
    const mountOuterHeight = height;
    
    // Mount inner dimensions - smaller to create visible mat border
    const mountInnerWidth = width - (mountBorderWidth * 2);
    const mountInnerHeight = height - (mountBorderWidth * 2);

    // Create shape with hole (like frame geometry)
    const shape = new THREE.Shape();
    // Outer rectangle (fits within frame opening)
    shape.moveTo(-mountOuterWidth / 2, -mountOuterHeight / 2);
    shape.lineTo(mountOuterWidth / 2, -mountOuterHeight / 2);
    shape.lineTo(mountOuterWidth / 2, mountOuterHeight / 2);
    shape.lineTo(-mountOuterWidth / 2, mountOuterHeight / 2);
    shape.lineTo(-mountOuterWidth / 2, -mountOuterHeight / 2);

    // Inner rectangle (hole for artwork to show through)
    const hole = new THREE.Path();
    hole.moveTo(-mountInnerWidth / 2, -mountInnerHeight / 2);
    hole.lineTo(mountInnerWidth / 2, -mountInnerHeight / 2);
    hole.lineTo(mountInnerWidth / 2, mountInnerHeight / 2);
    hole.lineTo(-mountInnerWidth / 2, mountInnerHeight / 2);
    hole.lineTo(-mountInnerWidth / 2, -mountInnerHeight / 2);
    shape.holes.push(hole);

    // Extrude to give mount some thickness
    // Different mount thicknesses create different visual depth
    const mountThicknessMap: Record<string, number> = {
      '1.4mm': 0.0055,  // 1.4mm mat board - thinner
      '2.0mm': 0.0078,  // 2.0mm mat board - standard
      '2.4mm': 0.0094,  // 2.4mm mat board - premium (more substantial)
    };
    const mountThickness = mountThicknessMap[mount] || 0.0078; // Default to 2.0mm
    
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
    // Thicker mounts have slightly more pronounced texture
    const roughnessMap: Record<string, number> = {
      '1.4mm': 0.75,  // Thinner mat - slightly smoother
      '2.0mm': 0.8,   // Standard mat - standard texture
      '2.4mm': 0.85,  // Thicker mat - more pronounced texture
    };
    
    const mountMaterialConfig: any = {
      color: mountFallbackColor,
      roughness: roughnessMap[mount || '2.0mm'] || 0.8,
      metalness: 0.0,
    };
    
    if (mountTexture) {
      mountMaterialConfig.map = mountTexture;
    }

    return new THREE.MeshStandardMaterial(mountMaterialConfig);
  }, [mountGeometry, mountTexture, mountFallbackColor, showMount, mount]);

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

  // Calculate canvas z-position for framed-canvas
  // Canvas should sit inside the frame's rebate (L-shaped groove), recessed by the gap
  const canvasZPosition = useMemo(() => {
    if (productType === 'framed-canvas' && frameSpecs) {
      // Frame front is at z=0
      // Frame rebate extends from z=0 to z=-rebateDepth
      // Canvas sits INSIDE the rebate, recessed by the gap (5mm) from the frame's inner edge
      // Canvas front should be at z=-gap (recessed), canvas back at z=-(gap + canvasDepth)
      return -frameSpecs.frameGap; // Canvas front at z=-gap, back at z=-(gap + canvasDepth)
    }
    return 0; // Default position for non-framed canvas
  }, [productType, frameSpecs]);

  // For canvas products, create edge geometries and back panel
  // IMPORTANT: Including wrap in dependencies ensures edges update when wrap changes
  const canvasEdges = useMemo(() => {
    if (!['canvas', 'framed-canvas'].includes(productType)) return null;
    
    // Calculate canvas dimensions
    let canvasWidth = width;
    let canvasHeight = height;
    let edgeDepth: number;
    let canvasOffsetX = 0;
    let canvasOffsetY = 0;
    
    if (productType === 'framed-canvas' && frameSpecs) {
      // For framed-canvas, canvas sits inside the frame's rebate with a 5mm gap
      // Canvas dimensions = artwork size - (2 * gap) on each side
      // The gap is between the frame's inner edge and the canvas
      const gap = frameSpecs.frameGap; // 5mm gap
      canvasWidth = width - (gap * 2); // Canvas is smaller than artwork by gap on each side
      canvasHeight = height - (gap * 2); // Canvas is smaller than artwork by gap on each side
      
      // Canvas depth is the actual canvas depth (19mm for slim, 38mm for standard)
      // Canvas sits in the rebate, which is deeper than the canvas
      // Canvas extends from z=-gap to z=-(gap + canvasDepth)
      edgeDepth = frameSpecs.canvasDepth; // Use actual canvas depth (19mm for slim, 38mm for standard)
      
      // Canvas is centered (no offset needed - it's centered in the frame rebate)
      canvasOffsetX = 0;
      canvasOffsetY = 0;
    } else {
      // For regular canvas (not framed), use full size
      if (edge === '19mm' || canvasType === 'slim') {
        edgeDepth = 19 * 0.00328084; // ~0.0623 feet
      } else {
        edgeDepth = 38 * 0.00328084; // ~0.1246 feet
      }
    }
    
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
    
    // Calculate z-position for canvas edges
    // Canvas sits in frame rebate, starting from z=0 (front of frame)
    // Canvas edges extend from z=0 (front) to z=-edgeDepth (back)
    // For BoxGeometry, position is the center, so we need to offset by half the depth
    // To have front at z=0: center = 0 - edgeDepth/2 = -edgeDepth/2
    // Use canvasZPosition (which is 0 for framed-canvas) as the front position
    const canvasZCenter = canvasZPosition - (edgeDepth / 2);
    
    // Create 4 edge strips (top, bottom, left, right) + back panel
    // Use canvas dimensions (smaller than frame for framed-canvas)
    return [
      // Top edge - front at z=0, back at z=-edgeDepth
      {
        geometry: new THREE.BoxGeometry(canvasWidth, edgeThickness, edgeDepth),
        position: [canvasOffsetX, canvasOffsetY + canvasHeight / 2, canvasZCenter] as [number, number, number],
        material: edgeMaterial,
        key: `top-${wrap}`, // Key for React to track changes
      },
      // Bottom edge - front at z=0, back at z=-edgeDepth
      {
        geometry: new THREE.BoxGeometry(canvasWidth, edgeThickness, edgeDepth),
        position: [canvasOffsetX, canvasOffsetY - canvasHeight / 2, canvasZCenter] as [number, number, number],
        material: edgeMaterial,
        key: `bottom-${wrap}`,
      },
      // Left edge - front at z=0, back at z=-edgeDepth
      {
        geometry: new THREE.BoxGeometry(edgeThickness, canvasHeight, edgeDepth),
        position: [canvasOffsetX - canvasWidth / 2, canvasOffsetY, canvasZCenter] as [number, number, number],
        material: edgeMaterial,
        key: `left-${wrap}`,
      },
      // Right edge - front at z=0, back at z=-edgeDepth
      {
        geometry: new THREE.BoxGeometry(edgeThickness, canvasHeight, edgeDepth),
        position: [canvasOffsetX + canvasWidth / 2, canvasOffsetY, canvasZCenter] as [number, number, number],
        material: edgeMaterial,
        key: `right-${wrap}`,
      },
      // Back panel - positioned at the back of the canvas (z=-edgeDepth)
      {
        geometry: new THREE.PlaneGeometry(canvasWidth - edgeThickness * 2, canvasHeight - edgeThickness * 2),
        position: [canvasOffsetX, canvasOffsetY, canvasZPosition - edgeDepth] as [number, number, number],
        material: backMaterial,
        key: 'back',
      },
    ];
  }, [productType, width, height, wrap, wrapTexture, substrateTexture, frameSpecs, edge, canvasType, canvasZPosition]); // Include canvasZPosition

  // Calculate frame position to align with canvas depth for framed-canvas
  const framePosition = useMemo((): [number, number, number] => {
    // For framed-canvas, frame front is at z=0
    // Frame has L-shape with rebate extending from z=0 to z=-rebateDepth
    // Canvas sits inside the rebate, recessed by gap (5mm)
    if (productType === 'framed-canvas') {
      return [0, 0, -0.1]; // Frame front at z=0
    }
    // For framed-print, use the original offset
    return [0, 0, -0.05];
  }, [productType]);

  return (
    <group>
      {/* Frame (only for framed products) */}
      {showFrame && (
        <mesh
          geometry={frameGeometry}
          material={frameMaterial}
          castShadow
          position={framePosition}
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
  style: string,
  depth?: number, // Optional depth override (for framed-canvas with edge/canvasType)
  productType?: string,
  frameSpecs?: {
    frameDepth: number;
    frameFaceWidth: number;
    frameGap: number;
    canvasDepth: number;
    totalDepth: number;
  } | null
): THREE.ExtrudeGeometry {
  // For framed-canvas, use frame face width from specs
  // For framed-print, use default frame width
  let frameWidth: number;
  let innerWidth: number;
  let innerHeight: number;
  
  if (productType === 'framed-canvas' && frameSpecs) {
    // Frame outer dimensions = artwork size + frame face width on each side
    frameWidth = frameSpecs.frameFaceWidth;
    // Inner hole = artwork size - gap on each side
    // The gap creates space between frame inner edge and canvas
    innerWidth = width - (frameSpecs.frameGap * 2);
    innerHeight = height - (frameSpecs.frameGap * 2);
  } else {
    // Default frame width for framed-print
    frameWidth = 0.08;
    innerWidth = width;
    innerHeight = height;
  }
  
  // Use provided depth if available (for framed-canvas), otherwise use style-based depth
  const frameDepth = depth !== undefined 
    ? depth 
    : (style === 'ornate' ? 0.12 : 0.08);

  // Outer rectangle (frame outer edge)
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 - frameWidth, -height / 2 - frameWidth);
  shape.lineTo(width / 2 + frameWidth, -height / 2 - frameWidth);
  shape.lineTo(width / 2 + frameWidth, height / 2 + frameWidth);
  shape.lineTo(-width / 2 - frameWidth, height / 2 + frameWidth);
  shape.lineTo(-width / 2 - frameWidth, -height / 2 - frameWidth);

  // Inner rectangle (hole for canvas/artwork)
  // For framed-canvas, this creates the gap between frame and canvas
  const hole = new THREE.Path();
  hole.moveTo(-innerWidth / 2, -innerHeight / 2);
  hole.lineTo(innerWidth / 2, -innerHeight / 2);
  hole.lineTo(innerWidth / 2, innerHeight / 2);
  hole.lineTo(-innerWidth / 2, innerHeight / 2);
  hole.lineTo(-innerWidth / 2, -innerHeight / 2);

  shape.holes.push(hole);

  // Extrude settings based on style
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: frameDepth,
    bevelEnabled: style !== 'modern',
    bevelThickness: style === 'ornate' ? 0.015 : 0.008,
    bevelSize: style === 'ornate' ? 0.015 : 0.008,
    bevelSegments: style === 'ornate' ? 8 : 2,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

