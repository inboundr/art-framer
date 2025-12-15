# Intelligent Generation Flow - Complete Analysis & Redesign

**Date**: January 2025  
**Version**: V2 Architecture  
**Status**: Analysis & Design Document

---

## 📋 Table of Contents

1. [Existing Flow Analysis](#1-existing-flow-analysis)
2. [New Intelligent Generation Flow Design](#2-new-intelligent-generation-flow-design)
3. [AI Agent Integration](#3-ai-agent-integration)
4. [Frame-Ready Artwork Optimization](#4-frame-ready-artwork-optimization)
5. [Implementation Plan](#5-implementation-plan)
6. [Code Snippets & Examples](#6-code-snippets--examples)

---

## 1️⃣ Existing Flow Analysis

### 1.1 Home Page Generation Flow

#### Current User Journey

```
User → SearchBar Component → Enters Prompt → Clicks Generate
  ↓
[If not authenticated] → Auth Modal → Login → Resume Generation
  ↓
GenerationPanel Opens → Auto-starts Generation
  ↓
Ideogram API Call → Polling for Status → Images Received
  ↓
Images Displayed in Grid → User Clicks Image → CreationsModal Opens
  ↓
User Can Order Frame → Redirects to Studio Page
```

#### Technical Flow

1. **Entry Point**: `src/components/SearchBar.tsx`
   - User types prompt in textarea
   - User configures settings (aspect ratio, model, speed, style, color)
   - User can attach reference images
   - Click "Generate" button

2. **Settings Collection**:

   ```typescript
   {
     aspectRatio: '1x1' | '16x9' | '9x16' | ... (15 options),
     numberOfImages: 1-8,
     model: 'V_3' | 'V_2' | 'V_1',
     renderSpeed: 'TURBO' | 'DEFAULT' | 'QUALITY',
     style: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION',
     color: 'AUTO' | 'EMBER' | 'FRESH' | 'JUNGLE' | ... (8 palettes),
     referenceImages: string[]
   }
   ```

3. **Generation Trigger**: `src/components/GenerationPanel.tsx`
   - Receives prompt + settings from SearchBar
   - Auto-starts generation on mount (if prompt provided)
   - Uses `useImageGeneration` hook

4. **API Call Chain**:

   ```
   GenerationPanel → useImageGeneration hook
     ↓
   createIdeogramAPI → /api/ideogram/[...path]/route.ts
     ↓
   Ideogram API (https://api.ideogram.ai/v1/ideogram-v3/generate)
     ↓
   Response: { id, status, images: [...] }
     ↓
   Polling: /api/ideogram/v1/ideogram-v3/status/{id}
   ```

5. **Image Saving**:
   - Each generated image saved via `saveGeneratedImageToSupabase()`
   - Calls `/api/save-image` route
   - Uploads to Supabase Storage bucket `images`
   - Saves metadata to `public.images` table

#### Pain Points Identified

**❌ UX Issues:**

1. **Overwhelming Settings**: 6+ technical dropdowns exposed directly
   - Aspect Ratio: 15 options (1x1, 16x9, 9x16, 4x3, 3x4, 3x2, 2x3, 1x3, 3x1, 10x16, 16x10, 1x2, 2x1, 4x5, 5x4)
   - Model: 5 versions (3.0-latest, 3.0-march26, 2.0, 2a, 1.0)
   - Speed: 3 options (default, turbo, quality)
   - Style: 5 options (auto, realistic, design, general, random)
   - Color: 9 palettes (auto + 8 named palettes)
   - Magic Prompt: 3 options (on, off, auto)

2. **No Guidance**: Users don't understand:
   - Which aspect ratio works for framing
   - What "style" means in context
   - When to use "turbo" vs "quality"
   - How color palettes affect output

3. **No Intent Understanding**: System doesn't know:
   - User wants "bedroom art" → should suggest portrait/square
   - User wants "office poster" → should suggest landscape
   - User wants "gift" → should optimize for print quality

4. **Inconsistent Quality**:
   - No prompt optimization
   - No validation of output quality
   - No retry mechanism for poor results

5. **No Frame Context**:
   - Generated images may not fit Prodigi frame sizes
   - Aspect ratios don't match standard print sizes
   - No validation for print-ready requirements

**❌ Technical Issues:**

1. **Raw API Exposure**: Ideogram parameters passed directly without intelligence
2. **No Prompt Enhancement**: User prompt sent as-is to API
3. **No Quality Checks**: Images saved regardless of quality
4. **Limited Metadata**: Only basic fields stored (prompt, aspect_ratio, model, style, color)
5. **No Agent Integration**: Generation flow completely separate from Studio Agent system

---

### 1.2 My Creations Flow

#### Current User Journey

```
User → /creations page → UserImageGallery Component
  ↓
Displays user's generated images from Supabase
  ↓
User clicks image → CreationsModal opens
  ↓
User can view image details → Click "Order Frame" → Redirects to Studio
```

#### Technical Flow

1. **Entry Point**: `src/app/creations/page.tsx`
   - Uses `SearchBar` component (same as home)
   - Uses `UserImageGallery` instead of `CuratedImageGallery`

2. **Image Retrieval**: `src/components/UserImageGallery.tsx`
   - Queries `public.images` table filtered by `user_id`
   - Displays images in grid layout

3. **Generation from Creations**:
   - Same flow as Home page
   - If user not authenticated, redirects to home page with localStorage flag

#### Pain Points

- Same issues as Home page
- No way to regenerate variations
- No way to improve existing prompts
- No suggestions for similar styles

---

### 1.3 Ideogram API Integration

#### Current Implementation

**API Client**: `src/lib/ideogram/api.ts`

```typescript
interface IdeogramImageGenerationRequest {
  prompt: string;
  aspect_ratio?: '1x1' | '16x9' | ... (15 options);
  model?: 'V_1' | 'V_1_TURBO' | 'V_2' | ... (7 options);
  num_images?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY';
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
  color_palette?: object;
  magic_prompt?: 'AUTO' | 'ON' | 'OFF';
  character_reference_images?: string[];
  seed?: number;
}
```

**Proxy Route**: `src/app/api/ideogram/[...path]/route.ts`

- Authenticates user via JWT
- Proxies requests to Ideogram API
- Handles FormData for image uploads

**Hook**: `src/hooks/useImageGeneration.ts`

- Manages generation state
- Polls for status updates
- Handles errors

#### Exposed Parameters

All Ideogram parameters are exposed directly in UI:

- **SearchBar**: Shows all dropdowns
- **GenerationPanel**: Receives all settings as props
- **No Abstraction**: No intelligent layer between user and API

---

### 1.4 Supabase Storage & Metadata

#### Current Schema

**Table**: `public.images`

```sql
CREATE TABLE public.images (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  prompt TEXT NOT NULL,
  aspect_ratio VARCHAR(20), -- Stored as string, not enum
  model VARCHAR(100),
  style VARCHAR(100),
  color VARCHAR(100),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status VARCHAR(50),
  is_public BOOLEAN,
  likes INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Storage**: Supabase Storage bucket `images`

- Images uploaded from Ideogram URLs
- Public URLs generated for display

#### Missing Metadata

**Not Stored:**

- Original user intent (e.g., "bedroom art", "gift")
- Optimized prompt (if different from user input)
- Quality score
- Frame compatibility info
- Generation parameters (rendering_speed, magic_prompt, seed)
- Retry attempts
- User feedback (likes, dislikes)

---

### 1.5 Studio Agent System

#### Current Architecture

**Orchestrator**: `src/lib/studio/multi-agent/orchestrator.ts`

- Routes user messages to specialized agents
- Synthesizes multiple agent responses
- Uses keyword matching for agent selection

**Agents**:

1. **prodigi-config-agent**: Technical Prodigi questions
2. **frame-advisor-agent**: Frame recommendations
3. **image-generation-agent**: Image generation help (basic)
4. **pricing-advisor-agent**: Pricing questions

**Image Generation Agent**: `src/lib/studio/multi-agent/agents/image-generation-agent.ts`

- Currently only provides prompt suggestions
- Does NOT actually generate images
- Does NOT integrate with Ideogram API
- Limited to chat-based guidance

#### Agent Capabilities

**Current Tools**:

- `generatePrompt`: Enhances user prompts
- `recommendImageSelection`: Helps choose from generated images

**Missing Tools**:

- `generateImage`: Actually trigger Ideogram generation
- `optimizeForFraming`: Adjust prompts for print quality
- `validateImageQuality`: Check if image meets standards
- `suggestVariations`: Generate similar images
- `selectOptimalParameters`: Choose best Ideogram settings

#### Agent Flow

```
User Message → Orchestrator → Select Agents
  ↓
Image Generation Agent (if keywords match)
  ↓
generatePrompt Tool → Returns enhanced prompt
  ↓
Response to User (text only, no actual generation)
```

**Gap**: Agent provides suggestions but doesn't execute generation.

---

### 1.6 Complete Flow Map

#### User Steps (Current)

```
1. User opens Home page
2. User types prompt in SearchBar
3. User configures 6+ technical settings
4. User clicks "Generate"
5. [If not authenticated] → Login → Resume
6. GenerationPanel opens
7. Generation auto-starts
8. User waits for images
9. Images appear in grid
10. User clicks image
11. CreationsModal opens
12. User can order frame
```

#### System Steps (Current)

```
1. SearchBar collects prompt + settings
2. GenerationPanel receives props
3. useImageGeneration hook called
4. createIdeogramAPI.generateImage() called
5. Request sent to /api/ideogram/[...path]
6. JWT authentication checked
7. Request proxied to Ideogram API
8. Response received: { id, status, images }
9. Polling starts for status updates
10. Images received
11. Each image saved to Supabase Storage
12. Metadata saved to public.images table
13. Images displayed in UI
```

#### Weaknesses Summary

| Category        | Issue                       | Impact                          |
| --------------- | --------------------------- | ------------------------------- |
| **UX**          | Too many technical settings | Confusing, poor conversion      |
| **UX**          | No guidance or suggestions  | Users don't know what to choose |
| **UX**          | No intent understanding     | Generic experience              |
| **Quality**     | No prompt optimization      | Inconsistent results            |
| **Quality**     | No quality validation       | Poor images saved               |
| **Integration** | Agent system not used       | Missed opportunity              |
| **Framing**     | No frame compatibility      | Images may not fit frames       |
| **Metadata**    | Limited storage             | Can't improve over time         |

#### Opportunities

1. **Intelligent Prompt Enhancement**: Use AI to improve user prompts
2. **Context-Aware Suggestions**: Understand user intent (bedroom, office, gift)
3. **Automatic Parameter Selection**: Hide technical settings, choose optimal values
4. **Frame-Optimized Generation**: Ensure images fit Prodigi frame sizes
5. **Quality Validation**: Check images before saving
6. **Agent Integration**: Use Studio Agent to drive generation
7. **Variation Suggestions**: Generate similar images automatically
8. **Learning System**: Track what works, improve over time

---

## 2️⃣ New Intelligent Generation Flow Design

### 2.1 UX Journey (Step-by-Step)

#### Phase 1: Intent Capture

**Step 1: User Enters Natural Language Prompt**

```
User types: "I want minimalist art for my bedroom"
```

**Step 2: AI Agent Analyzes Intent**

- Detects: Room context (bedroom), style preference (minimalist), purpose (decoration)
- Extracts: Mood, colors, size hints, frame preferences

**Step 3: Smart Suggestions Appear**

- **Style Suggestions**: "Minimalist", "Abstract", "Geometric"
- **Color Suggestions**: "Neutral tones", "Pastels", "Monochrome"
- **Size Suggestions**: "Portrait (fits 16x20 frames)", "Square (fits 12x12 frames)"
- **Frame Suggestions**: "Black frame", "Natural wood frame"

**Step 4: User Selects or Refines**

- User can accept suggestions or modify
- Agent provides real-time feedback

#### Phase 2: Intelligent Generation

**Step 5: Agent Optimizes Prompt**

- Original: "I want minimalist art for my bedroom"
- Optimized: "Minimalist abstract art, soft neutral color palette, calm and serene mood, high contrast for print quality, suitable for bedroom wall art, 16x20 aspect ratio"

**Step 6: Agent Selects Optimal Parameters**

- **Aspect Ratio**: `4x5` (matches 16x20 frame)
- **Model**: `V_3` (best quality)
- **Rendering Speed**: `QUALITY` (for print)
- **Style**: `DESIGN` (best for minimalist)
- **Color Palette**: `PASTEL` (matches bedroom aesthetic)
- **Magic Prompt**: `ON` (enhance prompt further)
- **Number of Images**: `4` (give user options)

**Step 7: Generation Starts with Progress Updates**

- "Understanding your vision..."
- "Optimizing for print quality..."
- "Generating your art..."
- "Almost ready..."

#### Phase 3: Quality Validation & Selection

**Step 8: Images Generated**

- 4 images appear in grid
- Each image shows quality indicators

**Step 9: Agent Analyzes Each Image**

- **Quality Score**: 0-100 (based on contrast, resolution, composition)
- **Frame Compatibility**: ✅ "Perfect for 16x20 frames"
- **Style Match**: ✅ "Matches minimalist aesthetic"
- **Print Readiness**: ✅ "High contrast, print-ready"

**Step 10: Smart Recommendations**

- Agent highlights best image: "This one works best for framing"
- Shows reasoning: "High contrast, balanced composition, print-ready colors"

**Step 11: User Selects Image**

- User clicks preferred image
- Can request variations: "Generate similar but with blue tones"

#### Phase 4: Frame Integration

**Step 12: Frame Suggestions**

- Agent suggests compatible frames based on image
- Shows preview: "This looks great in a black frame"
- Displays Prodigi product options

**Step 13: User Orders Frame**

- Seamless transition to Studio page
- Frame configuration pre-filled

---

### 2.2 UI Component Structure

#### New Components (Text Wireframes)

```
┌─────────────────────────────────────────────────────────┐
│  Intelligent Generation Interface                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  What would you like to create?                 │   │
│  │  ┌───────────────────────────────────────────┐ │   │
│  │  │ I want minimalist art for my bedroom      │ │   │
│  │  │                                           │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  │                                                 │   │
│  │  💡 AI Suggestions:                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│  │  │ Minimalist│ │ Abstract │ │ Geometric│      │   │
│  │  └──────────┘ └──────────┘ └──────────┘      │   │
│  │                                                 │   │
│  │  🎨 Colors: Neutral tones | Pastels | Monochrome│   │
│  │  📐 Size: Portrait (16x20) | Square (12x12)    │   │
│  │  🖼️ Frame: Black | Natural wood                 │   │
│  │                                                 │   │
│  │  [Generate Art]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│  Generation Progress                                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ✨ Understanding your vision...                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  Your optimized prompt:                                  │
│  "Minimalist abstract art, soft neutral color palette,  │
│   calm and serene mood, high contrast for print quality, │
│   suitable for bedroom wall art, 16x20 aspect ratio"     │
│                                                           │
│  Settings: Quality mode | 4 images | Design style        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│  Your Art is Ready!                                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ [Image 1]│ │ [Image 2]│ │ [Image 3]│ │ [Image 4]│  │
│  │ ⭐ 95    │ │ ⭐ 87    │ │ ⭐ 92    │ │ ⭐ 89    │  │
│  │ ✅ Frame │ │ ✅ Frame │ │ ✅ Frame │ │ ✅ Frame │  │
│  │ Ready    │ │ Ready    │ │ Ready    │ │ Ready    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                           │
│  💡 AI Recommendation: Image 1 works best for framing    │
│  "High contrast, balanced composition, print-ready"        │
│                                                           │
│  [Generate Variations] [Select & Frame]                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

#### Component Hierarchy

```
IntelligentGenerationPanel (New)
├── IntentCaptureSection
│   ├── PromptInput (Enhanced)
│   ├── AISuggestions (New)
│   │   ├── StyleSuggestions
│   │   ├── ColorSuggestions
│   │   ├── SizeSuggestions
│   │   └── FrameSuggestions
│   └── SmartSettings (Hidden, auto-selected)
│
├── GenerationProgressSection
│   ├── ProgressIndicator
│   ├── OptimizedPromptDisplay
│   └── SettingsSummary
│
├── ResultsSection
│   ├── ImageGrid
│   ├── QualityIndicators (New)
│   ├── AIRecommendation (New)
│   └── ActionButtons
│
└── FrameIntegrationSection (New)
    ├── FrameSuggestions
    └── QuickOrderButton
```

---

### 2.3 How Suggestions Appear

#### Real-Time Suggestions

**Trigger**: User types in prompt input

**Display**: Suggestions appear below input as user types

**Types of Suggestions**:

1. **Style Suggestions** (appear after 3+ words)

   ```
   User types: "minimalist art"
   Suggestions: [Minimalist] [Abstract] [Geometric] [Modern]
   ```

2. **Context Suggestions** (appear after room/space mention)

   ```
   User types: "for my bedroom"
   Suggestions: [Bedroom-friendly colors] [Portrait orientation] [Calm mood]
   ```

3. **Color Suggestions** (appear after style selection)

   ```
   User selects: "Minimalist"
   Suggestions: [Neutral tones] [Pastels] [Monochrome] [Warm grays]
   ```

4. **Size Suggestions** (appear after context)
   ```
   User mentions: "bedroom"
   Suggestions: [16x20 Portrait] [12x12 Square] [20x24 Landscape]
   ```

#### AI Agent Guidance

**Chat Interface** (Optional, expandable)

```
┌─────────────────────────────────────┐
│  💬 Need help? Ask me anything       │
│  ┌─────────────────────────────────┐│
│  │ "What size works for a bedroom?" ││
│  │ → I recommend 16x20 portrait... ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

---

### 2.4 Error & Low-Quality Handling

#### Error Scenarios

**1. Poor Quality Prompt**

```
User: "art"
Agent: "I can help you create something amazing! Could you tell me:
        - What style do you like? (e.g., minimalist, abstract, realistic)
        - Where will it be displayed? (e.g., bedroom, office, living room)
        - What mood are you going for? (e.g., calm, energetic, peaceful)"
```

**2. Generation Failure**

```
Error: "Generation failed. Let me try again with adjusted settings..."
[Retry with different parameters]
```

**3. Low Quality Images**

```
Quality Score < 70: "These images didn't meet our quality standards.
                     Let me generate new ones with improved settings..."
[Auto-retry with quality mode]
```

**4. No Frame Compatibility**

```
Warning: "These images may not fit standard frame sizes.
          I'll adjust the aspect ratio for better framing..."
[Regenerate with compatible aspect ratio]
```

#### Quality Validation Pipeline

```
Generated Image
  ↓
Quality Check
  ├── Resolution Check (≥ 1024x1024)
  ├── Contrast Check (sufficient for print)
  ├── Color Check (printable colors, no heavy blacks)
  ├── Composition Check (balanced, no edge issues)
  └── Frame Compatibility Check (matches Prodigi sizes)
  ↓
Quality Score Calculated (0-100)
  ↓
If Score < 70: Auto-retry with improved settings
If Score ≥ 70: Display with quality indicators
```

---

## 3️⃣ AI Agent Integration

### 3.1 Agent Reasoning Chain

#### Complete Flow

```
User Input: "I want minimalist art for my bedroom"
  ↓
[Intent Detection Agent]
  ├── Extracts: room=bedroom, style=minimalist, purpose=decoration
  ├── Infers: mood=calm, colors=neutral, size=medium
  └── Output: StructuredIntent
  ↓
[Prompt Optimization Agent]
  ├── Takes: Original prompt + Intent
  ├── Enhances: Adds framing context, print quality hints
  ├── Validates: Ensures prompt is specific enough
  └── Output: OptimizedPrompt
  ↓
[Parameter Selection Agent]
  ├── Takes: Intent + OptimizedPrompt
  ├── Considers: Frame compatibility, print quality, user preferences
  ├── Selects: Optimal Ideogram parameters
  └── Output: IdeogramRequest
  ↓
[Generation Execution]
  ├── Calls: Ideogram API with optimized request
  ├── Monitors: Generation progress
  └── Output: GeneratedImages[]
  ↓
[Quality Validation Agent]
  ├── Analyzes: Each generated image
  ├── Scores: Quality, frame compatibility, style match
  └── Output: QualityReport[]
  ↓
[Recommendation Agent]
  ├── Takes: Images + QualityReports
  ├── Ranks: Images by suitability for framing
  └── Output: Recommendations
  ↓
[Frame Suggestion Agent]
  ├── Takes: Selected image + User context
  ├── Matches: Prodigi products
  └── Output: FrameSuggestions
```

### 3.2 Backend Endpoints Needed

#### New API Routes

**1. `/api/v2/generation/intent`** (POST)

```typescript
// Analyze user intent from prompt
Request: { prompt: string, context?: any }
Response: {
  intent: {
    room?: string,
    style?: string,
    mood?: string,
    colors?: string[],
    size?: string,
    purpose?: string
  },
  suggestions: {
    styles: string[],
    colors: string[],
    sizes: string[],
    frames: string[]
  }
}
```

**2. `/api/v2/generation/optimize-prompt`** (POST)

```typescript
// Optimize user prompt for Ideogram
Request: {
  prompt: string,
  intent: StructuredIntent,
  preferences?: any
}
Response: {
  optimizedPrompt: string,
  reasoning: string,
  parameters: IdeogramRequest
}
```

**3. `/api/v2/generation/generate`** (POST)

```typescript
// Intelligent generation endpoint
Request: {
  prompt: string,
  intent?: StructuredIntent,
  preferences?: any
}
Response: {
  generationId: string,
  optimizedPrompt: string,
  parameters: IdeogramRequest,
  status: 'pending' | 'generating' | 'completed'
}
```

**4. `/api/v2/generation/validate-quality`** (POST)

```typescript
// Validate image quality
Request: { imageUrl: string, prompt: string }
Response: {
  qualityScore: number,
  frameCompatible: boolean,
  issues: string[],
  recommendations: string[]
}
```

**5. `/api/v2/generation/suggest-frames`** (POST)

```typescript
// Suggest frames for image
Request: { imageId: string, imageUrl: string }
Response: {
  suggestions: Array<{
    productSku: string,
    frameColor: string,
    size: string,
    price: number,
    matchScore: number,
    reasoning: string
  }>
}
```

**6. `/api/v2/generation/variations`** (POST)

```typescript
// Generate variations of existing image
Request: {
  imageId: string,
  variationType: 'color' | 'style' | 'composition',
  direction: string
}
Response: {
  generationId: string,
  variations: GeneratedImage[]
}
```

### 3.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  IntelligentGenerationPanel                                   │
│    ├── IntentCaptureSection                                  │
│    ├── AISuggestions                                         │
│    └── ResultsSection                                        │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Requests
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Next.js API Routes (V2)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /api/v2/generation/intent                                   │
│  /api/v2/generation/optimize-prompt                           │
│  /api/v2/generation/generate                                  │
│  /api/v2/generation/validate-quality                        │
│  /api/v2/generation/suggest-frames                           │
│  /api/v2/generation/variations                               │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Service Calls
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            AI Agent System (Extended)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Intent Detection Agent                                       │
│    └── Uses: OpenAI GPT-4o-mini                              │
│                                                               │
│  Prompt Optimization Agent                                    │
│    └── Uses: OpenAI GPT-4o-mini + Ideogram knowledge        │
│                                                               │
│  Parameter Selection Agent                                    │
│    └── Uses: Rule-based + ML (frame compatibility)            │
│                                                               │
│  Quality Validation Agent                                     │
│    └── Uses: Image analysis + Computer vision                │
│                                                               │
│  Frame Suggestion Agent                                       │
│    └── Uses: Prodigi catalog + Matching algorithm            │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ API Calls
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              External Services                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Ideogram API                                                 │
│    └── /v1/ideogram-v3/generate                              │
│                                                               │
│  Supabase                                                     │
│    ├── Storage: images bucket                                │
│    └── Database: public.images table                         │
│                                                               │
│  Prodigi API                                                  │
│    └── Product catalog search                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Edge Case Handling

#### 1. Ambiguous Prompts

```typescript
// User: "art"
// Agent detects low specificity
// Response: Ask clarifying questions
if (promptSpecificity < 0.3) {
  return {
    needsClarification: true,
    questions: [
      "What style do you prefer?",
      "Where will this be displayed?",
      "What mood are you going for?",
    ],
  };
}
```

#### 2. Conflicting Preferences

```typescript
// User: "bright colors for a bedroom" (conflict: bright vs bedroom)
// Agent resolves: Suggest muted brights, pastels
if (hasConflict(intent)) {
  return resolveConflict(intent, {
    prioritize: "room_context", // Bedroom > color preference
    adjust: "mute_colors",
  });
}
```

#### 3. Unsupported Aspect Ratios

```typescript
// User requests: "1x3" aspect ratio
// Agent checks: Prodigi frame compatibility
// Response: Suggest compatible ratio
if (!isFrameCompatible(aspectRatio)) {
  return {
    suggestion: findClosestCompatibleRatio(aspectRatio),
    reasoning:
      "This ratio doesn't match standard frame sizes. I've adjusted it to 16x20 for better framing options.",
  };
}
```

#### 4. Generation Failures

```typescript
// Ideogram API returns error
// Agent retries with adjusted parameters
if (generationFailed) {
  const retryParams = adjustParameters(originalParams, {
    reduceComplexity: true,
    useFallbackModel: true,
  });
  return retryGeneration(retryParams);
}
```

#### 5. Low Quality Results

```typescript
// All images score < 70
// Agent auto-retries with quality mode
if (allImagesQuality < 70) {
  return {
    action: "retry",
    newParams: {
      ...originalParams,
      rendering_speed: "QUALITY",
      model: "V_3",
      magic_prompt: "ON",
    },
    message: "These didn't meet our quality standards. Generating new ones...",
  };
}
```

---

## 4️⃣ Frame-Ready Artwork Optimization

### 4.1 Rules Agent Must Enforce

#### Aspect Ratio Rules

**Prodigi Frame Sizes** (from analysis):

- **Portrait**: 8x10, 11x14, 16x20, 20x24, 24x30
- **Square**: 12x12, 16x16, 20x20, 24x24
- **Landscape**: 16x20, 20x24, 24x30, 30x40

**Ideogram Aspect Ratios**:

- `1x1` → Maps to: 12x12, 16x16, 20x20, 24x24
- `4x5` → Maps to: 16x20, 20x24
- `3x4` → Maps to: 12x16, 16x20
- `2x3` → Maps to: 16x24, 20x30
- `16x9` → Maps to: Custom sizes only

**Rule**: Agent must map user requests to Prodigi-compatible aspect ratios.

```typescript
const FRAME_COMPATIBLE_RATIOS = {
  "1x1": ["12x12", "16x16", "20x20", "24x24"],
  "4x5": ["16x20", "20x24"],
  "3x4": ["12x16", "16x20"],
  "2x3": ["16x24", "20x30"],
  "16x9": [], // Not compatible, suggest alternative
};
```

#### Print Quality Rules

**1. Resolution Requirements**

- Minimum: 1024x1024 pixels
- Recommended: 2048x2048+ for large prints
- Rule: Agent must request high-resolution generation

**2. Contrast Requirements**

- Minimum contrast ratio: 3:1 for print
- Rule: Agent must add contrast hints to prompt
- Example: "high contrast, print-ready colors"

**3. Color Requirements**

- Avoid: Pure black (#000000) - doesn't print well
- Avoid: Very dark colors - may appear as black
- Prefer: Rich, saturated colors
- Rule: Agent must add color guidance to prompt

**4. Composition Requirements**

- Safe margins: 5% on all sides
- Rule: Agent must add composition hints
- Example: "centered composition, safe margins for framing"

#### Style Rules for Framing

**Best Styles for Framing**:

- `DESIGN`: Best for abstract, geometric art
- `REALISTIC`: Best for photographs, detailed art
- `GENERAL`: Good for most artwork

**Avoid for Framing**:

- Heavy text (may not scale well)
- Extreme close-ups (may look odd in frame)
- Rule: Agent must guide style selection

### 4.2 Validation Pipeline

#### Pre-Generation Validation

```typescript
function validateBeforeGeneration(
  request: GenerationRequest
): ValidationResult {
  const issues: string[] = [];

  // Check aspect ratio compatibility
  if (!isFrameCompatible(request.aspectRatio)) {
    issues.push("Aspect ratio not compatible with standard frames");
    request.aspectRatio = findCompatibleRatio(request.aspectRatio);
  }

  // Check prompt quality
  if (request.prompt.length < 10) {
    issues.push("Prompt too short, may result in poor quality");
  }

  // Check parameter combinations
  if (request.renderingSpeed === "TURBO" && request.model === "V_3") {
    issues.push("Turbo mode may reduce quality for print");
    request.renderingSpeed = "QUALITY";
  }

  return {
    valid: issues.length === 0,
    issues,
    adjustedRequest: request,
  };
}
```

#### Post-Generation Validation

```typescript
async function validateGeneratedImage(
  imageUrl: string,
  prompt: string
): Promise<QualityReport> {
  // Fetch image
  const image = await loadImage(imageUrl);

  // Check resolution
  const resolution = image.width * image.height;
  const resolutionScore =
    resolution >= 2048 * 2048 ? 100 : resolution >= 1024 * 1024 ? 80 : 40;

  // Check contrast
  const contrast = calculateContrast(image);
  const contrastScore = contrast >= 3.0 ? 100 : contrast >= 2.0 ? 70 : 40;

  // Check colors
  const colorScore = validateColors(image);

  // Check composition
  const compositionScore = validateComposition(image);

  // Overall quality score
  const qualityScore =
    resolutionScore * 0.3 +
    contrastScore * 0.3 +
    colorScore * 0.2 +
    compositionScore * 0.2;

  return {
    qualityScore,
    frameCompatible: qualityScore >= 70 && isFrameCompatible(image),
    issues: [
      ...(resolutionScore < 80 ? ["Low resolution"] : []),
      ...(contrastScore < 70 ? ["Low contrast"] : []),
      ...(colorScore < 70 ? ["Color issues"] : []),
    ],
    recommendations: generateRecommendations(qualityScore, issues),
  };
}
```

### 4.3 Automatic Enhancement Steps

#### Prompt Enhancement

```typescript
function enhancePromptForFraming(
  originalPrompt: string,
  intent: StructuredIntent
): string {
  let enhanced = originalPrompt;

  // Add print quality hints
  enhanced += ", high resolution, print-ready";

  // Add contrast hints
  enhanced += ", high contrast, vibrant colors";

  // Add composition hints
  enhanced += ", centered composition, safe margins";

  // Add frame context
  if (intent.room) {
    enhanced += `, suitable for ${intent.room} wall art`;
  }

  // Add style-specific enhancements
  if (intent.style === "minimalist") {
    enhanced += ", clean lines, balanced composition";
  }

  return enhanced;
}
```

#### Parameter Optimization

```typescript
function optimizeParametersForFraming(
  intent: StructuredIntent,
  prompt: string
): IdeogramRequest {
  return {
    prompt: enhancePromptForFraming(prompt, intent),
    aspect_ratio: selectCompatibleAspectRatio(intent),
    model: "V_3", // Always use best model for print
    rendering_speed: "QUALITY", // Never use TURBO for print
    style_type: selectBestStyle(intent.style),
    color_palette: selectBestColorPalette(intent.colors),
    magic_prompt: "ON", // Always enhance prompts
    num_images: 4, // Give user options
  };
}
```

### 4.4 Required Metadata Storage

#### Enhanced Database Schema

```sql
-- Add new columns to images table
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS
  user_intent JSONB,
  optimized_prompt TEXT,
  quality_score INTEGER,
  frame_compatible BOOLEAN DEFAULT false,
  generation_parameters JSONB,
  validation_report JSONB,
  frame_suggestions JSONB,
  retry_count INTEGER DEFAULT 0,
  user_feedback JSONB;

-- Create index for quality scores
CREATE INDEX IF NOT EXISTS idx_images_quality_score
ON public.images(quality_score);

-- Create index for frame compatibility
CREATE INDEX IF NOT EXISTS idx_images_frame_compatible
ON public.images(frame_compatible);
```

#### Metadata Structure

```typescript
interface EnhancedImageMetadata {
  // Original data
  prompt: string;
  optimizedPrompt: string;

  // Intent
  userIntent: {
    room?: string;
    style?: string;
    mood?: string;
    colors?: string[];
    size?: string;
    purpose?: string;
  };

  // Generation
  generationParameters: {
    aspectRatio: string;
    model: string;
    renderingSpeed: string;
    styleType: string;
    colorPalette: string;
    magicPrompt: string;
    numImages: number;
  };

  // Quality
  qualityScore: number;
  frameCompatible: boolean;
  validationReport: {
    resolution: number;
    contrast: number;
    colorScore: number;
    compositionScore: number;
    issues: string[];
  };

  // Frame suggestions
  frameSuggestions: Array<{
    productSku: string;
    frameColor: string;
    size: string;
    matchScore: number;
  }>;

  // Retry info
  retryCount: number;
  retryReasons: string[];

  // User feedback
  userFeedback?: {
    selected: boolean;
    liked: boolean;
    ordered: boolean;
    feedback?: string;
  };
}
```

---

## 5️⃣ Implementation Plan

### 5.1 Frontend Tasks

#### Phase 1: New Components (Week 1-2)

**Task 1.1: Create IntelligentGenerationPanel**

- Location: `src/components/v2/IntelligentGenerationPanel.tsx`
- Features:
  - Intent capture UI
  - AI suggestions display
  - Progress indicators
  - Quality indicators
  - Frame suggestions
- Dependencies: New API endpoints

**Task 1.2: Create AISuggestions Component**

- Location: `src/components/v2/AISuggestions.tsx`
- Features:
  - Style suggestions
  - Color suggestions
  - Size suggestions
  - Frame suggestions
  - Real-time updates

**Task 1.3: Create QualityIndicators Component**

- Location: `src/components/v2/QualityIndicators.tsx`
- Features:
  - Quality score display
  - Frame compatibility badge
  - Print readiness indicator
  - Issue warnings

**Task 1.4: Create FrameSuggestions Component**

- Location: `src/components/v2/FrameSuggestions.tsx`
- Features:
  - Frame preview cards
  - Match scores
  - Quick order buttons
  - Prodigi product integration

#### Phase 2: Integration (Week 3-4)

**Task 2.1: Update Home Page**

- Location: `src/app/page.tsx`
- Changes:
  - Replace `SearchBar` with `IntelligentGenerationPanel`
  - Keep `CuratedImageGallery` for inspiration
  - Add new generation flow

**Task 2.2: Update My Creations Page**

- Location: `src/app/creations/page.tsx`
- Changes:
  - Add "Generate New" button with intelligent flow
  - Add "Improve Prompt" feature for existing images
  - Add "Generate Variations" feature

**Task 2.3: Create Generation Context**

- Location: `src/contexts/IntelligentGenerationContext.tsx`
- Features:
  - Manage generation state
  - Cache suggestions
  - Track user preferences
  - Store generation history

#### Phase 3: UX Enhancements (Week 5)

**Task 3.1: Add Loading States**

- Skeleton screens for suggestions
- Progress animations
- Error states with retry

**Task 3.2: Add Onboarding**

- First-time user guide
- Tooltips for new features
- Example prompts

**Task 3.3: Add Feedback Mechanisms**

- Like/dislike buttons
- "Not what I wanted" feedback
- Improvement suggestions

### 5.2 Backend Tasks

#### Phase 1: New API Endpoints (Week 1-2)

**Task 1.1: Intent Detection Endpoint**

- Location: `src/app/api/v2/generation/intent/route.ts`
- Implementation:
  - Use OpenAI to analyze prompt
  - Extract structured intent
  - Generate suggestions
  - Cache results

**Task 1.2: Prompt Optimization Endpoint**

- Location: `src/app/api/v2/generation/optimize-prompt/route.ts`
- Implementation:
  - Enhance prompt for Ideogram
  - Add framing context
  - Validate prompt quality
  - Return optimized prompt + reasoning

**Task 1.3: Intelligent Generation Endpoint**

- Location: `src/app/api/v2/generation/generate/route.ts`
- Implementation:
  - Orchestrate full flow
  - Call intent detection
  - Optimize prompt
  - Select parameters
  - Call Ideogram API
  - Return generation ID

**Task 1.4: Quality Validation Endpoint**

- Location: `src/app/api/v2/generation/validate-quality/route.ts`
- Implementation:
  - Analyze image quality
  - Check frame compatibility
  - Calculate quality score
  - Return validation report

**Task 1.5: Frame Suggestions Endpoint**

- Location: `src/app/api/v2/generation/suggest-frames/route.ts`
- Implementation:
  - Analyze image
  - Match to Prodigi products
  - Calculate match scores
  - Return suggestions

**Task 1.6: Variations Endpoint**

- Location: `src/app/api/v2/generation/variations/route.ts`
- Implementation:
  - Generate variations of image
  - Support color/style/composition changes
  - Return variation generation IDs

#### Phase 2: Agent Extensions (Week 3-4)

**Task 2.1: Extend Image Generation Agent**

- Location: `src/lib/studio/multi-agent/agents/image-generation-agent.ts`
- New Tools:
  - `generateImage`: Actually trigger generation
  - `optimizeForFraming`: Frame-specific optimization
  - `validateQuality`: Quality checks
  - `suggestFrames`: Frame matching

**Task 2.2: Create Intent Detection Agent**

- Location: `src/lib/studio/multi-agent/agents/intent-detection-agent.ts`
- Features:
  - Extract user intent from prompts
  - Generate structured intent objects
  - Provide suggestions

**Task 2.3: Create Parameter Selection Agent**

- Location: `src/lib/studio/multi-agent/agents/parameter-selection-agent.ts`
- Features:
  - Select optimal Ideogram parameters
  - Consider frame compatibility
  - Optimize for print quality

**Task 2.4: Create Quality Validation Agent**

- Location: `src/lib/studio/multi-agent/agents/quality-validation-agent.ts`
- Features:
  - Analyze image quality
  - Check print readiness
  - Validate frame compatibility

#### Phase 3: Integration & Testing (Week 5)

**Task 3.1: Integrate with Existing Systems**

- Connect to Supabase
- Connect to Prodigi API
- Connect to Ideogram API
- Error handling

**Task 3.2: Add Caching**

- Cache intent detection results
- Cache prompt optimizations
- Cache frame suggestions
- Redis or in-memory cache

**Task 3.3: Add Monitoring**

- Log generation requests
- Track quality scores
- Monitor API usage
- Error tracking

### 5.3 Database Schema Updates

#### Migration 1: Enhanced Images Table

```sql
-- Migration: Add intelligent generation metadata
-- File: supabase/migrations/20250120000001_add_intelligent_generation_metadata.sql

-- Add new columns
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS
  user_intent JSONB,
  optimized_prompt TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  frame_compatible BOOLEAN DEFAULT false,
  generation_parameters JSONB,
  validation_report JSONB,
  frame_suggestions JSONB,
  retry_count INTEGER DEFAULT 0,
  retry_reasons TEXT[],
  user_feedback JSONB;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_images_quality_score
ON public.images(quality_score) WHERE quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_images_frame_compatible
ON public.images(frame_compatible) WHERE frame_compatible = true;

CREATE INDEX IF NOT EXISTS idx_images_user_intent
ON public.images USING GIN(user_intent) WHERE user_intent IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.images.user_intent IS 'Structured user intent extracted from prompt';
COMMENT ON COLUMN public.images.optimized_prompt IS 'AI-optimized prompt sent to Ideogram';
COMMENT ON COLUMN public.images.quality_score IS 'Quality score 0-100 from validation';
COMMENT ON COLUMN public.images.frame_compatible IS 'Whether image is compatible with Prodigi frames';
COMMENT ON COLUMN public.images.generation_parameters IS 'Full Ideogram API parameters used';
COMMENT ON COLUMN public.images.validation_report IS 'Detailed quality validation results';
COMMENT ON COLUMN public.images.frame_suggestions IS 'Suggested Prodigi products for this image';
```

#### Migration 2: Generation History Table

```sql
-- Migration: Create generation history table
-- File: supabase/migrations/20250120000002_create_generation_history.sql

CREATE TABLE IF NOT EXISTS public.generation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_prompt TEXT NOT NULL,
  optimized_prompt TEXT,
  user_intent JSONB,
  generation_parameters JSONB,
  ideogram_generation_id TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  images_generated INTEGER DEFAULT 0,
  quality_scores INTEGER[],
  best_image_id UUID REFERENCES public.images(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id
ON public.generation_history(user_id);

CREATE INDEX IF NOT EXISTS idx_generation_history_status
ON public.generation_history(status);

CREATE INDEX IF NOT EXISTS idx_generation_history_created_at
ON public.generation_history(created_at DESC);
```

### 5.4 API Route Changes

#### New Routes Structure

```
/api/v2/
  generation/
    intent/              POST - Analyze user intent
    optimize-prompt/     POST - Optimize prompt
    generate/            POST - Start generation
    status/:id           GET - Check generation status
    validate-quality/    POST - Validate image quality
    suggest-frames/      POST - Suggest frames
    variations/          POST - Generate variations
```

#### Route Implementation Pattern

```typescript
// Example: /api/v2/generation/intent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { detectIntent } from "@/lib/v2/agents/intent-detection";

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, context } = await request.json();
    const result = await detectIntent(prompt, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Intent detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect intent" },
      { status: 500 }
    );
  }
}
```

### 5.5 React Component Suggestions

#### Component Structure

```
src/components/v2/
  IntelligentGenerationPanel.tsx      (Main component)
  IntentCaptureSection.tsx            (Prompt input + suggestions)
  AISuggestions.tsx                   (Suggestion chips)
  GenerationProgressSection.tsx       (Progress display)
  ResultsSection.tsx                 (Image grid + quality)
  QualityIndicators.tsx               (Quality badges)
  FrameSuggestions.tsx                (Frame cards)
  AIChatInterface.tsx                 (Optional chat)
```

#### Component Example

```typescript
// src/components/v2/IntelligentGenerationPanel.tsx
'use client';

import { useState } from 'react';
import { IntentCaptureSection } from './IntentCaptureSection';
import { GenerationProgressSection } from './GenerationProgressSection';
import { ResultsSection } from './ResultsSection';

export function IntelligentGenerationPanel() {
  const [intent, setIntent] = useState(null);
  const [generationId, setGenerationId] = useState(null);
  const [images, setImages] = useState([]);

  const handleIntentCaptured = async (intent) => {
    setIntent(intent);
    // Start generation
    const response = await fetch('/api/v2/generation/generate', {
      method: 'POST',
      body: JSON.stringify({ intent })
    });
    const { generationId } = await response.json();
    setGenerationId(generationId);
  };

  return (
    <div className="intelligent-generation-panel">
      {!intent && (
        <IntentCaptureSection onIntentCaptured={handleIntentCaptured} />
      )}
      {generationId && !images.length && (
        <GenerationProgressSection generationId={generationId} />
      )}
      {images.length > 0 && (
        <ResultsSection images={images} intent={intent} />
      )}
    </div>
  );
}
```

### 5.6 Migration Plan: V1 → V2

#### Phase 1: Parallel Running (Week 1-2)

- Deploy V2 endpoints alongside V1
- Add feature flag: `ENABLE_V2_GENERATION`
- Test V2 with beta users
- Monitor performance and errors

#### Phase 2: Gradual Rollout (Week 3-4)

- Enable V2 for 10% of users
- Monitor metrics:
  - Generation success rate
  - Quality scores
  - User satisfaction
  - API costs
- Gradually increase to 50%, then 100%

#### Phase 3: V1 Deprecation (Week 5)

- Mark V1 endpoints as deprecated
- Add migration guide for any external users
- Remove V1 code after 2 weeks
- Update documentation

#### Backward Compatibility

```typescript
// Support both V1 and V2 during migration
if (process.env.ENABLE_V2_GENERATION === "true") {
  // Use V2 flow
  return await intelligentGeneration(request);
} else {
  // Fall back to V1
  return await legacyGeneration(request);
}
```

### 5.7 Production Readiness Checklist

#### Security

- [ ] JWT authentication on all endpoints
- [ ] Rate limiting (prevent abuse)
- [ ] Input validation (prevent injection)
- [ ] API key protection (Ideogram key)
- [ ] CORS configuration

#### Performance

- [ ] Caching strategy (intent detection, suggestions)
- [ ] Database indexes (quality scores, frame compatibility)
- [ ] Image optimization (thumbnails, lazy loading)
- [ ] API response times (< 2s for suggestions)
- [ ] Generation timeout handling

#### Monitoring

- [ ] Error tracking (Sentry or similar)
- [ ] Performance monitoring (response times)
- [ ] Usage analytics (generation counts, quality scores)
- [ ] Cost tracking (OpenAI, Ideogram API usage)
- [ ] Alerting (high error rates, API failures)

#### Testing

- [ ] Unit tests (agent functions)
- [ ] Integration tests (API endpoints)
- [ ] E2E tests (full generation flow)
- [ ] Load tests (concurrent generations)
- [ ] Quality validation tests

#### Documentation

- [ ] API documentation (endpoints, request/response)
- [ ] Component documentation (props, usage)
- [ ] Agent documentation (capabilities, tools)
- [ ] Migration guide (V1 → V2)
- [ ] User guide (how to use new features)

---

## 6️⃣ Code Snippets & Examples

### 6.1 Intent Detection Agent

```typescript
// src/lib/v2/agents/intent-detection.ts
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const IntentSchema = z.object({
  room: z.string().optional(),
  style: z.string().optional(),
  mood: z.string().optional(),
  colors: z.array(z.string()).optional(),
  size: z.string().optional(),
  purpose: z.string().optional(),
});

export async function detectIntent(
  prompt: string,
  context?: any
): Promise<{
  intent: z.infer<typeof IntentSchema>;
  suggestions: {
    styles: string[];
    colors: string[];
    sizes: string[];
    frames: string[];
  };
}> {
  const systemPrompt = `You are an expert at understanding user intent for art generation.
Extract structured information from user prompts and generate helpful suggestions.

Context: User wants to create art for framing and printing.`;

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      intent: IntentSchema,
      suggestions: z.object({
        styles: z.array(z.string()),
        colors: z.array(z.string()),
        sizes: z.array(z.string()),
        frames: z.array(z.string()),
      }),
    }),
    prompt: `${systemPrompt}\n\nUser prompt: "${prompt}"`,
  });

  return result.object;
}
```

### 6.2 Prompt Optimization Agent

```typescript
// src/lib/v2/agents/prompt-optimization.ts
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function optimizePrompt(
  originalPrompt: string,
  intent: any,
  preferences?: any
): Promise<{
  optimizedPrompt: string;
  reasoning: string;
  parameters: {
    aspectRatio: string;
    model: string;
    renderingSpeed: string;
    styleType: string;
    colorPalette: string;
    magicPrompt: string;
  };
}> {
  const systemPrompt = `You are an expert at optimizing prompts for Ideogram AI image generation.
Your goal is to create prompts that:
1. Produce high-quality, print-ready images
2. Work well with custom framing
3. Match user intent and preferences
4. Include technical hints for best results

Always add:
- "high resolution, print-ready"
- "high contrast, vibrant colors"
- "centered composition, safe margins"
- Frame context if room/purpose is mentioned`;

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    prompt: `Original prompt: "${originalPrompt}"
User intent: ${JSON.stringify(intent)}
Preferences: ${JSON.stringify(preferences || {})}

Optimize this prompt for Ideogram generation and suggest optimal parameters.`,
  });

  // Parse result and extract optimized prompt + parameters
  // (Implementation depends on response format)

  return {
    optimizedPrompt: extractOptimizedPrompt(result.text),
    reasoning: extractReasoning(result.text),
    parameters: extractParameters(result.text, intent),
  };
}
```

### 6.3 Parameter Selection Logic

```typescript
// src/lib/v2/agents/parameter-selection.ts

const FRAME_COMPATIBLE_RATIOS = {
  portrait: ["4x5", "3x4", "2x3"],
  square: ["1x1"],
  landscape: ["16x10", "3x2", "4x3"],
};

export function selectOptimalParameters(
  intent: any,
  optimizedPrompt: string
): IdeogramRequest {
  // Select aspect ratio based on intent
  const aspectRatio = selectAspectRatio(intent);

  // Always use best model for print quality
  const model = "V_3";

  // Always use quality mode for print
  const renderingSpeed = "QUALITY";

  // Select style based on user preference
  const styleType = selectStyleType(intent.style);

  // Select color palette based on intent
  const colorPalette = selectColorPalette(intent.colors);

  return {
    prompt: optimizedPrompt,
    aspect_ratio: aspectRatio,
    model,
    rendering_speed: renderingSpeed,
    style_type: styleType,
    color_palette: colorPalette ? { name: colorPalette } : undefined,
    magic_prompt: "ON",
    num_images: 4,
  };
}

function selectAspectRatio(intent: any): string {
  if (intent.size?.includes("portrait")) {
    return "4x5"; // Maps to 16x20 frames
  }
  if (intent.size?.includes("square")) {
    return "1x1"; // Maps to 12x12, 16x16 frames
  }
  if (intent.size?.includes("landscape")) {
    return "16x10"; // Maps to various landscape frames
  }

  // Default based on room context
  if (intent.room === "bedroom" || intent.room === "office") {
    return "4x5"; // Portrait for vertical spaces
  }

  return "1x1"; // Square default
}
```

### 6.4 Quality Validation

```typescript
// src/lib/v2/validation/quality-checker.ts
import sharp from "sharp";

export async function validateImageQuality(
  imageUrl: string
): Promise<QualityReport> {
  // Fetch image
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  // Load image with sharp
  const image = sharp(Buffer.from(buffer));
  const metadata = await image.metadata();

  // Check resolution
  const resolution = (metadata.width || 0) * (metadata.height || 0);
  const resolutionScore =
    resolution >= 2048 * 2048 ? 100 : resolution >= 1024 * 1024 ? 80 : 40;

  // Check contrast (simplified)
  const stats = await image.stats();
  const contrast = calculateContrast(stats);
  const contrastScore = contrast >= 3.0 ? 100 : contrast >= 2.0 ? 70 : 40;

  // Check colors
  const colorScore = validateColors(stats);

  // Check composition (simplified - check for edge issues)
  const compositionScore = await validateComposition(image);

  // Overall score
  const qualityScore = Math.round(
    resolutionScore * 0.3 +
      contrastScore * 0.3 +
      colorScore * 0.2 +
      compositionScore * 0.2
  );

  return {
    qualityScore,
    frameCompatible: qualityScore >= 70 && isFrameCompatible(metadata),
    issues: [
      ...(resolutionScore < 80 ? ["Low resolution"] : []),
      ...(contrastScore < 70 ? ["Low contrast"] : []),
      ...(colorScore < 70 ? ["Color issues"] : []),
    ],
    recommendations: generateRecommendations(qualityScore),
  };
}
```

### 6.5 Frame Suggestion Logic

```typescript
// src/lib/v2/frame-suggestions.ts
import { ProdigiCatalog } from "@/lib/prodigi-v2/catalog";

export async function suggestFrames(
  imageUrl: string,
  imageMetadata: any
): Promise<FrameSuggestion[]> {
  const catalog = new ProdigiCatalog();

  // Calculate image aspect ratio
  const aspectRatio = calculateAspectRatio(
    imageMetadata.width,
    imageMetadata.height
  );

  // Determine orientation
  const orientation =
    aspectRatio < 0.95
      ? "portrait"
      : aspectRatio > 1.05
        ? "landscape"
        : "square";

  // Search Prodigi catalog
  const products = await catalog.search({
    orientation,
    minDimension: Math.min(imageMetadata.width, imageMetadata.height),
    maxDimension: Math.max(imageMetadata.width, imageMetadata.height),
  });

  // Analyze image colors to suggest frame colors
  const imageColors = await analyzeImageColors(imageUrl);
  const suggestedFrameColors = suggestFrameColors(imageColors);

  // Filter and rank products
  const suggestions = products
    .filter((p) => suggestedFrameColors.includes(p.frameColor))
    .map((product) => ({
      productSku: product.sku,
      frameColor: product.frameColor,
      size: product.size,
      price: product.price,
      matchScore: calculateMatchScore(product, imageMetadata, imageColors),
      reasoning: generateReasoning(product, imageMetadata),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5); // Top 5 suggestions

  return suggestions;
}
```

### 6.6 Complete Generation Endpoint

```typescript
// src/app/api/v2/generation/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/jwtAuth";
import { detectIntent } from "@/lib/v2/agents/intent-detection";
import { optimizePrompt } from "@/lib/v2/agents/prompt-optimization";
import { selectOptimalParameters } from "@/lib/v2/agents/parameter-selection";
import { createIdeogramAPI } from "@/lib/ideogram/api";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, context } = await request.json();

    // Step 1: Detect intent
    const { intent, suggestions } = await detectIntent(prompt, context);

    // Step 2: Optimize prompt
    const {
      optimizedPrompt,
      reasoning,
      parameters: suggestedParams,
    } = await optimizePrompt(prompt, intent);

    // Step 3: Select optimal parameters
    const ideogramRequest = selectOptimalParameters(intent, optimizedPrompt);

    // Step 4: Start generation
    const ideogramAPI = createIdeogramAPI();
    const generationResponse = await ideogramAPI.generateImage(ideogramRequest);

    // Step 5: Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: generationRecord } = await supabase
      .from("generation_history")
      .insert({
        user_id: user.id,
        original_prompt: prompt,
        optimized_prompt: optimizedPrompt,
        user_intent: intent,
        generation_parameters: ideogramRequest,
        ideogram_generation_id: generationResponse.id,
        status: "pending",
      })
      .select()
      .single();

    return NextResponse.json({
      generationId: generationRecord.id,
      ideogramGenerationId: generationResponse.id,
      intent,
      suggestions,
      optimizedPrompt,
      reasoning,
      status: "pending",
    });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    );
  }
}
```

---

## 📊 Summary

### Key Improvements

1. **Intelligent Intent Understanding**: System now understands user goals (bedroom art, office poster, gift)
2. **Automatic Prompt Optimization**: AI enhances user prompts for better results
3. **Hidden Technical Settings**: Users see suggestions, not raw API parameters
4. **Frame-Optimized Generation**: Images automatically match Prodigi frame sizes
5. **Quality Validation**: Images checked before saving, auto-retry for poor quality
6. **Agent Integration**: Studio Agent system now drives generation flow
7. **Rich Metadata**: Comprehensive data stored for learning and improvement

### Expected Outcomes

- **Higher Quality**: Optimized prompts + quality validation = better images
- **Better UX**: Simple, guided experience vs. technical dropdowns
- **Higher Conversion**: Frame suggestions + seamless ordering = more orders
- **Lower Support**: Intelligent system reduces user confusion
- **Data-Driven**: Rich metadata enables continuous improvement

### Next Steps

1. Review and approve this design
2. Create detailed task breakdown
3. Begin Phase 1 implementation (Week 1-2)
4. Test with beta users
5. Iterate based on feedback
6. Full rollout

---

**End of Document**


