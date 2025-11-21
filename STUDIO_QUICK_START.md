# 🚀 AI Studio - Quick Start Guide

## Enable the Studio (30 seconds)

### 1. Add Environment Variable

Edit `.env.local`:

```bash
NEXT_PUBLIC_AI_STUDIO_ENABLED=true
OPENAI_API_KEY=sk-your-key-here
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the Studio

Open your browser to:

```
http://localhost:3000/studio
```

**That's it!** The AI Studio is now running. 🎉

---

## Test the Experience (2 minutes)

### Flow 1: Upload an Image

1. Click "Upload your artwork" or drag & drop an image
2. AI analyzes the image (colors, style, mood)
3. Frame preview appears with AI's recommendation
4. Price displays in real-time
5. Chat with AI: "Make it bigger" or "Try gold frame"
6. Click "Add to Cart" when satisfied

### Flow 2: Chat First

1. Type in chat: "I want a modern black frame for a landscape photo"
2. AI asks follow-up questions
3. Upload your image when ready
4. AI applies the configuration you discussed

---

## What You Get

✅ **AI Chat** - Natural conversation, no forms  
✅ **Image Analysis** - AI detects colors, style, recommends frames  
✅ **3D Preview** - Photorealistic rendering with Three.js  
✅ **Smart Suggestions** - AI recommends improvements  
✅ **Real-time Pricing** - Updates instantly with changes  
✅ **Complete Isolation** - Won't affect your existing app

---

## Hidden Until You're Ready

The `/studio` route is **protected by middleware**. To hide it again:

```bash
# In .env.local
NEXT_PUBLIC_AI_STUDIO_ENABLED=false
```

Accessing `/studio` will redirect to homepage.

---

## Next Steps

1. ✅ **Test**: Try the full user flow
2. ✅ **Customize**: Edit prompts in `/src/lib/studio/openai.ts`
3. ✅ **Deploy**: Push to production when ready
4. ✅ **Market**: This is your competitive advantage

---

## Troubleshooting

**Preview not showing?**
- Check browser console for errors
- Verify image uploaded successfully

**AI not responding?**
- Check `OPENAI_API_KEY` is set
- Verify API key is valid

**Pricing shows $0?**
- Check `PRODIGI_API_KEY` is set
- Verify SKU selection worked

**3D preview blank?**
- Check browser supports WebGL
- Try different browser (Chrome, Firefox)

---

## Support Files

- `/AI_STUDIO_SETUP.md` - Complete setup instructions
- `/AI_STUDIO_IMPLEMENTATION_COMPLETE.md` - Full technical details
- `/AI_POWERED_FRAME_UX_CONCEPT.md` - Original vision
- `/AI_POWERED_FRAME_TECHNICAL_GUIDE.md` - Technical specs

---

**You're ready to revolutionize frame customization!** 🎨✨

