# AI-Powered Frame Customization: Technical Implementation Guide

## Overview

This document provides technical specifications for implementing the AI-powered frame customization experience described in `AI_POWERED_FRAME_UX_CONCEPT.md`.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
├──────────────┬──────────────────────┬────────────────────────┤
│   AI Chat    │   3D Preview         │   Context Manager      │
│   Interface  │   Engine             │   (State + Logic)      │
│              │                      │                        │
│  React       │   Three.js           │   Zustand/Redux        │
│  + Streaming │   React Three Fiber  │   + Real-time Sync     │
└──────┬───────┴──────────┬───────────┴─────────┬──────────────┘
       │                  │                     │
       ├──────────────────┴─────────────────────┘
       │
┌──────▼───────────────────────────────────────────────────────┐
│                     Backend API Layer (Next.js API)          │
├──────────────────────────────────────────────────────────────┤
│  • OpenAI Integration (Chat + Vision + Functions)           │
│  • Prodigi Integration (Catalog + Orders)                   │
│  • Ideogram Integration (Image Generation)                  │
│  • Image Processing (Sharp, Canvas)                         │
│  • Caching Layer (Redis)                                    │
│  • WebSocket Server (Real-time updates)                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
```json
{
  "framework": "Next.js 14 (App Router)",
  "ui": "React 18 + TypeScript",
  "3d": "Three.js + React Three Fiber + Drei",
  "state": "Zustand + React Query",
  "styling": "Tailwind CSS + Framer Motion",
  "realtime": "Socket.io-client",
  "ar": "WebXR API / AR.js"
}
```

### Backend
```json
{
  "runtime": "Node.js 20",
  "framework": "Next.js API Routes",
  "ai": "OpenAI API (GPT-4, Vision, Whisper)",
  "imageGen": "Ideogram API",
  "fulfillment": "Prodigi API",
  "payment": "Stripe API",
  "storage": "AWS S3 + Cloudfront CDN",
  "cache": "Redis + Upstash",
  "db": "Supabase (PostgreSQL)",
  "realtime": "Socket.io"
}
```

---

## Core Components

### 1. AI Chat Interface

**Component Structure**:
```typescript
// components/AIChat/index.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion } from 'framer-motion';
import { useFrameStore } from '@/store/frame';

export function AIChat() {
  const { frameConfig, updateConfig } = useFrameStore();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  } = useChat({
    api: '/api/ai/chat',
    body: {
      frameConfig,
      imageAnalysis: frameConfig.imageAnalysis
    },
    onFinish: (message) => {
      // Handle function calls from AI
      if (message.function_call) {
        handleAIAction(message.function_call);
      }
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type or speak..."
            className="flex-1 rounded-lg border p-3"
          />
          <VoiceInput onTranscript={setInput} />
          <button type="submit" disabled={isLoading}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Streaming Responses**:
```typescript
// app/api/ai/chat/route.ts
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { openai } from '@/lib/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages, frameConfig, imageAnalysis } = await req.json();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    stream: true,
    messages: [
      {
        role: 'system',
        content: getSystemPrompt(frameConfig, imageAnalysis)
      },
      ...messages
    ],
    functions: [
      {
        name: 'update_frame',
        description: 'Update frame configuration',
        parameters: {
          type: 'object',
          properties: {
            frameColor: { type: 'string' },
            frameStyle: { type: 'string' },
            size: { type: 'string' },
            glaze: { type: 'string' },
            mount: { type: 'string' },
            mountColor: { type: 'string' }
          }
        }
      },
      {
        name: 'show_comparison',
        description: 'Show side-by-side comparison',
        parameters: {
          type: 'object',
          properties: {
            configurations: {
              type: 'array',
              items: { type: 'object' }
            }
          }
        }
      },
      {
        name: 'show_in_room',
        description: 'Trigger room visualization',
        parameters: {
          type: 'object',
          properties: {
            mode: { 
              type: 'string',
              enum: ['upload', 'ar', 'saved']
            }
          }
        }
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  });

  const stream = OpenAIStream(response, {
    onFunctionCall: async ({ name, arguments: args }) => {
      // Handle function calls
      return {
        function: name,
        arguments: args
      };
    }
  });

  return new StreamingTextResponse(stream);
}
```

---

### 2. 3D Frame Preview

**Component Structure**:
```typescript
// components/FramePreview/Scene.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Suspense } from 'react';
import { FrameModel } from './FrameModel';
import { ArtworkPlane } from './ArtworkPlane';

export function FramePreview3D({ config, imageUrl }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      shadows
      dpr={[1, 2]}
    >
      <Suspense fallback={<LoadingPlaceholder />}>
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={1}
          castShadow
        />

        {/* Environment */}
        <Environment preset="studio" />

        {/* Frame and Artwork */}
        <group>
          <ArtworkPlane
            imageUrl={imageUrl}
            dimensions={config.dimensions}
          />
          <FrameModel
            color={config.frameColor}
            style={config.frameStyle}
            dimensions={config.dimensions}
            mount={config.mount}
            mountColor={config.mountColor}
            glaze={config.glaze}
          />
        </group>

        {/* Shadows */}
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
        />

        {/* Controls */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Suspense>
    </Canvas>
  );
}
```

**Frame Model Generator**:
```typescript
// components/FramePreview/FrameModel.tsx
import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function FrameModel({ color, style, dimensions, mount, glaze }) {
  // Load frame textures
  const textures = useTexture({
    map: `/textures/frames/${color}_diffuse.jpg`,
    normalMap: `/textures/frames/${color}_normal.jpg`,
    roughnessMap: `/textures/frames/${color}_roughness.jpg`
  });

  // Calculate frame geometry based on dimensions
  const frameGeometry = useMemo(() => {
    const { width, height, depth } = getFrameDimensions(dimensions, style);
    return createFrameGeometry(width, height, depth, style);
  }, [dimensions, style]);

  // Create materials
  const frameMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      ...textures,
      metalness: style === 'gold' || style === 'silver' ? 0.8 : 0.1,
      roughness: 0.4
    });
  }, [textures, style]);

  // Create glaze material
  const glazeMaterial = useMemo(() => {
    if (!glaze || glaze === 'none') return null;
    
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: glaze === 'motheye' ? 0.05 : 0.1,
      transmission: 0.9,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
  }, [glaze]);

  return (
    <group>
      {/* Frame */}
      <mesh geometry={frameGeometry} material={frameMaterial} castShadow />
      
      {/* Mount/Mat */}
      {mount && mount !== 'none' && (
        <MountPlane
          dimensions={dimensions}
          thickness={mount}
          color={mountColor}
        />
      )}
      
      {/* Glaze */}
      {glazeMaterial && (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <primitive object={glazeMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}

// Helper function to create frame geometry
function createFrameGeometry(width, height, depth, style) {
  const shape = new THREE.Shape();
  const frameWidth = 0.05; // 5cm frame width
  
  // Outer rectangle
  shape.moveTo(-width/2, -height/2);
  shape.lineTo(width/2, -height/2);
  shape.lineTo(width/2, height/2);
  shape.lineTo(-width/2, height/2);
  shape.lineTo(-width/2, -height/2);
  
  // Inner rectangle (hole)
  const hole = new THREE.Path();
  const innerW = width/2 - frameWidth;
  const innerH = height/2 - frameWidth;
  
  hole.moveTo(-innerW, -innerH);
  hole.lineTo(innerW, -innerH);
  hole.lineTo(innerW, innerH);
  hole.lineTo(-innerW, innerH);
  hole.lineTo(-innerW, -innerH);
  
  shape.holes.push(hole);
  
  // Extrude settings based on style
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: style !== 'modern',
    bevelThickness: style === 'ornate' ? 0.01 : 0.005,
    bevelSize: style === 'ornate' ? 0.01 : 0.005,
    bevelSegments: style === 'ornate' ? 8 : 2
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}
```

---

### 3. State Management

**Global Store**:
```typescript
// store/frame.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FrameConfig {
  // Image
  imageUrl: string | null;
  imageAnalysis: ImageAnalysis | null;
  
  // Frame options
  frameColor: string;
  frameStyle: string;
  frameThickness: string;
  
  // Glazing
  glaze: string;
  
  // Mount
  mount: string;
  mountColor: string;
  
  // Size
  size: string;
  customDimensions?: { width: number; height: number };
  
  // Paper
  paperType: string;
  finish: string;
  
  // Pricing
  price: number;
  currency: string;
  
  // Shipping
  sla: number;
  productionCountry: string;
  
  // AI
  aiConfidenceScore: number;
  aiSuggestions: Suggestion[];
}

interface FrameStore {
  config: FrameConfig;
  history: FrameConfig[];
  currentHistoryIndex: number;
  
  // Actions
  updateConfig: (updates: Partial<FrameConfig>) => void;
  resetConfig: () => void;
  undo: () => void;
  redo: () => void;
  saveConfiguration: (name: string) => Promise<void>;
  loadConfiguration: (id: string) => Promise<void>;
  
  // Real-time updates
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

export const useFrameStore = create<FrameStore>()(
  persist(
    (set, get) => ({
      config: getDefaultConfig(),
      history: [],
      currentHistoryIndex: -1,
      
      updateConfig: (updates) => {
        set((state) => {
          const newConfig = { ...state.config, ...updates };
          const newHistory = [
            ...state.history.slice(0, state.currentHistoryIndex + 1),
            newConfig
          ];
          
          // Update pricing in background
          updatePricing(newConfig);
          
          // Trigger AI analysis if significant change
          if (isSignificantChange(updates)) {
            analyzeConfiguration(newConfig);
          }
          
          return {
            config: newConfig,
            history: newHistory,
            currentHistoryIndex: newHistory.length - 1
          };
        });
      },
      
      undo: () => {
        set((state) => {
          if (state.currentHistoryIndex > 0) {
            return {
              config: state.history[state.currentHistoryIndex - 1],
              currentHistoryIndex: state.currentHistoryIndex - 1
            };
          }
          return state;
        });
      },
      
      redo: () => {
        set((state) => {
          if (state.currentHistoryIndex < state.history.length - 1) {
            return {
              config: state.history[state.currentHistoryIndex + 1],
              currentHistoryIndex: state.currentHistoryIndex + 1
            };
          }
          return state;
        });
      },
      
      saveConfiguration: async (name) => {
        const { config } = get();
        await fetch('/api/configurations', {
          method: 'POST',
          body: JSON.stringify({ name, config })
        });
      }
    }),
    {
      name: 'frame-storage',
      partialize: (state) => ({
        config: state.config,
        history: state.history.slice(-10) // Keep last 10 configs
      })
    }
  )
);
```

**Real-time Sync**:
```typescript
// hooks/useRealtimeSync.ts
import { useEffect } from 'react';
import { useFrameStore } from '@/store/frame';
import { socket } from '@/lib/socket';

export function useRealtimeSync() {
  const { config, updateConfig } = useFrameStore();
  
  useEffect(() => {
    // Subscribe to pricing updates
    socket.on('pricing:updated', (data) => {
      if (configMatches(data.config, config)) {
        updateConfig({ price: data.price });
      }
    });
    
    // Subscribe to AI suggestions
    socket.on('ai:suggestion', (suggestion) => {
      updateConfig({
        aiSuggestions: [...config.aiSuggestions, suggestion]
      });
    });
    
    // Subscribe to availability updates
    socket.on('product:availability', (data) => {
      // Update UI if selected product becomes unavailable
    });
    
    return () => {
      socket.off('pricing:updated');
      socket.off('ai:suggestion');
      socket.off('product:availability');
    };
  }, [config]);
}
```

---

### 4. Image Analysis Pipeline

**Backend Analysis**:
```typescript
// app/api/ai/analyze-image/route.ts
import { openai } from '@/lib/openai';
import sharp from 'sharp';

export async function POST(req: Request) {
  const { imageUrl } = await req.json();
  
  // 1. Download and process image
  const imageBuffer = await downloadImage(imageUrl);
  const metadata = await sharp(imageBuffer).metadata();
  
  // 2. Analyze with OpenAI Vision
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this image for custom framing. Provide:
            1. Dominant colors (3-5 hex codes, ordered by prominence)
            2. Color temperature (warm/cool/neutral, with confidence 0-1)
            3. Subject matter (landscape/portrait/abstract/etc)
            4. Mood/aesthetic (3-5 adjectives)
            5. Complexity level (0-1, where 1 is very busy/detailed)
            6. Recommended frame colors (3-5 options with reasoning)
            7. Recommended frame style (classic/modern/ornate/minimal)
            8. Recommended glazing (none/acrylic/glass/motheye)
            9. Mount recommendation (yes/no with reasoning)
            10. Overall confidence score (0-1)
            
            Return as JSON.`
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        }
      ]
    }],
    response_format: { type: 'json_object' },
    max_tokens: 1000
  });
  
  const aiAnalysis = JSON.parse(analysis.choices[0].message.content);
  
  // 3. Calculate additional metrics
  const aspectRatio = (metadata.height! / metadata.width!) * 100;
  const orientation = getOrientation(aspectRatio);
  const optimalSizes = calculateOptimalSizes(metadata.width!, metadata.height!);
  
  // 4. Query Prodigi for matching products
  const matchingProducts = await queryProdigiCatalog({
    aspectRatio,
    frameColors: aiAnalysis.recommendedFrameColors,
    destination: req.geo?.country || 'US'
  });
  
  // 5. Score and rank products
  const rankedProducts = scoreProducts(matchingProducts, aiAnalysis);
  
  // 6. Return complete analysis
  return Response.json({
    image: {
      width: metadata.width,
      height: metadata.height,
      aspectRatio,
      orientation,
      format: metadata.format,
      dpi: metadata.density
    },
    ai: aiAnalysis,
    recommendations: {
      products: rankedProducts.slice(0, 5),
      sizes: optimalSizes,
      nextSteps: generateNextSteps(aiAnalysis, rankedProducts)
    },
    confidence: aiAnalysis.confidence
  });
}

function scoreProducts(products, analysis) {
  return products.map(product => {
    let score = 0;
    
    // Color match (30%)
    if (product.frameColour?.some(c => 
      analysis.recommendedFrameColors.includes(c)
    )) {
      score += 0.3;
    }
    
    // Style match (20%)
    if (product.frame?.some(f => 
      f.toLowerCase().includes(analysis.recommendedFrameStyle)
    )) {
      score += 0.2;
    }
    
    // Glaze match (20%)
    if (product.glaze?.includes(analysis.recommendedGlazing)) {
      score += 0.2;
    }
    
    // Aspect ratio match (20%)
    const ratioDiff = Math.abs(
      product.productAspectRatio - analysis.image.aspectRatio
    );
    score += Math.max(0, 0.2 - (ratioDiff / 100));
    
    // Production location (10%)
    if (product.productionCountries?.includes(userCountry)) {
      score += 0.1;
    }
    
    return {
      ...product,
      matchScore: score,
      matchReasons: generateMatchReasons(product, analysis)
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
```

---

### 5. Room Visualization

**Upload & Detection**:
```typescript
// components/RoomVisualizer/index.tsx
'use client';

import { useState, useRef } from 'react';
import { useFrameStore } from '@/store/frame';

export function RoomVisualizer() {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [wallDetection, setWallDetection] = useState<WallInfo | null>(null);
  const [framePosition, setFramePosition] = useState({ x: 0.5, y: 0.5 });
  const { config } = useFrameStore();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleImageUpload = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setRoomImage(imageUrl);
    
    // Detect walls in the image
    const detection = await detectWalls(file);
    setWallDetection(detection);
    
    // Default position frame on detected wall
    if (detection.walls.length > 0) {
      setFramePosition({
        x: detection.walls[0].center.x,
        y: detection.walls[0].center.y
      });
    }
  };
  
  // Render frame overlay
  useEffect(() => {
    if (!roomImage || !wallDetection) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = roomImage;
    
    img.onload = () => {
      // Draw room image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Calculate frame dimensions based on perspective
      const frameDimensions = calculatePerspectiveDimensions(
        config.dimensions,
        wallDetection.walls[0],
        framePosition
      );
      
      // Render frame
      renderFrameOverlay(ctx, frameDimensions, config);
    };
  }, [roomImage, wallDetection, framePosition, config]);
  
  return (
    <div className="relative">
      {!roomImage ? (
        <UploadZone onUpload={handleImageUpload} />
      ) : (
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={handleDrag}
          onTouchMove={handleDrag}
        />
      )}
      
      {wallDetection && (
        <PositionControls
          position={framePosition}
          onChange={setFramePosition}
        />
      )}
    </div>
  );
}

// Wall detection using OpenAI Vision
async function detectWalls(imageFile: File) {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch('/api/vision/detect-walls', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

// API endpoint for wall detection
// app/api/vision/detect-walls/route.ts
export async function POST(req: Request) {
  const formData = await req.formData();
  const image = formData.get('image') as File;
  
  // Upload to temporary storage
  const imageUrl = await uploadToS3(image);
  
  // Use OpenAI Vision to detect walls
  const analysis = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze this room photo and detect walls suitable for hanging artwork.
            For each wall, provide:
            1. Bounding box coordinates (x1, y1, x2, y2)
            2. Center point
            3. Estimated wall dimensions
            4. Perspective angle
            5. Lighting conditions
            6. Suitability score (0-1)
            
            Return as JSON with array of walls.`
        },
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        }
      ]
    }],
    response_format: { type: 'json_object' }
  });
  
  const walls = JSON.parse(analysis.choices[0].message.content);
  
  return Response.json({
    walls: walls.walls,
    roomInfo: {
      lighting: walls.lighting,
      style: walls.style
    }
  });
}
```

**AR Mode**:
```typescript
// components/ARViewer/index.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useFrameStore } from '@/store/frame';

export function ARViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { config } = useFrameStore();
  
  useEffect(() => {
    initializeAR();
  }, []);
  
  const initializeAR = async () => {
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
    
    // Start AR tracking
    startARTracking();
  };
  
  const startARTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Detect planes/surfaces
      const surfaces = detectSurfaces(ctx);
      
      // Render frame on detected surface
      if (surfaces.length > 0) {
        renderFrameInAR(ctx, surfaces[0], config);
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  };
  
  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      <ARControls />
    </div>
  );
}
```

---

### 6. Smart Suggestions Engine

**Backend Service**:
```typescript
// lib/suggestions/engine.ts
import { openai } from '@/lib/openai';

export async function generateSuggestions(
  config: FrameConfig,
  analysis: ImageAnalysis,
  context: UserContext
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];
  
  // Rule-based suggestions
  suggestions.push(...getRuleBasedSuggestions(config, analysis));
  
  // AI-powered suggestions
  const aiSuggestions = await getAISuggestions(config, analysis, context);
  suggestions.push(...aiSuggestions);
  
  // Rank and filter
  return rankSuggestions(suggestions, context);
}

function getRuleBasedSuggestions(config, analysis): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Mount recommendation
  if (!config.mount && analysis.complexity > 0.6) {
    suggestions.push({
      id: 'add-mount',
      type: 'add',
      target: 'mount',
      value: '2.4mm',
      reason: 'Busy images benefit from breathing room',
      impact: { price: +12, aesthetic: +0.15 },
      confidence: 0.85,
      priority: 1
    });
  }
  
  // Glaze upgrade
  if (config.glaze === 'acrylic' && context.budget > 200) {
    suggestions.push({
      id: 'upgrade-glaze',
      type: 'upgrade',
      target: 'glaze',
      value: 'motheye',
      reason: 'Museum glass eliminates 99% of glare',
      impact: { price: +25, quality: +0.20 },
      confidence: 0.70,
      priority: 2
    });
  }
  
  // Size optimization
  if (context.roomInfo?.wallWidth) {
    const optimal = calculateOptimalSize(
      context.roomInfo.wallWidth,
      context.roomInfo.viewingDistance
    );
    if (optimal !== config.size) {
      suggestions.push({
        id: 'adjust-size',
        type: 'change',
        target: 'size',
        value: optimal,
        reason: `Optimal for ${context.roomInfo.wallWidth}" wall`,
        impact: { price: calculatePriceDiff(config.size, optimal) },
        confidence: 0.90,
        priority: 1
      });
    }
  }
  
  // Color harmony
  const harmoniousColors = getHarmoniousColors(analysis.dominantColors);
  if (!harmoniousColors.includes(config.frameColor)) {
    suggestions.push({
      id: 'harmonize-color',
      type: 'change',
      target: 'frameColor',
      value: harmoniousColors[0],
      reason: `${harmoniousColors[0]} complements your artwork`,
      impact: { price: 0, aesthetic: +0.12 },
      confidence: 0.75,
      priority: 3
    });
  }
  
  return suggestions;
}

async function getAISuggestions(
  config: FrameConfig,
  analysis: ImageAnalysis,
  context: UserContext
): Promise<Suggestion[]> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: `You are an expert art framing consultant. Analyze the current frame configuration and suggest improvements. Consider:
        - Color harmony
        - Style consistency
        - Budget optimization
        - Quality vs price trade-offs
        - Room context
        
        Return 2-3 actionable suggestions as JSON.`
    }, {
      role: 'user',
      content: JSON.stringify({
        config,
        imageAnalysis: analysis,
        userContext: context
      })
    }],
    response_format: { type: 'json_object' }
  });
  
  const aiResponse = JSON.parse(completion.choices[0].message.content);
  return aiResponse.suggestions;
}

function rankSuggestions(
  suggestions: Suggestion[],
  context: UserContext
): Suggestion[] {
  return suggestions
    .map(s => ({
      ...s,
      score: calculateSuggestionScore(s, context)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Top 3 suggestions
}
```

**Frontend Component**:
```typescript
// components/SmartSuggestions/index.tsx
'use client';

import { useSuggestions } from '@/hooks/useSuggestions';
import { useFrameStore } from '@/store/frame';
import { motion, AnimatePresence } from 'framer-motion';

export function SmartSuggestions() {
  const { config, updateConfig } = useFrameStore();
  const { suggestions, isLoading, applySuggestion } = useSuggestions();
  
  if (isLoading || suggestions.length === 0) return null;
  
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">
        ✨ Suggestions
      </h3>
      
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="p-4 bg-white rounded-lg border shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {suggestion.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {suggestion.reason}
                </p>
                
                {/* Impact */}
                <div className="flex gap-2 mt-2 text-xs">
                  {suggestion.impact.price && (
                    <span className={
                      suggestion.impact.price > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }>
                      {suggestion.impact.price > 0 ? '+' : ''}
                      ${Math.abs(suggestion.impact.price)}
                    </span>
                  )}
                  
                  {suggestion.impact.aesthetic && (
                    <span className="text-blue-600">
                      +{Math.round(suggestion.impact.aesthetic * 100)}% appeal
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => applySuggestion(suggestion.id)}
                  className="px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800"
                >
                  Try it
                </button>
                
                <button
                  onClick={() => dismissSuggestion(suggestion.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Confidence indicator */}
            <div className="mt-2">
              <div className="h-1 bg-gray-200 rounded">
                <div
                  className="h-full bg-green-500 rounded transition-all"
                  style={{ width: `${suggestion.confidence * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

### 7. Real-time Pricing

**Pricing Service**:
```typescript
// lib/pricing/calculator.ts
import { cache } from '@/lib/cache';

export async function calculatePrice(config: FrameConfig): Promise<PriceInfo> {
  // Check cache first
  const cacheKey = `price:${hashConfig(config)}`;
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Query Prodigi for exact product and price
  const product = await findMatchingProduct(config);
  if (!product) {
    throw new Error('No matching product found');
  }
  
  // Calculate base price
  let price = product.basePriceFrom;
  
  // Add-ons
  if (config.mount && config.mount !== 'none') {
    price += getMountPrice(config.mount);
  }
  
  if (config.glaze && config.glaze !== 'none') {
    price += getGlazePrice(config.glaze);
  }
  
  // Convert currency
  const convertedPrice = await convertCurrency(
    price,
    product.priceCurrency,
    config.currency
  );
  
  // Calculate shipping
  const shipping = await calculateShipping(
    product.sku,
    config.destination,
    config.expedited
  );
  
  const priceInfo = {
    subtotal: convertedPrice,
    shipping: shipping.cost,
    tax: 0, // Calculate based on destination
    total: convertedPrice + shipping.cost,
    currency: config.currency,
    sla: shipping.sla,
    productionCountry: shipping.origin
  };
  
  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify(priceInfo), 3600);
  
  return priceInfo;
}

// Real-time price updates via WebSocket
// server/socket.ts
import { Server } from 'socket.io';

export function initializeSocketServer(httpServer) {
  const io = new Server(httpServer);
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('subscribe:pricing', async (config) => {
      // Calculate initial price
      const price = await calculatePrice(config);
      socket.emit('pricing:updated', price);
      
      // Subscribe to price updates
      socket.join(`pricing:${config.sku}`);
    });
    
    socket.on('config:changed', async (config) => {
      // Debounce to avoid too many calculations
      clearTimeout(socket.data.priceTimeout);
      
      socket.data.priceTimeout = setTimeout(async () => {
        const price = await calculatePrice(config);
        socket.emit('pricing:updated', price);
      }, 300);
    });
  });
  
  return io;
}
```

**Frontend Hook**:
```typescript
// hooks/useLivePricing.ts
import { useEffect, useState } from 'react';
import { useFrameStore } from '@/store/frame';
import { socket } from '@/lib/socket';

export function useLivePricing() {
  const { config } = useFrameStore();
  const [pricing, setPricing] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Subscribe to pricing updates
    socket.emit('subscribe:pricing', config);
    
    socket.on('pricing:updated', (data) => {
      setPricing(data);
      setLoading(false);
    });
    
    return () => {
      socket.off('pricing:updated');
    };
  }, []);
  
  // Update on config changes
  useEffect(() => {
    setLoading(true);
    socket.emit('config:changed', config);
  }, [config]);
  
  return { pricing, loading };
}
```

---

## Performance Optimization

### 1. 3D Preview Optimization
```typescript
// Techniques:
- Use lower poly models for real-time preview
- Implement LOD (Level of Detail)
- Lazy load textures
- Use instanced rendering for repeated elements
- Implement frustum culling
- Use Web Workers for heavy calculations

// Example: LOD implementation
import { useLOD } from '@react-three/drei';

function OptimizedFrameModel({ distance }) {
  const [detailed, medium, simple] = useMemo(() => [
    createDetailedGeometry(),
    createMediumGeometry(),
    createSimpleGeometry()
  ], []);
  
  const geometry = useLOD({
    near: { geometry: detailed, distance: 0 },
    medium: { geometry: medium, distance: 5 },
    far: { geometry: simple, distance: 10 }
  }, distance);
  
  return <mesh geometry={geometry} />;
}
```

### 2. AI Response Caching
```typescript
// Cache AI responses for identical queries
const analyzeImageCached = cache(
  async (imageUrl: string) => {
    return await analyzeImageWithAI(imageUrl);
  },
  {
    key: (imageUrl) => `analysis:${hashImage(imageUrl)}`,
    ttl: 3600 * 24 // 24 hours
  }
);
```

### 3. Image Optimization
```typescript
// Optimize images before processing
async function optimizeImage(file: File): Promise<Buffer> {
  return await sharp(await file.arrayBuffer())
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();
}
```

### 4. Debounced Updates
```typescript
// Debounce real-time updates
import { useDebouncedCallback } from 'use-debounce';

const debouncedUpdate = useDebouncedCallback(
  (config) => {
    socket.emit('config:changed', config);
  },
  300
);
```

---

## Testing Strategy

### Unit Tests
```typescript
// __tests__/lib/suggestions.test.ts
import { generateSuggestions } from '@/lib/suggestions';

describe('Suggestion Engine', () => {
  it('recommends mount for busy images', async () => {
    const config = { mount: 'none' };
    const analysis = { complexity: 0.8 };
    
    const suggestions = await generateSuggestions(config, analysis, {});
    
    expect(suggestions).toContainEqual(
      expect.objectContaining({
        target: 'mount',
        type: 'add'
      })
    );
  });
});
```

### Integration Tests
```typescript
// __tests__/integration/ai-flow.test.ts
import { render, screen, userEvent } from '@testing-library/react';
import { AIChat } from '@/components/AIChat';

describe('AI Chat Flow', () => {
  it('completes full frame customization via chat', async () => {
    render(<AIChat />);
    
    const input = screen.getByPlaceholderText('Type or speak...');
    
    await userEvent.type(input, 'I want a black frame');
    await userEvent.keyboard('{Enter}');
    
    expect(await screen.findByText(/black frame/i)).toBeInTheDocument();
    
    // Verify frame config updated
    expect(useFrameStore.getState().config.frameColor).toBe('black');
  });
});
```

---

## Deployment

### Environment Variables
```bash
# .env.production
NEXT_PUBLIC_SITE_URL=https://artframer.com
NEXT_PUBLIC_WS_URL=wss://artframer.com

# APIs
OPENAI_API_KEY=sk-...
IDEOGRAM_API_KEY=...
PRODIGI_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...

# Storage
AWS_S3_BUCKET=artframer-images
AWS_CLOUDFRONT_URL=https://cdn.artframer.com

# Cache
REDIS_URL=redis://...
```

### Infrastructure
```yaml
# docker-compose.yml (for development)
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: artframer
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
```

---

## Monitoring & Analytics

### Track Key Metrics
```typescript
// lib/analytics.ts
import { track } from '@/lib/tracking';

export function trackFrameAction(action: string, properties: any) {
  track('Frame Action', {
    action,
    ...properties,
    timestamp: Date.now()
  });
}

// Usage
trackFrameAction('ai_suggestion_applied', {
  suggestionId: suggestion.id,
  suggestionType: suggestion.type,
  configBefore: beforeConfig,
  configAfter: afterConfig
});

trackFrameAction('preview_interacted', {
  interactionType: '3d_rotation',
  duration: 5000
});

trackFrameAction('room_visualized', {
  mode: 'upload',
  success: true
});
```

---

## Security Considerations

### API Rate Limiting
```typescript
// middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true
});

export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }
}
```

### Input Validation
```typescript
// Validate all user inputs
import { z } from 'zod';

const FrameConfigSchema = z.object({
  frameColor: z.enum(['black', 'white', 'natural', 'gold', 'silver']),
  frameStyle: z.enum(['classic', 'modern', 'ornate']),
  size: z.string().regex(/^\d+x\d+$/),
  glaze: z.enum(['none', 'acrylic', 'glass', 'motheye']),
  mount: z.enum(['none', '1.4mm', '2.0mm', '2.4mm'])
});

export function validateConfig(config: unknown) {
  return FrameConfigSchema.parse(config);
}
```

---

## Next Steps

1. **Week 1-2**: Implement MVP
   - Basic AI chat with OpenAI
   - Simple 2D preview
   - Core frame options
   - Pricing integration

2. **Week 3-4**: Add 3D & Visuals
   - Three.js integration
   - Realistic materials
   - Smooth transitions

3. **Week 5-6**: Smart Features
   - AI suggestions
   - Image analysis
   - Recommendations

4. **Week 7-8**: Room Visualization
   - Upload & overlay
   - AR mode
   - Size validation

5. **Week 9-10**: Polish & Optimize
   - Performance tuning
   - Error handling
   - Testing
   - Launch!

---

**Document Version**: 1.0  
**Created**: November 20, 2024  
**Status**: Technical Specification - Ready for Development

