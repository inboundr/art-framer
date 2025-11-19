# Prodigi AI Mockup System Documentation

## Overview

This document explains how the Prodigi AI mockup tool works, detailing the complete workflow from frame selection to AI-enhanced preview generation. This documentation will serve as a reference for future improvements to the frame preview user experience.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Workflow Sequence](#workflow-sequence)
3. [API Endpoints](#api-endpoints)
4. [Mockup Generation Process](#mockup-generation-process)
5. [AI Enhancement Features](#ai-enhancement-features)
6. [Future Improvements](#future-improvements)

---

## System Architecture

The Prodigi mockup system consists of three main components:

1. **Frontend Application**: Handles user interactions and orchestrates API calls
2. **Prodigi Image Library API**: Generates and serves mockup images
3. **AI Enhancement Service**: Creates realistic scene compositions with custom lighting

### High-Level Architecture

```mermaid
graph TB
    A[User] -->|Interacts with| B[Frontend Application]
    B -->|Frame Selection & Image Upload| C[Image Processing]
    C -->|Generate Mockups| D[Prodigi Image Library API]
    D -->|Check Thumbnail Cache| E{Mockups Exist?}
    E -->|Yes| F[Return Cached Thumbnails]
    E -->|No| G[Generate New Mockups]
    G -->|Transform Image| H[Mockup Views: HeadOn, CloseUp, Angled]
    H -->|User Selects View| I[Display Mockup Preview]
    I -->|Optional: Enhance with AI| J[AI Enhancement Service]
    J -->|Apply Scene & Lighting| K[Final Enhanced Mockup]
    K -->|Display to User| A
    
    style D fill:#e1f5ff
    style J fill:#ffe1f5
    style K fill:#d4edda
```

---

## Workflow Sequence

### Complete User Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant ImageLibrary as Prodigi Image Library API
    participant AIService as AI Enhancement Service
    
    User->>Frontend: 1. Select frame type/product
    User->>Frontend: 2. Upload/select image
    User->>Frontend: 3. Position & size image to frame ratio
    User->>Frontend: 4. Click "Preview Mockup"
    
    Note over Frontend: Check if mockups already exist
    
    Frontend->>ImageLibrary: GET /mockups/thumbnail/{SKU}/HeadOn?params
    Frontend->>ImageLibrary: GET /mockups/thumbnail/{SKU}/CloseUp?params
    Frontend->>ImageLibrary: GET /mockups/thumbnail/{SKU}/Angled?params
    
    alt Thumbnails exist (cached)
        ImageLibrary-->>Frontend: Return thumbnail URLs
        Frontend-->>User: Display cached previews
    else Thumbnails don't exist
        Note over Frontend: Generate first view
        Frontend->>ImageLibrary: POST /mockups/{SKU}/view/HeadOn/transform/{transformId}
        ImageLibrary-->>Frontend: Return mockup generation URL
        Frontend-->>User: Display HeadOn preview
    end
    
    opt User switches view
        User->>Frontend: Click different view (Angled/CloseUp)
        Frontend->>ImageLibrary: POST /mockups/{SKU}/view/{viewName}/transform/{transformId}
        ImageLibrary-->>Frontend: Return mockup URL
        Frontend-->>User: Display new view
    end
    
    opt User wants AI enhancement
        User->>Frontend: Select lighting option
        User->>Frontend: Enter scene description
        User->>Frontend: Click "Generate AI Mockup"
        Frontend->>AIService: POST /ai-edit/ with mockup URL + params
        AIService-->>Frontend: Return enhanced mockup URL
        Frontend-->>User: Display AI-enhanced preview
    end
```

---

## API Endpoints

### 1. Thumbnail Check Endpoint

**Purpose**: Check if mockup previews already exist (cached)

```
GET https://live-services.pwinty.com/image-library/mockups/thumbnail/{SKU}/{ViewName}
```

**Parameters**:
- `SKU`: Product SKU (e.g., `GLOBAL-FRA-CAN-10x12`)
- `ViewName`: `HeadOn`, `CloseUp`, or `Angled`
- Query params:
  - `orientation`: `PORTRAIT` or `LANDSCAPE`
  - `wrap`: Frame wrap color (e.g., `BLACK`)
  - `color`: Frame color (e.g., `BLACK`)

**Example**:
```bash
GET /mockups/thumbnail/GLOBAL-FRA-CAN-10x12/HeadOn?orientation=PORTRAIT&wrap=BLACK&color=BLACK&
```

**Response**:
- If exists: Returns thumbnail image
- If not exists: 404 or empty response

---

### 2. Mockup Generation Endpoint

**Purpose**: Generate a new mockup view with the user's image

```
POST https://live-services.pwinty.com/image-library/mockups/{SKU}/view/{ViewName}/transform/{transformId}
```

**Parameters**:
- `SKU`: Product SKU
- `ViewName`: View angle (`HeadOn`, `CloseUp`, `Angled`)
- `transformId`: Unique transform identifier for the image positioning

**Request Body**:
```json
{
  "view_name": "HeadOn",
  "variants": {
    "wrap": "BLACK",
    "color": "BLACK",
    "orientation": "PORTRAIT"
  }
}
```

**Response**:
```json
{
  "url": "https://live-services.pwinty.com/image-library/render_mockup/GLOBAL-FRA-CAN-10x12/view/HeadOn/transform/691db8c4848657bbc781f302?orientation=PORTRAIT&wrap=BLACK&color=BLACK&blank=False&transparent=False&preview=False&access_token=..."
}
```

---

### 3. AI Enhancement Endpoint

**Purpose**: Apply AI-generated backgrounds and lighting to mockup

```
POST https://live-services.pwinty.com/image-library/mockups/ai-edit/
```

**Request Body**:
```json
{
  "source_image_url": "https://live-services.pwinty.com/image-library/render_mockup/...",
  "edit_params": {
    "environment": "Minimalist modern living room interior, soft beige walls, natural morning, wooden floor, neutral tones, clean Scandinavian design",
    "lighting": "Golden hour (emotional, premium feel)",
    "product_description": "Global float framed canvas on premium stretcher bars, 10x12\" / 25x31cm."
  }
}
```

**Response**:
```json
{
  "source_image_url": "https://...",
  "output_image_url": "https://imagelibraryimagessalive.blob.core.windows.net/ai-edits/ai-edit-8f32840e-f649-40cb-a5ff-9f48ea77cce2.jpg?...",
  "transform": {
    "product_description": "Global float framed canvas on premium stretcher bars, 10x12\" / 25x31cm.",
    "environment": "Minimalist modern living room interior...",
    "lighting": "Golden hour (emotional, premium feel)"
  },
  "transform_job_id": "18363915-856a-4fe0-9ca5-e03d4e1a7ea9",
  "extraData": {}
}
```

---

## Mockup Generation Process

### State Diagram

```mermaid
stateDiagram-v2
    [*] --> FrameSelection: User starts
    FrameSelection --> ImageUpload: Select frame/product
    ImageUpload --> ImagePositioning: Upload image
    ImagePositioning --> PreviewRequest: Position & size image
    
    PreviewRequest --> CheckingCache: Click preview
    CheckingCache --> CacheHit: Thumbnails exist
    CheckingCache --> CacheMiss: Thumbnails don't exist
    
    CacheHit --> DisplayThumbnails
    CacheMiss --> GenerateFirstView
    GenerateFirstView --> DisplayThumbnails
    
    DisplayThumbnails --> ViewSelection
    ViewSelection --> GenerateView: User selects different view
    GenerateView --> DisplayThumbnails
    
    DisplayThumbnails --> AIEnhancement: User wants AI enhancement
    DisplayThumbnails --> Complete: User satisfied
    
    AIEnhancement --> EnterPrompt
    EnterPrompt --> SelectLighting
    SelectLighting --> GenerateAI
    GenerateAI --> DisplayAIResult
    DisplayAIResult --> Complete: Satisfied
    DisplayAIResult --> EnterPrompt: Regenerate
    
    Complete --> [*]
```

### Mockup Views

The system generates three different viewing angles:

1. **HeadOn**: Front-facing view
2. **CloseUp**: Close-up detail view
3. **Angled**: 3D angled perspective

```mermaid
graph LR
    A[User Image + Frame Config] --> B[HeadOn View]
    A --> C[CloseUp View]
    A --> D[Angled View]
    
    B --> E[Generate on demand]
    C --> E
    D --> E
    
    E --> F{Cached?}
    F -->|Yes| G[Serve from cache]
    F -->|No| H[Generate new mockup]
    H --> I[Cache result]
    I --> G
    
    style B fill:#e3f2fd
    style C fill:#e3f2fd
    style D fill:#e3f2fd
```

---

## AI Enhancement Features

### Available Lighting Options

The AI enhancement service supports various lighting scenarios to create realistic and emotionally engaging mockups:

1. **Soft daylight (natural light)** - Clean, natural illumination
2. **Golden hour (emotional, premium feel)** - Warm, sunset-inspired lighting
3. **Blue hour (emotional, sophisticated vibe)** - Cool, twilight atmosphere
4. **Candlelit (warm, intimate)** - Cozy, intimate setting
5. **Spotlight contrast (bold, dramatic focus)** - High-contrast, dramatic effect

### Environment Prompt Guidelines

**Character Limit**: 250 characters

**Example Prompts**:
- "Minimalist modern living room interior, soft beige walls, natural morning, wooden floor, neutral tones, clean Scandinavian design"
- "Luxury bedroom with dark walls, elegant bedside table, ambient lighting, sophisticated contemporary style"
- "Bright home office with white walls, wooden desk, plants, natural window light, clean professional space"

**Best Practices**:
- Be specific about room type and style
- Mention color palette and materials
- Include lighting context (natural, ambient, etc.)
- Describe atmosphere and mood
- Keep within character limit

### AI Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Frontend UI
    participant API as AI Edit API
    participant AI as AI Model
    participant Storage as Image Storage
    
    User->>UI: Select lighting option
    User->>UI: Enter environment description (max 250 chars)
    User->>UI: Click "Generate AI Mockup"
    
    UI->>UI: Validate inputs
    UI->>API: POST /ai-edit/ with mockup URL + params
    
    API->>AI: Process with prompt:<br/>- Product description<br/>- Environment<br/>- Lighting
    
    Note over AI: AI generates scene<br/>compositing mockup<br/>into environment
    
    AI->>Storage: Save enhanced image
    Storage-->>API: Return blob URL with SAS token
    API-->>UI: Return output_image_url + transform_job_id
    UI-->>User: Display enhanced mockup
    
    opt Regenerate
        User->>UI: Modify prompt or lighting
        UI->>API: POST new request
    end
```

### Transform Job Tracking

Each AI enhancement request generates a unique `transform_job_id` that can be used to:
- Track processing status
- Cache results
- Allow regeneration with modifications
- Link related transformations

---

## Future Improvements

### 1. Caching Strategy

**Current Behavior**:
- Thumbnail check happens on every preview request
- No client-side caching of mockup URLs
- Multiple API calls for same configuration

**Proposed Improvements**:
```mermaid
graph TB
    A[User Requests Preview] --> B{Check Local Cache}
    B -->|Cache Hit| C[Display from Cache]
    B -->|Cache Miss| D{Check Server Cache}
    D -->|Exists| E[Fetch & Cache Locally]
    D -->|Not Exists| F[Generate New Mockup]
    F --> G[Cache on Server]
    G --> E
    E --> C
    
    H[Cache Key: SKU + Orientation + Wrap + Color + TransformId]
    
    style C fill:#d4edda
    style H fill:#fff3cd
```

**Implementation**:
- Use browser localStorage/sessionStorage for mockup URLs
- Implement cache key based on: `${SKU}_${orientation}_${wrap}_${color}_${transformId}`
- Set reasonable TTL (Time To Live) for cached entries
- Clear cache when user modifies image positioning

---

### 2. Progressive Loading

**Enhanced UX Flow**:

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    
    User->>UI: Click Preview
    UI-->>User: Show loading skeleton
    
    par Load All Views
        UI->>API: Fetch HeadOn
        and
        UI->>API: Fetch CloseUp
        and
        UI->>API: Fetch Angled
    end
    
    API-->>UI: HeadOn ready (fastest)
    UI-->>User: Display HeadOn + loading indicators
    
    API-->>UI: CloseUp ready
    UI-->>User: Enable CloseUp view
    
    API-->>UI: Angled ready
    UI-->>User: Enable Angled view
```

**Benefits**:
- Faster perceived performance
- Users see first view quickly
- Other views load in background
- Better user feedback with loading states

---

### 3. Preloading Strategy

**Predictive Loading**:

```mermaid
graph TB
    A[User Uploads Image] --> B[Background Process Starts]
    B --> C[Preload Popular Configurations]
    C --> D[Generate HeadOn - Portrait - Black]
    C --> E[Generate HeadOn - Landscape - Black]
    D --> F[Cache Results]
    E --> F
    
    G[User Selects Frame] --> H{Check Preloaded Cache}
    H -->|Hit| I[Instant Preview]
    H -->|Miss| J[Generate on Demand]
    
    style I fill:#d4edda
    style F fill:#e3f2fd
```

---

### 4. AI Enhancement UX Improvements

**Current Limitations**:
- No preview of lighting options
- Users can't see what prompts work best
- No prompt suggestions
- Single generation per request

**Proposed Enhancements**:

```mermaid
graph TB
    A[User Wants AI Enhancement] --> B[Show Lighting Preview Tiles]
    B --> C{User Hovers Lighting Option}
    C --> D[Show Example Preview]
    D --> E[User Selects]
    
    E --> F[Smart Prompt Assistant]
    F --> G[Show Prompt Templates]
    F --> H[Show Character Count]
    F --> I[Suggest Related Keywords]
    
    G --> J[User Enters/Modifies Prompt]
    I --> J
    
    J --> K[Generate Button Active]
    K --> L[Show Multiple Variations?]
    L -->|Yes| M[Generate 3 Variations]
    L -->|No| N[Generate Single]
    
    M --> O[User Picks Favorite]
    N --> O
    
    style B fill:#e1f5ff
    style F fill:#fff3cd
    style O fill:#d4edda
```

**Features to Add**:
1. **Lighting Preview Tiles**: Show sample images for each lighting option
2. **Prompt Templates**: Predefined prompts for common scenarios
3. **Prompt Suggestions**: AI-powered keyword suggestions
4. **Character Counter**: Visual feedback (129/250)
5. **Multiple Variations**: Generate 2-3 variations per request
6. **History**: Save previously used prompts
7. **Favorites**: Allow users to favorite successful combinations

---

### 5. Performance Optimization

**Batch Request Strategy**:

```javascript
// Current: Sequential requests
await fetch(thumbnailHeadOn);
await fetch(thumbnailCloseUp);
await fetch(thumbnailAngled);

// Proposed: Parallel requests
const [headOn, closeUp, angled] = await Promise.all([
  fetch(thumbnailHeadOn),
  fetch(thumbnailCloseUp),
  fetch(thumbnailAngled)
]);
```

**Image Optimization**:
- Request lower resolution for thumbnails
- Use progressive JPEG loading
- Implement lazy loading for non-visible views
- Compress images before upload

---

### 6. Error Handling & Retry Logic

```mermaid
stateDiagram-v2
    [*] --> RequestMockup
    RequestMockup --> Generating: API Call
    
    Generating --> Success: 200 OK
    Generating --> Timeout: >30s
    Generating --> ServerError: 5xx
    Generating --> ClientError: 4xx
    
    Timeout --> Retry1: Attempt 1
    ServerError --> Retry1
    
    Retry1 --> Generating
    Retry1 --> Retry2: Failed
    Retry2 --> Generating
    Retry2 --> Failed: Max retries
    
    ClientError --> ShowError: Invalid params
    Failed --> ShowError: All attempts failed
    
    Success --> [*]
    ShowError --> [*]
```

**Implementation**:
- Exponential backoff for retries
- Clear error messages for users
- Fallback to cached version if available
- Network status indicators

---

### 7. Enhanced Preview Modal

**Proposed Layout**:

```
┌─────────────────────────────────────────────────────┐
│  Preview Mockup                              [X]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │         [Main Mockup Preview]               │   │
│  │                                             │   │
│  │              [Loading...]                   │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  View Angles:                                       │
│  [ HeadOn* ] [ CloseUp ] [ Angled ]                │
│                                                     │
│  ┌─ AI Enhancement ────────────────────────────┐   │
│  │                                             │   │
│  │  Lighting: [Golden hour ▼]  [Preview]      │   │
│  │                                             │   │
│  │  Environment Description: (142/250)         │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │ Minimalist modern living room...    │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  │                                             │   │
│  │  [Prompt Templates ▼]  [Generate AI ✨]    │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [ Add to Cart ]              [ Save Preview ]      │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation Checklist

### Phase 1: Core Optimization
- [ ] Implement client-side caching for mockup URLs
- [ ] Add parallel thumbnail fetching
- [ ] Implement progressive loading UI
- [ ] Add loading skeletons and spinners

### Phase 2: Enhanced UX
- [ ] Add lighting option preview tiles
- [ ] Implement prompt templates system
- [ ] Add character counter for prompts
- [ ] Create smart prompt suggestions

### Phase 3: Advanced Features
- [ ] Implement multiple variation generation
- [ ] Add prompt history and favorites
- [ ] Create predictive preloading
- [ ] Implement comprehensive error handling

### Phase 4: Performance
- [ ] Add image optimization pipeline
- [ ] Implement CDN caching strategy
- [ ] Add performance monitoring
- [ ] Optimize bundle size

---

## API Authentication

All API requests require Bearer token authentication:

```javascript
headers: {
  'Authorization': 'Bearer {JWT_TOKEN}',
  'Content-Type': 'application/json',
  'Origin': 'https://dashboard.prodigi.com'
}
```

**Token Contains**:
- Merchant ID
- User information
- Permissions (orders, quotes, products)
- Session ID
- Expiration timestamp

---

## Key Considerations

### Transform ID
- Unique identifier for image positioning
- Generated when user positions image in frame
- Used to maintain consistent positioning across views
- Must be included in all mockup generation requests

### Variants
- **Wrap**: Frame edge color (BLACK, WHITE, NATURAL, etc.)
- **Color**: Frame face color
- **Orientation**: PORTRAIT or LANDSCAPE
- Changes to any variant require new mockup generation

### Caching Behavior
- Thumbnails cached server-side
- URL includes access_token with expiration
- Cached mockups tied to specific transform + variant combination
- Changing positioning creates new transform ID

---

## Conclusion

The Prodigi AI mockup system provides a sophisticated pipeline for generating realistic product previews. By understanding this workflow, we can implement targeted improvements that:

1. **Reduce API calls** through intelligent caching
2. **Improve perceived performance** with progressive loading
3. **Enhance user experience** with better prompts and previews
4. **Increase conversion** with higher quality mockups

The proposed improvements focus on maintaining the quality of Prodigi's AI capabilities while optimizing the user journey from frame selection to final preview.

---

## Related Documentation

- [PRODIGI_SETUP.md](./PRODIGI_SETUP.md) - Prodigi API setup and configuration
- [COMPLETE_STRIPE_PRODIGI_INTEGRATION.md](./COMPLETE_STRIPE_PRODIGI_INTEGRATION.md) - Integration guide
- [DYNAMIC_PRODUCT_SYSTEM.md](./DYNAMIC_PRODUCT_SYSTEM.md) - Product configuration system

---

**Last Updated**: November 19, 2025
**Version**: 1.0
**Author**: Development Team

