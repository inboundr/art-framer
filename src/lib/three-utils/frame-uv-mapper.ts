/**
 * Frame UV Mapper
 * Fixes UV coordinates for extruded frame geometry to properly apply textures
 * 
 * The Problem:
 * Three.js ExtrudeGeometry auto-generates UV coordinates that don't work well
 * with wood/metal textures. Textures get stretched, distorted, or misaligned,
 * especially at corners.
 * 
 * The Solution:
 * We manually set UV coordinates to create a repeating tiled pattern that
 * wraps around the frame naturally, like real wood grain or metal finish.
 */

import * as THREE from 'three';

export interface FrameUVMapperOptions {
  /**
   * How many times the texture should repeat around the frame
   * Higher values = more tile repetitions = finer detail
   * Lower values = fewer repetitions = larger texture features
   */
  repeatFactor?: number;
  
  /**
   * Whether to rotate the texture 90 degrees for certain faces
   * Useful for matching wood grain direction
   */
  rotateForGrain?: boolean;
  
  /**
   * Scale adjustment for different frame widths
   */
  frameWidth?: number;
}

/**
 * Apply proper UV mapping to extruded frame geometry
 * 
 * This function recalculates UV coordinates for all faces of the frame
 * so that textures tile naturally without distortion.
 */
export function applyFrameUVMapping(
  geometry: THREE.ExtrudeGeometry,
  options: FrameUVMapperOptions = {}
): void {
  const {
    repeatFactor = 1.0,
    rotateForGrain = false,
    frameWidth = 0.08,
  } = options;
  
  // Get geometry attributes
  const positions = geometry.attributes.position;
  const uvs = geometry.attributes.uv;
  
  if (!positions || !uvs) {
    console.warn('Frame geometry missing position or UV attributes');
    return;
  }
  
  // We need to recalculate UVs based on world position
  // For a frame, we want the texture to tile based on distance along the frame
  
  const uvArray = new Float32Array(positions.count * 2);
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // Calculate UV based on position
    // We use x and y for planar mapping, scaled by repeat factor
    let u = (x * repeatFactor) % 1.0;
    let v = (y * repeatFactor) % 1.0;
    
    // Ensure UVs are positive (wrap negative values)
    if (u < 0) u += 1.0;
    if (v < 0) v += 1.0;
    
    // For side faces (based on Z depth), we might want to use x/z or y/z
    // to create proper wrapping around the frame depth
    const absZ = Math.abs(z);
    if (absZ > 0.001) {
      // This is a side face (frame depth/bevel)
      // Use distance along frame edge for U, depth for V
      const distanceAlongEdge = Math.sqrt(x * x + y * y);
      u = (distanceAlongEdge * repeatFactor * 2) % 1.0;
      v = (absZ / frameWidth * 0.5) % 1.0; // Map depth to 0-0.5 range
    }
    
    // Rotate UVs if needed (for grain direction)
    if (rotateForGrain) {
      const tempU = u;
      u = v;
      v = 1.0 - tempU;
    }
    
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }
  
  // Update geometry UVs
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
  geometry.attributes.uv.needsUpdate = true;
}

/**
 * Alternative approach: Use box mapping
 * This maps the texture like a box unwrap, which works well for frames
 */
export function applyBoxMappingUVs(
  geometry: THREE.ExtrudeGeometry,
  textureRepeat: [number, number] = [1, 1]
): void {
  const positions = geometry.attributes.position;
  const normals = geometry.attributes.normal;
  
  if (!positions || !normals) {
    console.warn('Geometry missing required attributes');
    return;
  }
  
  const uvArray = new Float32Array(positions.count * 2);
  const [repeatU, repeatV] = textureRepeat;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);
    
    // Use normal to determine which axis to use for UV
    const absNx = Math.abs(nx);
    const absNy = Math.abs(ny);
    const absNz = Math.abs(nz);
    
    let u = 0;
    let v = 0;
    
    // Choose UV based on dominant normal direction (box mapping)
    if (absNz > absNx && absNz > absNy) {
      // Z-facing (front/back faces)
      u = (x * repeatU) % 1.0;
      v = (y * repeatV) % 1.0;
    } else if (absNx > absNy) {
      // X-facing (left/right faces)
      u = (z * repeatU) % 1.0;
      v = (y * repeatV) % 1.0;
    } else {
      // Y-facing (top/bottom faces)
      u = (x * repeatU) % 1.0;
      v = (z * repeatV) % 1.0;
    }
    
    // Normalize to 0-1 range
    if (u < 0) u += 1.0;
    if (v < 0) v += 1.0;
    
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }
  
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
  geometry.attributes.uv.needsUpdate = true;
}

/**
 * Simple cylindrical mapping - treats the frame like a cylinder
 * Good for frames where texture should flow around continuously
 */
export function applyCylindricalUVMapping(
  geometry: THREE.ExtrudeGeometry,
  textureRepeat: [number, number] = [4, 4]
): void {
  const positions = geometry.attributes.position;
  
  if (!positions) {
    console.warn('Geometry missing position attribute');
    return;
  }
  
  const uvArray = new Float32Array(positions.count * 2);
  const [repeatU, repeatV] = textureRepeat;
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // Calculate angle around center (cylindrical U coordinate)
    const angle = Math.atan2(y, x);
    let u = (angle / (Math.PI * 2)) + 0.5; // Normalize to 0-1
    u = (u * repeatU) % 1.0;
    
    // Use Z for V coordinate (height along cylinder)
    let v = (z * repeatV) % 1.0;
    
    if (u < 0) u += 1.0;
    if (v < 0) v += 1.0;
    
    uvArray[i * 2] = u;
    uvArray[i * 2 + 1] = v;
  }
  
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
  geometry.attributes.uv.needsUpdate = true;
}

/**
 * Get recommended UV mapping settings for a frame type
 */
export function getRecommendedUVSettings(
  frameType: string,
  color: string
): FrameUVMapperOptions {
  const typeLower = frameType.toLowerCase();
  const colorLower = color.toLowerCase();
  
  // Wood frames benefit from grain rotation
  const isWood = !colorLower.includes('aluminium') && 
                 !colorLower.includes('aluminum') &&
                 !colorLower.includes('metal');
  
  // Ornate/detailed frames need higher repeat
  const isOrnate = typeLower.includes('ornate') || 
                   typeLower.includes('antique');
  
  // Metallic frames are usually smoother, less repeat needed
  const isMetallic = colorLower.includes('gold') || 
                     colorLower.includes('silver') ||
                     colorLower.includes('aluminium') ||
                     colorLower.includes('aluminum');
  
  return {
    repeatFactor: isOrnate ? 8 : (isMetallic ? 6 : 4),
    rotateForGrain: isWood && !isOrnate,
    frameWidth: typeLower.includes('box') ? 0.12 : 0.08,
  };
}

