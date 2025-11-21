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
}

export function FrameModel({
  color,
  style,
  size,
  mount,
  mountColor,
  glaze,
}: FrameModelProps) {
  // Parse size
  const [widthInches, heightInches] = size.split('x').map(Number);
  const width = (widthInches || 16) / 12; // Convert to feet (Three.js units)
  const height = (heightInches || 20) / 12;

  // Frame geometry
  const frameGeometry = useMemo(() => {
    return createFrameGeometry(width, height, style);
  }, [width, height, style]);

  // Frame material
  const frameMaterial = useMemo(() => {
    const materialConfig: any = {
      metalness: ['gold', 'silver'].includes(color) ? 0.8 : 0.1,
      roughness: 0.4,
    };

    // Color mapping
    const colorMap: Record<string, string> = {
      black: '#000000',
      white: '#FFFFFF',
      natural: '#C19A6B',
      brown: '#654321',
      gold: '#FFD700',
      silver: '#C0C0C0',
      'dark grey': '#555555',
      'light grey': '#CCCCCC',
    };

    materialConfig.color = colorMap[color] || '#000000';

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

    const colorMap: Record<string, string> = {
      white: '#FFFFFF',
      'off-white': '#F8F8F0',
      cream: '#FFFDD0',
      black: '#000000',
    };

    return new THREE.MeshStandardMaterial({
      color: colorMap[mountColor || 'white'] || '#FFFFFF',
      roughness: 0.8,
    });
  }, [mountColor, mountGeometry]);

  // Glaze geometry and material
  const glazeGeometry = useMemo(() => {
    if (!glaze || glaze === 'none') return null;

    return new THREE.PlaneGeometry(width, height);
  }, [glaze, width, height]);

  const glazeMaterial = useMemo(() => {
    if (!glazeGeometry) return null;

    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: glaze === 'motheye' ? 0.05 : 0.1,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
  }, [glaze, glazeGeometry]);

  return (
    <group>
      {/* Frame */}
      <mesh
        geometry={frameGeometry}
        material={frameMaterial}
        castShadow
        position={[0, 0, -0.05]}
      />

      {/* Mount/Mat */}
      {mountGeometry && mountMaterial && (
        <mesh
          geometry={mountGeometry}
          material={mountMaterial}
          position={[0, 0, -0.02]}
        />
      )}

      {/* Glaze */}
      {glazeGeometry && glazeMaterial && (
        <mesh geometry={glazeGeometry} material={glazeMaterial} position={[0, 0, 0.01]} />
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

