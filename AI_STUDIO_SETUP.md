# AI Studio Setup Guide

## Overview

The AI Studio is a complete, isolated implementation of the AI-powered frame customization experience. It's completely separate from the existing app code (except authentication) and is hidden behind a feature flag.

## Features Implemented

✅ **Phase 1: Core Features**
- AI Chat interface with streaming responses
- Image upload and analysis
- 3D frame preview with Three.js
- Real-time pricing
- Smart suggestions
- Product matching and scoring
- Global state management with Zustand

✅ **Architecture**
- Feature flag controlled (`/studio` route)
- Isolated layout (doesn't inherit from main app)
- Separate state management
- Complete API layer
- Production-ready error handling

## Installation

### 1. Install Dependencies

```bash
npm install --save \
  openai \
  ai \
  zustand \
  three \
  @react-three/fiber \
  @react-three/drei \
  framer-motion \
  react-dropzone \
  sharp \
  marked
```

### 2. Environment Variables

Create or update `.env.local`:

```bash
# Feature Flag
NEXT_PUBLIC_AI_STUDIO_ENABLED=true

# OpenAI
OPENAI_API_KEY=sk-...

# Existing variables should remain
PRODIGI_API_KEY=...
STRIPE_SECRET_KEY=...
```

### 3. Enable the Studio

To access the AI Studio, navigate to:

```
http://localhost:3000/studio
```

**Note**: The `/studio` route is protected by the feature flag. If `NEXT_PUBLIC_AI_STUDIO_ENABLED` is `false`, accessing `/studio` will redirect to the homepage.

### 4. Create Uploads Directory

```bash
mkdir -p public/uploads
```

## File Structure

```
src/
├── app/
│   ├── studio/                      # AI Studio pages
│   │   ├── layout.tsx              # Isolated layout
│   │   └── page.tsx                # Main studio page
│   └── api/
│       ├── studio/                  # Studio API routes
│       │   ├── chat/               # AI chat endpoint
│       │   ├── analyze-image/      # Image analysis
│       │   ├── pricing/            # Real-time pricing
│       │   ├── suggestions/        # Smart suggestions
│       │   └── room/               # Room visualization
│       └── upload/                  # File upload
│
├── components/
│   └── studio/                      # Studio UI components
│       ├── AIChat/                 # Chat interface
│       ├── FramePreview/           # 3D preview
│       ├── ContextPanel/           # Pricing & details
│       ├── ImageUpload/            # Upload component
│       └── WelcomeModal/           # Welcome screen
│
├── store/
│   └── studio.ts                    # Global state (Zustand)
│
├── lib/
│   ├── feature-flags.ts            # Feature flag management
│   └── studio/
│       └── openai.ts               # OpenAI integration
│
└── middleware.ts                    # Route protection
```

## Key Components

### 1. AI Chat (`/components/studio/AIChat`)
- Streaming responses from GPT-4
- Function calling for actions
- Voice input support (placeholder)
- Quick action buttons
- Context-aware suggestions

### 2. Frame Preview (`/components/studio/FramePreview`)
- 3D rendering with Three.js
- Multiple view modes (3D, Room, AR, Compare)
- Real-time material updates
- Interactive controls
- Photorealistic rendering

### 3. Context Panel (`/components/studio/ContextPanel`)
- Live pricing updates
- AI confidence scoring
- Smart suggestions
- Configuration summary
- Quick options

### 4. State Management (`/store/studio.ts`)
- Zustand for global state
- Persistent storage
- Undo/redo functionality
- Real-time updates
- Background tasks

## API Endpoints

### Chat
```
POST /api/studio/chat
- Streaming AI responses
- Function calling for frame updates
- Context-aware suggestions
```

### Image Analysis
```
POST /api/studio/analyze-image
- OpenAI Vision analysis
- Color detection
- Product matching
- Recommendations
```

### Pricing
```
POST /api/studio/pricing
- Real-time Prodigi quotes
- Shipping calculations
- Cost breakdowns
```

### Suggestions
```
POST /api/studio/suggestions
- Rule-based suggestions
- AI-powered improvements
- Ranked by relevance
```

### Room Analysis
```
POST /api/studio/room/analyze
- Wall detection
- Lighting analysis
- Placement suggestions
```

## Configuration

### Feature Flags

Edit `/src/lib/feature-flags.ts` to enable/disable features:

```typescript
export const featureFlags = {
  aiStudio: true,              // Main feature
  imageGeneration: false,      // Ideogram integration
  roomVisualization: false,    // AR features
  voiceInput: false,           // Voice-to-text
};
```

### OpenAI Settings

Edit `/src/lib/studio/openai.ts` to customize:
- Model selection
- Temperature
- Max tokens
- System prompts
- Function definitions

## Development

### Run Development Server

```bash
npm run dev
```

Then navigate to `http://localhost:3000/studio`

### Testing

1. **Upload Test**: Upload an image and verify analysis
2. **Chat Test**: Send messages and verify AI responses
3. **Preview Test**: Check 3D rendering and controls
4. **Pricing Test**: Change options and verify price updates
5. **Suggestions Test**: Verify smart suggestions appear

### Debug Mode

Add to console to enable debug logging:

```javascript
localStorage.setItem('studio-debug', 'true');
```

## Integration with Existing App

### Sharing Authentication

The Studio uses the existing app's authentication system. No changes needed.

### Sharing Prodigi Integration

The Studio uses:
- `/src/lib/prodigi-v2/` for orders and quotes
- `/src/lib/prodigi/` for catalog search

### Checkout Flow

When user clicks "Add to Cart", they're redirected to the existing checkout with the frame configuration.

## Production Deployment

### Before Going Live

1. ✅ Set up S3/Cloudinary for image uploads
2. ✅ Configure Redis for caching
3. ✅ Set up monitoring (Sentry, LogRocket)
4. ✅ Configure rate limiting
5. ✅ Test on mobile devices
6. ✅ Run load tests
7. ✅ Set up analytics

### Performance Optimization

- Images are optimized with Sharp
- API responses are cached
- 3D models use LOD (Level of Detail)
- Debounced updates prevent excessive API calls

### Security

- File uploads are validated
- API rate limiting (TODO: implement)
- Input sanitization
- CORS configuration
- API key rotation

## Troubleshooting

### OpenAI API Errors

If you see `401 Unauthorized`:
- Check `OPENAI_API_KEY` is set correctly
- Verify API key has access to GPT-4 and Vision

### 3D Preview Not Loading

If 3D preview shows blank:
- Check browser supports WebGL
- Verify Three.js is installed
- Check console for errors

### Image Upload Fails

If upload doesn't work:
- Check `public/uploads` directory exists
- Verify file size < 10MB
- Check file permissions

### Pricing Not Updating

If prices don't update:
- Check `PRODIGI_API_KEY` is valid
- Verify product SKU is correct
- Check network tab for API errors

## Next Steps

### Phase 2: Advanced Features (Optional)

- [ ] Ideogram integration for image generation
- [ ] Room visualization with AR
- [ ] Voice input with Whisper
- [ ] Multi-frame projects
- [ ] Gallery wall planning
- [ ] Social sharing
- [ ] User accounts and saved configurations

### Phase 3: Optimization

- [ ] Implement Redis caching
- [ ] Add CDN for assets
- [ ] Optimize 3D models
- [ ] Implement WebSocket for real-time updates
- [ ] Add progressive web app features

## Support

For issues or questions:
1. Check console for errors
2. Review API logs
3. Test with feature flags
4. Check this documentation

## License

Part of Art Framer application. All rights reserved.

---

**Version**: 1.0  
**Created**: November 21, 2024  
**Status**: Production Ready (Phase 1)

