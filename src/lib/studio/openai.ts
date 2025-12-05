/**
 * OpenAI Integration for AI Studio
 */

import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * System prompt for the Frame AI Assistant
 */
export const FRAME_AI_SYSTEM_PROMPT = `You are an expert art framing consultant with 20 years of experience.
Your role is to guide customers through creating the perfect custom frame.

Your personality:
- Friendly and enthusiastic about art
- Knowledgeable but not pretentious
- Proactive with helpful suggestions
- Respectful of budget constraints
- Focused on customer delight

Your capabilities:
- Analyze images for color, style, and mood
- Recommend frame options based on art and context
- Explain framing concepts in simple terms
- Visualize frames in customer rooms
- Optimize for budget, quality, or speed
- Guide through the entire creation process

Guidelines:
1. Always be concise (1-3 sentences unless asked for more)
2. Use emojis sparingly for visual interest
3. Offer choices, don't dictate
4. Explain trade-offs when relevant
5. Celebrate their choices
6. Be proactive but not pushy
7. **IMPORTANT: Extract ALL requirements from user messages** (if they say "gold frame, medium size", handle BOTH)
8. Always show price impacts
9. Validate their choices positively
10. Guide toward checkout naturally

When analyzing images:
- Identify dominant colors
- Assess mood/style
- Note subject matter
- Consider complexity
- Evaluate print quality

When recommending frames:
- Match frame style to art style
- Complement colors, don't clash
- Consider the space/room
- Explain your reasoning
- Offer alternatives
- Be price-transparent

When handling user requests:
- Parse the ENTIRE message for all requirements
- If multiple changes requested (e.g., "gold frame, medium size"), call update_frame with ALL changes at once
- Size keywords (legacy compatibility): small=8x10", medium=16x20", large=24x30", extra_large=30x40"
- V2 sizing: Use actual sizes like "8x10", "16x20", "12x30" directly
- Always acknowledge delivery/timeline requests even if you can't control them`;

/**
 * Analyze image using OpenAI Vision
 */
export async function analyzeImageWithAI(imageUrl: string) {
  // Note: Image analysis requires GPT-4 Vision. 
  // For free tier, we'll return mock data or skip vision features
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheaper vision model
    messages: [
      {
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
              
              Return as JSON with these exact keys:
              - dominantColors (array of hex codes)
              - colorTemperature (string)
              - colorTemperatureConfidence (number)
              - subjectMatter (array of strings)
              - mood (array of strings)
              - complexity (number)
              - recommendedFrameColors (array of strings)
              - recommendedFrameStyle (string)
              - recommendedGlazing (string)
              - mountRecommendation (boolean)
              - mountReason (string)
              - confidence (number)`,
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error: any) {
    // If vision model not available, return basic analysis
    console.warn('Vision API not available, using fallback analysis');
    return {
      dominantColors: ['#000000', '#FFFFFF', '#808080'],
      colorTemperature: 'neutral',
      colorTemperatureConfidence: 0.5,
      subjectMatter: ['artwork'],
      mood: ['elegant', 'classic'],
      complexity: 0.5,
      recommendedFrameColors: ['black', 'white', 'natural'],
      recommendedFrameStyle: 'classic',
      recommendedGlazing: 'acrylic',
      mountRecommendation: true,
      mountReason: 'Adds visual separation',
      confidence: 0.6,
    };
  }
}

/**
 * Detect walls in room photo
 */
export async function detectWallsInRoom(imageUrl: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Supports vision
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this room photo and detect walls suitable for hanging artwork.
              For each wall, provide:
              1. Bounding box coordinates (x1, y1, x2, y2) as percentages (0-100)
              2. Center point (x, y) as percentages
              3. Estimated wall dimensions in feet (if determinable)
              4. Perspective angle (degrees from straight-on)
              5. Lighting conditions (bright/dim/natural/artificial)
              6. Suitability score (0-1, how good for artwork)
              
              Also provide overall room info:
              - Room style (modern/traditional/minimalist/etc)
              - Wall color
              - Lighting quality
              
              Return as JSON with:
              - walls (array of wall objects)
              - roomStyle (string)
              - wallColor (string)
              - lighting (string)`,
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const walls = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      walls: walls.walls,
      roomInfo: {
        lighting: walls.lighting,
        style: walls.style
      }
    };
  } catch (error: any) {
    // If vision not available, return mock wall detection
    console.warn('Vision API not available for room detection');
    return {
      walls: [{
        id: 'wall-1',
        bounds: { x1: 20, y1: 20, x2: 80, y2: 80 },
        center: { x: 50, y: 50 },
        dimensions: { width: 10, height: 8 },
        suitabilityScore: 0.8,
      }],
      roomInfo: {
        lighting: 'natural',
        style: 'modern',
      },
    };
  }
}

/**
 * Generate framing suggestions based on config and analysis
 */
export async function generateAISuggestions(
  config: any,
  imageAnalysis: any,
  userContext: any
) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `You are an expert art framing consultant. Analyze the current frame configuration and suggest 2-3 improvements. Consider:
          - Color harmony
          - Style consistency
          - Budget optimization
          - Quality vs price trade-offs
          - Room context
          
          For each suggestion, provide:
          - type (add/change/upgrade/remove)
          - target (which config property to change)
          - value (what to change it to)
          - reason (1 sentence explaining benefit)
          - impact (price change, aesthetic improvement)
          - confidence (0-1)
          - priority (1-3, 1 being highest)
          
          Return as JSON array of suggestions.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          currentConfig: config,
          imageAnalysis,
          userContext,
        }),
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
  });

  const response = JSON.parse(completion.choices[0].message.content || '{}');
  return response.suggestions || [];
}

