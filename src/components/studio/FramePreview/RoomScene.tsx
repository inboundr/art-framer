/**
 * Room Scene Component
 * 3D room environments with preset scenes for frame visualization
 */

'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';
import type { FrameConfiguration } from '@/store/studio';
import { getSupabaseAssetUrlSync } from '@/lib/prodigi-assets/supabase-assets';

export type RoomEnvironment = 
  | 'living-room';
  // Add more environments as you add more GLB files
  // | 'office'
  // | 'salon'
  // | 'bedroom'
  // | 'dining-room'
  // | 'gallery'
  // | 'modern-loft'
  // | 'cozy-cafe';

interface RoomSceneProps {
  config: FrameConfiguration;
  environment: RoomEnvironment;
  resetTrigger?: number;
}

// GLB file paths for each environment
const roomGLBPaths: Record<RoomEnvironment, string> = {
  'living-room': getSupabaseAssetUrlSync('/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb'),
};

// Room configuration presets (for camera and frame positioning)
const roomPresets: Record<RoomEnvironment, {
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  framePosition: [number, number, number];
  frameRotation?: [number, number, number];
  roomScale?: number;
  roomPosition?: [number, number, number];
  roomRotation?: [number, number, number];
  wallArtObjectName?: string; // Optional: specify exact object name to target
}> = {
  'living-room': {
    cameraPosition: [4.5, 1.6, 0], // Rotated 90° to the right from [0, 1.6, 4.5]
    cameraTarget: [0, 1.3, 0],
    framePosition: [0, 1.3, -3.9],
    frameRotation: [0, 0, 0],
    roomScale: 1,
    roomPosition: [0, 0, 0],
    roomRotation: [0, 0, 0],
    wallArtObjectName: 'Plane001_Material013_0', // Uncomment and set the exact object name from console logs
    // Check browser console for candidate list with texture info (🖼️ TEXTURED objects are prioritized)
  },
};

// Helper function to find and hide wall art in the scene
function findAndHideWallArt(scene: THREE.Object3D, targetObjectName?: string): { position: [number, number, number]; rotation: [number, number, number]; size?: [number, number, number] } | null {
  // Ensure scene is valid
  if (!scene) {
    console.warn('⚠️ Scene is null or undefined');
    return null;
  }
  
  // Update world matrices to ensure positions are correct
  scene.updateMatrixWorld(true);
  
  const possibleNames = [
    'picture', 'art', 'frame', 'wall_art', 'painting', 'artwork', 'frame_art',
    'wall_picture', 'picture_frame', 'art_frame', 'wall_frame', 'decor',
    'Picture', 'Art', 'Frame', 'Wall_Art', 'Painting', 'Artwork', 'Frame_Art',
    'Wall_Picture', 'Picture_Frame', 'Art_Frame', 'Wall_Frame', 'Decor',
    'wallart', 'wallArt', 'WallArt', 'wallArtwork', 'wallPicture'
  ];

  // Collect all candidates first, then pick the best one
  interface Candidate {
    object: THREE.Object3D;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    score: number;
    name: string;
    size: THREE.Vector3;
    hasTexture?: boolean;
    materialInfo?: string;
  }

  const candidates: Candidate[] = [];
  
  // If a specific object name is provided, find exact match and related objects
  if (targetObjectName) {
    const foundObjects: THREE.Object3D[] = [];
    const combinedBox = new THREE.Box3();
    let hasValidBox = false;
    
    // Extract base name pattern (e.g., "Plane001_Material" from "Plane001_Material013_0")
    const baseNameMatch = targetObjectName.match(/^(.+?)_Material\d+/);
    const baseName = baseNameMatch ? baseNameMatch[1] : targetObjectName;
    
    console.log('🔍 Looking for objects matching:', targetObjectName, 'or base pattern:', baseName);
    
    scene.traverse((child) => {
      const childName = child.name.toLowerCase();
      const targetLower = targetObjectName.toLowerCase();
      
      // Check for exact match or objects with same base name (e.g., Plane001_Material*)
      const isExactMatch = child.name === targetObjectName || childName === targetLower;
      const isRelatedMatch = baseName && childName.startsWith(baseName.toLowerCase() + '_material');
      
      if (isExactMatch || isRelatedMatch) {
        foundObjects.push(child);
        
        // Calculate bounding box for this object
        const box = new THREE.Box3().setFromObject(child);
        if (!box.isEmpty()) {
          if (!hasValidBox) {
            combinedBox.copy(box);
            hasValidBox = true;
          } else {
            combinedBox.union(box);
          }
        }
        
        console.log('  📌 Found related object:', child.name);
      }
    });
    
    // Wall color for replacing artwork and making walls uniform
    const wallColor = new THREE.Color(0xf5f5f0); // Light beige/off-white wall color
    
    // If we found objects, replace their material with wall color
    if (foundObjects.length > 0) {
      console.log(`✅ Found ${foundObjects.length} related wall art object(s):`, foundObjects.map(o => o.name).join(', '));
      
      // Hide all found artwork objects
      foundObjects.forEach((obj) => {
        obj.visible = false;
        // obj.castShadow = false;
        // obj.receiveShadow = false;
        
        obj.traverse((descendant: THREE.Object3D) => {
          if (descendant instanceof THREE.Mesh) {
            descendant.visible = false;
            // descendant.castShadow = false;
            // descendant.receiveShadow = false;
          }
        });
      });
      
      // Find and fix wall objects at the artwork position
      // This fixes the black box issue by ensuring wall materials are light-colored
      if (hasValidBox) {
        const center = combinedBox.getCenter(new THREE.Vector3());
        const size = combinedBox.getSize(new THREE.Vector3());
        
        console.log('🔍 Searching for wall objects at artwork position...');
        const wallObjects: THREE.Object3D[] = [];
        
        // Exclude root scene containers
        const excludeRootNames = ['sketchfab_scene', 'scene', 'root'];
        
        scene.traverse((child) => {
          // Skip objects we already found and hid
          if (foundObjects.includes(child)) {
            return;
          }
          
          // Skip root scene containers
          const childName = child.name.toLowerCase();
          if (excludeRootNames.some(excluded => childName.includes(excluded))) {
            return;
          }
          
          if (child instanceof THREE.Mesh) {
            const childBox = new THREE.Box3().setFromObject(child);
            if (childBox.isEmpty()) {
              return;
            }
            
            const childCenter = childBox.getCenter(new THREE.Vector3());
            
            // Check if object is at the same X,Y position as artwork (wall behind it)
            // Or if it's a known wall object like Cube_Material_0
            const xyMatch = 
              Math.abs(childCenter.x - center.x) < 0.5 &&
              Math.abs(childCenter.y - center.y) < 0.5;
            
            const isWallObject = xyMatch || childName.includes('cube_material') || childName.includes('plane003');
            
            if (isWallObject) {
              wallObjects.push(child);
              console.log(`  🧱 Found wall object: ${child.name}`);
              
              // Fix material to be wall-colored
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material: THREE.Material) => {
                  if (material instanceof THREE.MeshStandardMaterial) {
                    material.color.copy(wallColor);
                    material.map = null;
                    material.normalMap = null;
                    material.roughnessMap = null;
                    material.emissive = new THREE.Color(0x000000);
                    material.metalness = 0;
                    material.roughness = 0.8;
                    console.log(`     ✅ Fixed material color for ${child.name}`);
                  } else if (material instanceof THREE.MeshPhongMaterial || 
                             material instanceof THREE.MeshLambertMaterial) {
                    material.color.copy(wallColor);
                    material.map = null;
                    material.emissive = new THREE.Color(0x000000);
                    console.log(`     ✅ Fixed material color for ${child.name}`);
                  } else if (material instanceof THREE.MeshBasicMaterial) {
                    material.color.copy(wallColor);
                    material.map = null;
                    console.log(`     ✅ Fixed material color for ${child.name}`);
                  }
                });
              }
            }
          }
        });
        
        if (wallObjects.length > 0) {
          console.log(`  📊 Fixed ${wallObjects.length} wall object(s) at artwork position`);
        }
      }
      
        // Calculate center position from combined bounding box
        if (hasValidBox) {
          const center = combinedBox.getCenter(new THREE.Vector3());
          const size = combinedBox.getSize(new THREE.Vector3());
          
          // Get rotation from the first object (they should all have similar rotation)
          const firstObj = foundObjects[0];
          const worldQuaternion = new THREE.Quaternion();
          firstObj.getWorldQuaternion(worldQuaternion);
          const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
          
          // Also get world position of first object for comparison
          const firstWorldPos = new THREE.Vector3();
          firstObj.getWorldPosition(firstWorldPos);
          
          // If center is at origin but objects have world positions, use average of world positions
          let finalPosition: [number, number, number];
          if (Math.abs(center.x) < 0.1 && Math.abs(center.y) < 0.1 && Math.abs(center.z) < 0.1) {
            // Center is at origin, calculate average of world positions instead
            const avgPos = new THREE.Vector3();
            foundObjects.forEach(obj => {
              const worldPos = new THREE.Vector3();
              obj.getWorldPosition(worldPos);
              avgPos.add(worldPos);
            });
            avgPos.divideScalar(foundObjects.length);
            finalPosition = [avgPos.x, avgPos.y, avgPos.z];
            console.log('📍 Objects at origin, using average world position:', finalPosition);
          } else {
            // Use bounding box center, but move slightly forward (toward camera) to ensure visibility
            finalPosition = [center.x, center.y, center.z + 0.01]; // Small forward offset
          }
          
          console.log('📍 Calculated position from bounding box:', [center.x, center.y, center.z], 'Size:', [size.x, size.y, size.z]);
          console.log('📍 First object world position:', [firstWorldPos.x, firstWorldPos.y, firstWorldPos.z]);
          console.log('📍 Final frame position:', finalPosition);
          console.log('📍 Rotation:', [euler.x, euler.y, euler.z]);
          
          // Create a replacement plane with wall color to fill the gap
          // This prevents black holes when artwork is hidden
          const replacementPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(size.x, size.y),
            new THREE.MeshStandardMaterial({
              color: wallColor,
              roughness: 0.8,
              metalness: 0,
              side: THREE.DoubleSide
            })
          );
          
          // Position the replacement plane at the artwork location
          replacementPlane.position.set(center.x, center.y, center.z);
          replacementPlane.rotation.set(euler.x, euler.y, euler.z);
          replacementPlane.name = 'WallArtReplacement';
          replacementPlane.castShadow = false;
          replacementPlane.receiveShadow = true;
          
          // Add to scene
          scene.add(replacementPlane);
          console.log('✅ Created replacement wall plane to fill artwork gap');
          
          return {
            position: finalPosition,
            rotation: [euler.x, euler.y, euler.z],
            size: [size.x, size.y, size.z]
          };
      } else {
        // Fallback: use world position from first object
        const firstObj = foundObjects[0];
        const worldPos = new THREE.Vector3();
        firstObj.getWorldPosition(worldPos);
        const worldQuaternion = new THREE.Quaternion();
        firstObj.getWorldQuaternion(worldQuaternion);
        const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
        
        console.log('📍 Using world position from first object:', [worldPos.x, worldPos.y, worldPos.z]);
        console.log('📍 Rotation:', [euler.x, euler.y, euler.z]);
        
        // Get bounding box for size
        const box = new THREE.Box3().setFromObject(firstObj);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        return {
          position: [worldPos.x, worldPos.y, worldPos.z],
          rotation: [euler.x, euler.y, euler.z],
          size: [size.x, size.y, size.z]
        };
      }
    }
  }

  // Exclusion list - objects that should never be considered as wall art
  const excludeNames = [
    'curtain', 'pillow', 'floor', 'ceiling', 'wall', 'sofa', 'chair', 'table',
    'lamp', 'plant', 'vase', 'jug', 'sphere', 'cylinder', 'cube019', 'circle',
    'metal', 'fabric', 'leather', 'birch', 'paint', 'tecido', 'migramah', 'nurbs',
    'plane003' // Known to be a wall, not artwork
  ];

  // Debug: Collect ALL object names first
  const allObjectNames: Array<{ name: string; type: string; position: [number, number, number] }> = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      allObjectNames.push({
        name: child.name || 'unnamed',
        type: child instanceof THREE.Mesh ? 'Mesh' : 'Group',
        position: [worldPos.x, worldPos.y, worldPos.z]
      });
    }
  });
  
  // Log all objects
  console.log('📋 ALL OBJECTS IN SCENE (' + allObjectNames.length + ' total):');
  allObjectNames.forEach((obj, i) => {
    console.log(`  ${i + 1}. ${obj.name} (${obj.type}) - Position: [${obj.position[0].toFixed(2)}, ${obj.position[1].toFixed(2)}, ${obj.position[2].toFixed(2)}]`);
  });
  
  // Debug: Count all objects
  let totalObjects = 0;
  let objectsInYRange = 0;
  let objectsAfterExclusions = 0;
  
  // First pass: Collect all potential wall art objects
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
      totalObjects++;
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      
      // Only consider objects that are on walls (reasonable Y position, negative Z for back wall)
      if (worldPos.y > 0.5 && worldPos.y < 3.5) {
        objectsInYRange++;
        const name = child.name.toLowerCase();
        
        // Explicitly exclude curtains (they're often large and thin, but not artwork)
        if (name.includes('curtain') || name.includes('curtains')) {
          return;
        }
        
        // Skip excluded objects (but allow "plane" as it could be artwork)
        if (excludeNames.some(excluded => name.includes(excluded))) {
          return;
        }
        
        objectsAfterExclusions++;
        
        const isNamedWallArt = possibleNames.some(possibleName => name.includes(possibleName.toLowerCase()));
        
        // Check for textured materials (artwork often has texture maps)
        let hasTexture = false;
        let materialInfo = '';
        if (child instanceof THREE.Mesh && child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          if (material) {
            if ('map' in material && material.map) {
              hasTexture = true;
              materialInfo = 'has texture map';
            }
            if ('normalMap' in material && material.normalMap) {
              hasTexture = true;
              materialInfo += materialInfo ? ', normal map' : 'has normal map';
            }
            if ('roughnessMap' in material && material.roughnessMap) {
              hasTexture = true;
              materialInfo += materialInfo ? ', roughness map' : 'has roughness map';
            }
          }
        }
        
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        
        // Skip if bounding box is invalid or zero
        if (size.x === 0 && size.y === 0 && size.z === 0) {
          return; // Invalid bounding box
        }
        
        const area = size.x * size.y;
        const depth = size.z;
        
        // Exclude objects with "material" in name that are thick (likely furniture parts)
        // But allow thin material objects (could be artwork)
        if (name.includes('material') && depth > 0.2) {
          return;
        }
        
        // Skip objects that are too thick (not picture frames)
        // But allow very thin objects even if they're large (could be large artwork)
        if (depth > 0.5) {
          return;
        }
        
        // Skip objects that are too small (likely decorative details)
        if (area < 0.1) {
          return;
        }
        
        // Exclude objects that are too large (likely walls, not artwork)
        // Picture frames are typically 0.5 to 4 units in width/height
        // Even large artwork rarely exceeds 5-6 units
        if (size.x > 6 || size.y > 6 || area > 30) {
          return; // Too large, likely a wall or large surface
        }
        
        // Prefer objects that are picture-frame sized (moderate size)
        // Very small objects are decorative details, very large are walls
        if (area < 0.2 || (size.x < 0.3 && size.y < 0.3)) {
          return; // Too small
        }
        
        // Get rotation
        const worldQuaternion = new THREE.Quaternion();
        child.getWorldQuaternion(worldQuaternion);
        const euler = new THREE.Euler().setFromQuaternion(worldQuaternion);
        
        let score = 0;
        
        // Named wall art gets high priority
        if (isNamedWallArt) {
          score += 10;
        }
        
        // Exact name match gets highest priority
        if (targetObjectName && (child.name === targetObjectName || child.name.toLowerCase() === targetObjectName.toLowerCase())) {
          score += 20;
        }
        
        // Prefer objects at a reasonable distance from camera
        // Typical picture frames are at Z between -3 and -5 (back wall)
        if (worldPos.z < -2.5 && worldPos.z > -5.5) {
          score += 6; // Ideal back wall position
        } else if (worldPos.z < -1.5 && worldPos.z > -6.0) {
          score += 2; // Acceptable range
        } else if (worldPos.z < -6.0) {
          score -= 3; // Too far back (likely a wall, not artwork)
        }
        
        // Prefer objects that are flat (picture frames are thin)
        if (depth < 0.1 && depth >= 0.0) {
          score += 8; // Extremely thin = very likely artwork
        } else if (depth < 0.15 && depth > 0.01) {
          score += 5; // Very thin = likely picture frame
        } else if (depth < 0.3) {
          score += 2; // Moderately thin
        }
        
        // Prefer moderate-sized objects (typical picture frame size)
        // Picture frames are usually 0.5-4 units in each dimension
        if (area > 0.5 && area < 4.0 && size.x > 0.5 && size.x < 4.0 && size.y > 0.5 && size.y < 4.0) {
          score += 6; // Perfect picture frame size
        } else if (area > 0.3 && area < 6.0) {
          score += 4; // Good size for artwork
        } else if (area > 0.2 && area < 10.0) {
          score += 2; // Acceptable size
        } else if (area > 10.0) {
          score -= 5; // Too large (likely a wall or large surface)
        }
        
        // Prefer objects at eye level
        if (worldPos.y > 1.0 && worldPos.y < 2.0) {
          score += 4; // Perfect eye level
        } else if (worldPos.y > 0.8 && worldPos.y < 2.5) {
          score += 2; // Acceptable height
        }
        
        // Prefer centered objects (main artwork is usually centered)
        if (Math.abs(worldPos.x) < 0.5) {
          score += 3; // Very centered
        } else if (Math.abs(worldPos.x) < 1.5) {
          score += 1; // Somewhat centered
        }
        
        // Prefer objects facing forward (rotation around Y should be close to 0 or 180)
        const yRotation = Math.abs(euler.y);
        if (yRotation < 0.2 || Math.abs(yRotation - Math.PI) < 0.2) {
          score += 2;
        }
        
        // Bonus for objects with textures (artwork often has textured materials)
        if (hasTexture) {
          score += 8; // High priority for textured objects (likely artwork)
        }
        
        // Only add if it meets minimum criteria (relaxed for debugging)
        // Lower threshold to see more candidates
        if (score >= 0 || isNamedWallArt || hasTexture) {
          candidates.push({
            object: child,
            position: worldPos.clone(),
            rotation: euler,
            score,
            name: child.name || 'unnamed',
            size: size.clone(),
            hasTexture,
            materialInfo
          });
        }
      }
    }
  });
  
  // Debug logging
  console.log('🔍 Scene analysis:', {
    totalObjects,
    objectsInYRange,
    objectsAfterExclusions,
    candidatesFound: candidates.length
  });

  // Log all candidates for debugging
  if (candidates.length > 0) {
    console.log('🎨 Found', candidates.length, 'potential wall art candidates:');
    candidates.forEach((c, i) => {
      const textureInfo = c.hasTexture ? ` 🖼️ TEXTURED (${c.materialInfo || 'has texture'})` : '';
      console.log(`  ${i + 1}. ${c.name}${textureInfo} - Score: ${c.score}, Position: [${c.position.x.toFixed(2)}, ${c.position.y.toFixed(2)}, ${c.position.z.toFixed(2)}], Size: [${c.size.x.toFixed(2)}, ${c.size.y.toFixed(2)}, ${c.size.z.toFixed(2)}]`);
    });
  }

  // Pick the best candidate (highest score)
  if (candidates.length > 0) {
    // Sort by score (highest first), then by size (larger first for same score), then by Z position
    candidates.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 2) {
        return b.score - a.score; // Higher score first
      }
      // If scores are close, prefer larger objects (likely main artwork)
      const aArea = a.size.x * a.size.y;
      const bArea = b.size.x * b.size.y;
      if (Math.abs(aArea - bArea) > 1) {
        return bArea - aArea; // Larger first
      }
      return a.position.z - b.position.z; // More negative Z (back wall) first
    });

    const bestCandidate = candidates[0];
    
    const textureNote = bestCandidate.hasTexture ? ` (🖼️ TEXTURED: ${bestCandidate.materialInfo || 'has texture'})` : '';
    console.log('✅ Selected wall art:', bestCandidate.name + textureNote, 'at position:', [bestCandidate.position.x, bestCandidate.position.y, bestCandidate.position.z].map(v => v.toFixed(2)));

    // Hide the selected wall art
    bestCandidate.object.visible = false;
    bestCandidate.object.traverse((descendant) => {
      if (descendant instanceof THREE.Mesh) {
        descendant.visible = false;
      }
    });

    return {
      position: [bestCandidate.position.x, bestCandidate.position.y, bestCandidate.position.z],
      rotation: [bestCandidate.rotation.x, bestCandidate.rotation.y, bestCandidate.rotation.z],
      size: [bestCandidate.size.x, bestCandidate.size.y, bestCandidate.size.z]
    };
  }

  console.log('⚠️ No wall art found in scene, using default position');
  return null;
}

// Helper function to calculate appropriate frame scale based on wall art size and frame size
function calculateFrameScale(
  frameSize: string, // e.g., "16x20"
  wallArtSize?: [number, number, number], // Size of the wall art in the room scene
  maxWallArtDimension: number = 2.0 // Maximum dimension to constrain frame to realistic size
): number {
  if (!wallArtSize) {
    // Default scale if no wall art detected - conservative sizing
    return 0.5; // Default to 50% scale to prevent oversized frames
  }
  
  // Parse frame size in inches
  const [widthInches, heightInches] = frameSize.split('x').map(Number);
  
  // Convert to Three.js units (feet)
  const frameWidthUnits = (widthInches || 16) / 12;
  const frameHeightUnits = (heightInches || 20) / 12;
  
  // Get wall art dimensions (typically in meters in the GLB model)
  const wallWidth = wallArtSize[0];
  const wallHeight = wallArtSize[1];
  
  // Calculate the maximum dimension of both
  const maxFrameDimension = Math.max(frameWidthUnits, frameHeightUnits);
  const maxWallDimension = Math.max(wallWidth, wallHeight);
  
  // Calculate scale to fit frame within wall art space
  // We want the frame to be slightly smaller than the wall art to look realistic
  const targetScale = (maxWallArtDimension * 0.8) / maxFrameDimension; // 80% of wall art size
  
  // Constrain scale to reasonable limits
  const minScale = 0.3; // Don't go too small
  const maxScale = 1.5; // Don't go too large
  
  const finalScale = Math.max(minScale, Math.min(maxScale, targetScale));
  
  console.log('🎯 Frame scaling:', {
    frameSize,
    frameDimensions: `${frameWidthUnits.toFixed(2)} x ${frameHeightUnits.toFixed(2)} units`,
    wallArtDimensions: `${wallWidth.toFixed(2)} x ${wallHeight.toFixed(2)} units`,
    targetScale: targetScale.toFixed(2),
    finalScale: finalScale.toFixed(2)
  });
  
  return finalScale;
}

// Component to load and render the GLB room model
function RoomModel({ 
  url, 
  scale = 1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  onWallArtFound,
  targetObjectName
}: {
  url: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onWallArtFound?: (info: { position: [number, number, number]; rotation: [number, number, number]; size?: [number, number, number] } | null) => void;
  targetObjectName?: string;
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => {
    const cloned = scene.clone();
    
    // Find and hide wall art, get its position
    const wallArtInfo = findAndHideWallArt(cloned, targetObjectName);
    
    // Notify parent component about wall art position
    if (onWallArtFound) {
      onWallArtFound(wallArtInfo);
    }
    
    return cloned;
  }, [scene, onWallArtFound, targetObjectName]);

  return (
    <primitive
      object={clonedScene}
      scale={scale}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    />
  );
}

// Preload GLB files for better performance
useGLTF.preload(getSupabaseAssetUrlSync('/samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb'));

// Camera controller
function CameraController({ preset, resetTrigger }: { preset: typeof roomPresets[RoomEnvironment]; resetTrigger?: number }) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0 && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetTrigger]);

  return (
    <>
      <PerspectiveCamera makeDefault position={preset.cameraPosition} fov={50} />
      <OrbitControls
        ref={controlsRef}
        target={preset.cameraTarget}
        enableZoom={true}
        enablePan={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={8}
        enableDamping
        dampingFactor={0.05}
      />
    </>
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

export function RoomScene({ config, environment, resetTrigger = 0 }: RoomSceneProps) {
  const preset = roomPresets[environment];
  const glbPath = roomGLBPaths[environment];
  
  // State to store the detected wall art position from the GLB scene
  const [wallArtInfo, setWallArtInfo] = useState<{ position: [number, number, number]; rotation: [number, number, number]; size?: [number, number, number] } | null>(null);
  
  // Use detected wall art position if available, otherwise fall back to preset
  const framePosition = wallArtInfo?.position || preset.framePosition;
  const baseRotation = wallArtInfo?.rotation || preset.frameRotation || [0, 0, 0];
  
  // Rotate frame 90 degrees around Z axis to make it vertical (portrait orientation)
  // Also rotate 90 degrees around Y axis to face the correct direction
  // The frame component renders horizontally by default, so we rotate it to be vertical
  const frameRotation: [number, number, number] = [
    baseRotation[0],
    baseRotation[1] + Math.PI / 2, // Add 90 degrees (π/2 radians) to Y rotation
    baseRotation[2] + Math.PI / 2 // Add 90 degrees (π/2 radians) to Z rotation
  ];
  
  // Calculate frame scale based on wall art size
  const frameScale = useMemo(() => {
    return calculateFrameScale(config.size, wallArtInfo?.size);
  }, [config.size, wallArtInfo?.size]);
  
  // Debug: Log frame position and scale
  useEffect(() => {
    if (wallArtInfo) {
      console.log('🎨 Frame will be positioned at:', framePosition, 'with rotation:', frameRotation, 'scale:', frameScale);
      if (wallArtInfo.size) {
        console.log('🖼️ Wall art size:', wallArtInfo.size.map(v => v.toFixed(2)));
      }
    } else {
      console.log('🎨 Using default frame position:', framePosition, 'with rotation:', frameRotation, 'scale:', frameScale);
    }
  }, [wallArtInfo, framePosition, frameRotation, frameScale]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      className="w-full h-full"
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        {/* Camera */}
        <CameraController preset={preset} resetTrigger={resetTrigger} />

        {/* Basic lighting - GLB models often have baked lighting, but we add some for shadows */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Environment for reflections */}
        <Environment preset="apartment" />

        {/* Load and render the GLB room model */}
        <RoomModel
          url={glbPath}
          scale={preset.roomScale}
          position={preset.roomPosition}
          rotation={preset.roomRotation}
          onWallArtFound={setWallArtInfo}
          targetObjectName={preset.wallArtObjectName}
        />

        {/* Frame and artwork on wall - positioned where the original wall art was */}
        {/* Move frame slightly forward to ensure it's in front of any back objects */}
        {/* Scale the frame group to fit realistically on the wall */}
        <group 
          position={[framePosition[0], framePosition[1], framePosition[2] + 0.02]}
          rotation={frameRotation}
          scale={[frameScale, frameScale, frameScale]}
        >
          <ArtworkPlane 
            imageUrl={config.imageUrl || ''} 
            size={config.size}
            hasMount={config.productType === 'framed-print' && !!config.mount && config.mount !== 'none'}
            mount={config.mount}
          />
          <FrameModel
            key={`${config.productType}-${config.frameColor}-${config.wrap}-${config.glaze}-${config.size}-${config.edge}-${config.canvasType}`}
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

        {/* Shadows */}
        <ContactShadows
          position={[framePosition[0], 0, framePosition[2] + 0.1]}
          opacity={0.3}
          scale={6}
          blur={2}
          far={4}
          resolution={256}
        />
      </Suspense>
    </Canvas>
  );
}

