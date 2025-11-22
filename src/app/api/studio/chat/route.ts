/**
 * AI Chat API - Streaming responses with function calling
 */

import { openai, FRAME_AI_SYSTEM_PROMPT } from '@/lib/studio/openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, frameConfig, imageAnalysis } = await req.json();

    // Build context for AI
    const contextMessage = buildContextMessage(frameConfig, imageAnalysis);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // More capable model for compound requests
        stream: false,
        messages: [
          {
            role: 'system',
            content: FRAME_AI_SYSTEM_PROMPT + '\n\n' + contextMessage,
          },
          ...messages,
        ],
        functions: [
          {
            name: 'update_frame',
            description: 'Update frame configuration based on user request. Can change colors, sizes, product types, mounts, glazing, and canvas wraps.',
            parameters: {
              type: 'object',
              properties: {
                productType: {
                  type: 'string',
                  enum: ['framed-print', 'canvas', 'framed-canvas', 'acrylic', 'metal', 'poster'],
                  description: 'Type of wall art product',
                },
                frameColor: {
                  type: 'string',
                  enum: ['black', 'white', 'natural', 'brown', 'gold', 'silver', 'dark grey', 'light grey'],
                  description: 'Frame color (only for framed products)',
                },
                frameStyle: {
                  type: 'string',
                  enum: ['classic', 'modern', 'ornate', 'minimal'],
                  description: 'Frame style',
                },
                size: { 
                  type: 'string',
                  description: 'Size in inches (e.g., "8x10", "16x20", "24x36"). Available: 8x10, 11x14, 16x20, 18x24, 20x30, 24x36, 30x40, 36x48',
                },
                glaze: {
                  type: 'string',
                  enum: ['none', 'acrylic', 'glass', 'motheye'],
                  description: 'Glazing protection (only for framed prints and acrylic)',
                },
                mount: {
                  type: 'string',
                  enum: ['none', '1.4mm', '2.0mm', '2.4mm'],
                  description: 'Mount/mat thickness (only for framed prints)',
                },
                mountColor: { 
                  type: 'string',
                  description: 'Mount color (e.g., white, off-white, cream, black)',
                },
                wrap: {
                  type: 'string',
                  enum: ['Black', 'White', 'ImageWrap', 'MirrorWrap'],
                  description: 'Canvas edge wrap style (only for canvas products)',
                },
              },
            },
          },
          {
            name: 'show_comparison',
            description: 'Show side-by-side comparison of frame options',
            parameters: {
              type: 'object',
              properties: {
                option1: { type: 'object' },
                option2: { type: 'object' },
              },
            },
          },
          {
            name: 'show_in_room',
            description: 'Trigger room visualization feature',
            parameters: {
              type: 'object',
              properties: {
                mode: {
                  type: 'string',
                  enum: ['upload', 'ar', 'saved'],
                },
              },
            },
          },
          {
            name: 'generate_variations',
            description: 'Generate multiple frame variations for user to choose from',
            parameters: {
              type: 'object',
              properties: {
                count: { type: 'number' },
                variations: { type: 'array' },
              },
            },
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const message = completion.choices[0]?.message;

      // Convert function calls to structured suggestions
      const suggestions = message?.function_call
        ? [await convertFunctionCallToSuggestion(message.function_call, frameConfig)]
        : [];

      return NextResponse.json({
        role: message?.role || 'assistant',
        content: message?.content || '',
        function_call: message?.function_call || null, // Keep for backwards compatibility
        suggestions, // NEW: Structured suggestions for accept/reject UI
      });
    } catch (openaiError: any) {
      console.warn('OpenAI API not available, using fallback response:', openaiError.message);
      
      // Provide intelligent fallback based on user's last message
      const lastMessage = messages[messages.length - 1]?.content || '';
      const fallbackResponse = generateFallbackResponse(lastMessage, frameConfig);
      
      // Convert fallback function calls to structured suggestions
      const suggestions = fallbackResponse.function_call
        ? [await convertFunctionCallToSuggestion(fallbackResponse.function_call, frameConfig)]
        : [];
      
      return NextResponse.json({
        role: 'assistant',
        content: fallbackResponse.content,
        function_call: fallbackResponse.function_call || null,
        suggestions, // NEW: Structured suggestions
      });
    }
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * Build context message for AI based on current state
 */
function buildContextMessage(frameConfig: any, imageAnalysis: any): string {
  const parts = ['Current Context:'];

  if (frameConfig.imageUrl) {
    parts.push('- User has uploaded an image');
  }

  if (imageAnalysis) {
    parts.push(`- Image analysis: ${imageAnalysis.mood?.join(', ') || 'N/A'}`);
    parts.push(`- Dominant colors: ${imageAnalysis.dominantColors?.join(', ') || 'N/A'}`);
    parts.push(`- Recommended frame colors: ${imageAnalysis.recommendedFrameColors?.join(', ') || 'N/A'}`);
  }

  if (frameConfig.frameColor) {
    parts.push(`- Current frame: ${frameConfig.frameColor} ${frameConfig.frameStyle}`);
  }

  if (frameConfig.size) {
    parts.push(`- Current size: ${frameConfig.size}`);
  }
  
  if (frameConfig.productType) {
    parts.push(`- Current product type: ${frameConfig.productType}`);
  }

  if (frameConfig.price) {
    parts.push(`- Current price: $${frameConfig.price}`);
  }

  if (frameConfig.glaze && frameConfig.glaze !== 'none') {
    parts.push(`- Has ${frameConfig.glaze} glazing`);
  }

  if (frameConfig.mount && frameConfig.mount !== 'none') {
    parts.push(`- Has ${frameConfig.mount} mount`);
  }
  
  if (frameConfig.wrap) {
    parts.push(`- Canvas wrap: ${frameConfig.wrap}`);
  }
  
  // Add available options
  parts.push('\nAvailable Options:');
  parts.push('- Sizes: small (11x14"), medium (16x20"), large (24x36"), or specific (8x10, 18x24, 20x30, 30x40, 36x48)');
  parts.push('- Frame colors: black, white, natural, brown, gold, silver, dark grey, light grey');
  parts.push('- Product types: framed-print, canvas, framed-canvas, acrylic, metal, poster');
  parts.push('- Glazing: none, acrylic, glass, motheye (premium)');
  parts.push('- Mount: none, 1.4mm, 2.0mm, 2.4mm');
  
  parts.push('\nIMPORTANT: If user requests multiple changes in one message (e.g., "gold frame, medium size, deliver in 5 days"), extract ALL requirements and update them together in a single function call.');

  return parts.join('\n');
}

/**
 * Generate fallback responses when OpenAI is not available
 * Also handle function calls for configuration updates
 */
function generateFallbackResponse(userMessage: string, frameConfig: any): { content: string; function_call?: any } {
  const lowerMessage = userMessage.toLowerCase();
  
  // Extract multiple requirements from a single message
  const updates: any = {};
  let responseText = '';
  const foundChanges: string[] = [];
  
  // ==== EXTRACT FRAME COLORS ====
  if (lowerMessage.includes('black') && (lowerMessage.includes('frame') || lowerMessage.includes('try') || lowerMessage.includes('change'))) {
    updates.frameColor = 'black';
    foundChanges.push('black frame');
  }
  
  if (lowerMessage.includes('white') && (lowerMessage.includes('frame') || lowerMessage.includes('try'))) {
    updates.frameColor = 'white';
    foundChanges.push('white frame');
  }
  
  if ((lowerMessage.includes('natural') || lowerMessage.includes('wood')) && lowerMessage.includes('frame')) {
    updates.frameColor = 'natural';
    foundChanges.push('natural wood frame');
  }
  
  if (lowerMessage.includes('gold') && (lowerMessage.includes('frame') || lowerMessage.includes('color'))) {
    updates.frameColor = 'gold';
    foundChanges.push('gold frame');
  }
  
  if (lowerMessage.includes('silver') && lowerMessage.includes('frame')) {
    updates.frameColor = 'silver';
    foundChanges.push('silver frame');
  }
  
  if (lowerMessage.includes('brown') && lowerMessage.includes('frame')) {
    updates.frameColor = 'brown';
    foundChanges.push('brown frame');
  }
  
  // ==== EXTRACT SIZE ====
  // Check for descriptive sizes first
  if (lowerMessage.includes('small') && (lowerMessage.includes('size') || lowerMessage.includes('option'))) {
    if (lowerMessage.includes('smallest')) {
      updates.size = '8x10';
      foundChanges.push('8x10" (smallest)');
    } else {
      updates.size = '11x14';
      foundChanges.push('11x14" (small)');
    }
  } else if (lowerMessage.includes('medium') && (lowerMessage.includes('size') || lowerMessage.includes('option') || !lowerMessage.includes('large'))) {
    updates.size = '16x20';
    foundChanges.push('16x20" (medium)');
  } else if (lowerMessage.includes('large') && (lowerMessage.includes('size') || lowerMessage.includes('option'))) {
    if (lowerMessage.includes('largest') || lowerMessage.includes('biggest')) {
      updates.size = '36x48';
      foundChanges.push('36x48" (largest)');
    } else {
      updates.size = '24x36';
      foundChanges.push('24x36" (large)');
    }
  } else if (lowerMessage.includes('bigger') || lowerMessage.includes('larger')) {
    const currentSize = frameConfig.size || '16x20';
    updates.size = currentSize === '16x20' ? '24x30' : '24x36';
    foundChanges.push(`${updates.size}" (larger)`);
  } else if (lowerMessage.includes('smaller')) {
    updates.size = '11x14';
    foundChanges.push('11x14" (smaller)');
  }
  
  // Check for specific sizes
  const sizeMatches = [
    { regex: /\b8\s?x\s?10\b|\b8x10\b/, size: '8x10' },
    { regex: /\b11\s?x\s?14\b|\b11x14\b/, size: '11x14' },
    { regex: /\b16\s?x\s?20\b|\b16x20\b/, size: '16x20' },
    { regex: /\b18\s?x\s?24\b|\b18x24\b/, size: '18x24' },
    { regex: /\b20\s?x\s?30\b|\b20x30\b/, size: '20x30' },
    { regex: /\b24\s?x\s?36\b|\b24x36\b/, size: '24x36' },
    { regex: /\b30\s?x\s?40\b|\b30x40\b/, size: '30x40' },
    { regex: /\b36\s?x\s?48\b|\b36x48\b/, size: '36x48' },
  ];
  
  for (const { regex, size } of sizeMatches) {
    if (lowerMessage.match(regex)) {
      updates.size = size;
      foundChanges.push(`${size}"`);
      break;
    }
  }
  
  // ==== EXTRACT DELIVERY REQUIREMENTS ====
  let deliveryNote = '';
  if (lowerMessage.match(/\d+\s*days?/)) {
    const daysMatch = lowerMessage.match(/(\d+)\s*days?/);
    if (daysMatch) {
      const requestedDays = parseInt(daysMatch[1]);
      deliveryNote = `\n\n📦 Delivery: Most orders ship within 1-2 days. Standard delivery typically takes 4-6 business days in the US. For ${requestedDays}-day delivery, please contact support about express shipping options.`;
    }
  }
  
  // If multiple changes found, return combined response
  if (Object.keys(updates).length > 1) {
    const changesList = foundChanges.join(', ');
    return {
      content: `✅ Got it! I'll update: ${changesList}.${deliveryNote}`,
      function_call: { name: 'update_frame', arguments: JSON.stringify(updates) }
    };
  }
  
  // If single change found, return it
  if (Object.keys(updates).length === 1) {
    // Build specific response based on what changed
    if (updates.frameColor) {
      const colorResponses: Record<string, string> = {
        black: 'Changed to a black frame! Modern, elegant look.',
        white: 'Switched to white! Clean, gallery-style appearance.',
        natural: 'Natural wood frame applied! Adds warmth.',
        gold: 'Upgraded to gold! Premium, classical touch.',
        silver: 'Silver frame applied! Sleek, modern metallic finish.',
        brown: 'Brown frame selected! Rich, warm tone.',
      };
      return {
        content: `✅ ${colorResponses[updates.frameColor] || 'Frame color updated!'}${deliveryNote}`,
        function_call: { name: 'update_frame', arguments: JSON.stringify(updates) }
      };
    }
    
    if (updates.size) {
      return {
        content: `✅ Set to ${updates.size}"! Great choice.${deliveryNote}`,
        function_call: { name: 'update_frame', arguments: JSON.stringify(updates) }
      };
    }
  }
  
  // Continue with existing single-intent handlers as fallback...
  // (keeping the rest of the function below)
  
  // ==== COLOR CHANGES (OLD - for backwards compatibility) ====
  if (lowerMessage.includes('black') && (lowerMessage.includes('frame') || lowerMessage.includes('try') || lowerMessage.includes('change'))) {
    return {
      content: `✅ Changed to a black frame! This gives a modern, elegant look that works with most artwork.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'black' }) }
    };
  }
  
  if (lowerMessage.includes('white') && (lowerMessage.includes('frame') || lowerMessage.includes('try'))) {
    return {
      content: `✅ Switched to white! This creates a clean, gallery-style look.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'white' }) }
    };
  }
  
  if ((lowerMessage.includes('natural') || lowerMessage.includes('wood')) && lowerMessage.includes('frame')) {
    return {
      content: `✅ Natural wood frame applied! This adds warmth and complements most artwork beautifully.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'natural' }) }
    };
  }
  
  if (lowerMessage.includes('gold') && lowerMessage.includes('frame')) {
    return {
      content: `✅ Upgraded to gold! This adds a premium, classical touch perfect for elegant artwork.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'gold' }) }
    };
  }
  
  if (lowerMessage.includes('silver') && lowerMessage.includes('frame')) {
    return {
      content: `✅ Silver frame applied! This gives a sleek, modern metallic finish.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'silver' }) }
    };
  }
  
  if (lowerMessage.includes('brown') && lowerMessage.includes('frame')) {
    return {
      content: `✅ Brown frame selected! This rich, warm tone works great with traditional art.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameColor: 'brown' }) }
    };
  }
  
  // ==== SIZE CHANGES ====
  // Smallest size
  if (lowerMessage.includes('smallest') || (lowerMessage.includes('small') && lowerMessage.includes('option'))) {
    return {
      content: `✅ Set to 8x10" - the smallest option! Perfect for desks, shelves, or small spaces.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '8x10' }) }
    };
  }
  
  // Largest size
  if (lowerMessage.includes('largest') || lowerMessage.includes('biggest') || (lowerMessage.includes('large') && lowerMessage.includes('option'))) {
    return {
      content: `✅ Set to 36x48" - the largest option! Massive statement piece for feature walls.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '36x48' }) }
    };
  }
  
  // Make bigger/larger
  if (lowerMessage.includes('bigger') || lowerMessage.includes('larger')) {
    const currentSize = frameConfig.size || '16x20';
    const newSize = currentSize === '16x20' ? '24x30' : '24x36';
    return {
      content: `✅ Increased size to ${newSize}"! This creates more presence on your wall.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: newSize }) }
    };
  }
  
  // Make smaller
  if (lowerMessage.includes('smaller') || lowerMessage.includes('small size')) {
    return {
      content: `✅ Reduced to 11x14"! Perfect for smaller walls or gallery groupings.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '11x14' }) }
    };
  }
  
  // Specific size requests (with more variations)
  if (lowerMessage.match(/\b8\s?x\s?10\b|\b8x10\b/)) {
    return {
      content: `✅ Set to 8x10"! Perfect desk or shelf size.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '8x10' }) }
    };
  }
  
  if (lowerMessage.match(/\b11\s?x\s?14\b|\b11x14\b/)) {
    return {
      content: `✅ Set to 11x14"! Great small to medium size.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '11x14' }) }
    };
  }
  
  if (lowerMessage.match(/\b16\s?x\s?20\b|\b16x20\b/)) {
    return {
      content: `✅ Set to 16x20"! A popular medium size that works in most rooms.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '16x20' }) }
    };
  }
  
  if (lowerMessage.match(/\b18\s?x\s?24\b|\b18x24\b/)) {
    return {
      content: `✅ Set to 18x24"! Nice medium-large size with great proportions.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '18x24' }) }
    };
  }
  
  if (lowerMessage.match(/\b20\s?x\s?30\b|\b20x30\b/)) {
    return {
      content: `✅ Set to 20x30"! Great size for making a statement.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '20x30' }) }
    };
  }
  
  if (lowerMessage.match(/\b24\s?x\s?36\b|\b24x36\b/)) {
    return {
      content: `✅ Set to 24x36"! Large and impressive - perfect for feature walls.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '24x36' }) }
    };
  }
  
  if (lowerMessage.match(/\b30\s?x\s?40\b|\b30x40\b/)) {
    return {
      content: `✅ Set to 30x40"! Extra large - creates dramatic impact.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '30x40' }) }
    };
  }
  
  if (lowerMessage.match(/\b36\s?x\s?48\b|\b36x48\b/)) {
    return {
      content: `✅ Set to 36x48"! Massive size - perfect for gallery walls or feature spaces.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '36x48' }) }
    };
  }
  
  // ==== MOUNT/MAT ====
  if (lowerMessage.includes('add mount') || lowerMessage.includes('add mat') || lowerMessage.includes('with mount')) {
    return {
      content: `✅ Added a 2.4mm mount! This creates breathing room around your artwork and adds elegance.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ mount: '2.4mm' }) }
    };
  }
  
  if (lowerMessage.includes('remove mount') || lowerMessage.includes('no mount') || lowerMessage.includes('without mount')) {
    return {
      content: `✅ Removed the mount for a clean, borderless look.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ mount: 'none' }) }
    };
  }
  
  if (lowerMessage.includes('white mount') || lowerMessage.includes('white mat')) {
    return {
      content: `✅ Changed to a white mount! Classic and versatile.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ mount: '2.4mm', mountColor: 'white' }) }
    };
  }
  
  if (lowerMessage.includes('black mount') || lowerMessage.includes('black mat')) {
    return {
      content: `✅ Switched to a black mount! Bold and dramatic.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ mount: '2.4mm', mountColor: 'black' }) }
    };
  }
  
  // ==== GLAZE/GLASS ====
  if (lowerMessage.includes('premium') || lowerMessage.includes('museum glass') || lowerMessage.includes('motheye')) {
    return {
      content: `✅ Upgraded to premium motheye glaze! This provides 99% UV protection and eliminates glare - perfect for bright rooms.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ glaze: 'motheye' }) }
    };
  }
  
  if (lowerMessage.includes('acrylic') || (lowerMessage.includes('standard') && lowerMessage.includes('glaze'))) {
    return {
      content: `✅ Set to acrylic glaze. Lightweight, shatter-resistant, and budget-friendly.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ glaze: 'acrylic' }) }
    };
  }
  
  if (lowerMessage.includes('glass glaze') || lowerMessage === 'glass') {
    return {
      content: `✅ Using traditional glass glaze. Clear and classic.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ glaze: 'glass' }) }
    };
  }
  
  if (lowerMessage.includes('no glaze') || lowerMessage.includes('without glaze')) {
    return {
      content: `✅ Removed glaze. Your artwork will be unprotected but frameless.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ glaze: 'none' }) }
    };
  }
  
  // ==== PRODUCT TYPE ====
  if (lowerMessage.includes('framed print') || (lowerMessage.includes('frame') && lowerMessage.includes('print'))) {
    return {
      content: `✅ Switched to Framed Print! Traditional framed artwork with mount options.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'framed-print' }) }
    };
  }
  
  if (lowerMessage.includes('canvas') && !lowerMessage.includes('framed')) {
    return {
      content: `✅ Changed to Canvas! Gallery-wrapped canvas without a frame.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'canvas', wrap: 'Black' }) }
    };
  }
  
  if (lowerMessage.includes('framed canvas')) {
    return {
      content: `✅ Framed Canvas selected! Canvas print with a traditional frame.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'framed-canvas' }) }
    };
  }
  
  if (lowerMessage.includes('acrylic') && !lowerMessage.includes('glaze')) {
    return {
      content: `✅ Acrylic Print! Modern and sleek - your art printed directly on acrylic.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'acrylic' }) }
    };
  }
  
  if (lowerMessage.includes('metal print')) {
    return {
      content: `✅ Metal Print! Vibrant and durable - printed on aluminum.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'metal' }) }
    };
  }
  
  if (lowerMessage.includes('poster') && !lowerMessage.includes('canvas')) {
    return {
      content: `✅ Poster! Unframed print - perfect for easy display or custom framing.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ productType: 'poster' }) }
    };
  }
  
  // ==== FRAME STYLE ====
  if (lowerMessage.includes('modern style') || lowerMessage.includes('modern frame')) {
    return {
      content: `✅ Switched to modern style! Clean lines and minimalist aesthetic.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameStyle: 'modern' }) }
    };
  }
  
  if (lowerMessage.includes('classic style') || lowerMessage.includes('classic frame')) {
    return {
      content: `✅ Classic style selected! Timeless and versatile.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameStyle: 'classic' }) }
    };
  }
  
  if (lowerMessage.includes('ornate') || lowerMessage.includes('decorative')) {
    return {
      content: `✅ Ornate style applied! Detailed and elegant - perfect for traditional art.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameStyle: 'ornate' }) }
    };
  }
  
  if (lowerMessage.includes('minimal') || lowerMessage.includes('minimalist')) {
    return {
      content: `✅ Minimal style! Simple and unobtrusive - lets your art shine.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ frameStyle: 'minimal' }) }
    };
  }
  
  // ==== CANVAS WRAP OPTIONS ====
  if (lowerMessage.includes('black wrap') || (lowerMessage.includes('black') && lowerMessage.includes('edge'))) {
    return {
      content: `✅ Black wrap! Clean black edges around your canvas for a modern look.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ wrap: 'Black' }) }
    };
  }
  
  if (lowerMessage.includes('white wrap') || (lowerMessage.includes('white') && lowerMessage.includes('edge'))) {
    return {
      content: `✅ White wrap! Bright white edges for a clean, gallery-style appearance.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ wrap: 'White' }) }
    };
  }
  
  if (lowerMessage.includes('image wrap') || lowerMessage.includes('full bleed')) {
    return {
      content: `✅ Image wrap! Your artwork extends around the edges for a seamless, modern look. Make sure your image has enough bleed area.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ wrap: 'ImageWrap' }) }
    };
  }
  
  if (lowerMessage.includes('mirror wrap') || lowerMessage.includes('mirrored edge')) {
    return {
      content: `✅ Mirror wrap! The edges show a mirrored reflection of your artwork - protects the composition while creating depth.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ wrap: 'MirrorWrap' }) }
    };
  }
  
  // ==== ROOM VISUALIZATION ====
  if (lowerMessage.includes('room') || lowerMessage.includes('wall') || lowerMessage.includes('see in')) {
    return {
      content: `🏠 Great idea! To see this in your space, click the "See in room" button or upload a photo of your wall.`,
      function_call: { name: 'show_in_room', arguments: JSON.stringify({ mode: 'upload' }) }
    };
  }
  
  // ==== COMPARISONS ====
  if (lowerMessage.includes('compare') || lowerMessage.includes('show options') || lowerMessage.includes('show me different')) {
    return {
      content: `Let me show you some variations! I'll generate a few different options for you to compare.`,
      function_call: { name: 'generate_variations', arguments: JSON.stringify({ count: 3 }) }
    };
  }

  // ==== INFORMATIONAL QUERIES (no function calls) ====
  if (lowerMessage.includes('color') && !lowerMessage.includes('frame')) {
    return {
      content: `Your current frame is ${frameConfig.frameColor}. Available colors:\n\n🖤 Black - Modern and elegant\n⚪ White - Clean gallery look\n🟤 Natural - Warm wood tones\n⭐ Gold - Premium classic\n🔷 Silver - Sleek modern\n\nJust say "Try [color] frame"!`
    };
  }

  if (lowerMessage.includes('size') && !(lowerMessage.includes('bigger') || lowerMessage.includes('smaller') || lowerMessage.includes('smallest') || lowerMessage.includes('largest'))) {
    return {
      content: `Current size: ${frameConfig.size}. Available sizes:\n\n• 8x10" - Smallest (desk/shelf)\n• 11x14" - Small walls\n• 16x20" - Medium (popular!)\n• 18x24" - Medium-large\n• 20x30" - Large presence\n• 24x36" - Statement piece\n• 30x40" - Extra large\n• 36x48" - Largest (gallery walls)\n\nSay "Give me the smallest", "Try 20x30", or pick any size!`
    };
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    const price = frameConfig.price > 0 ? `$${frameConfig.price}` : 'calculating...';
    return {
      content: `💰 Your current total is ${price}.\n\nPrice factors:\n• Frame size (bigger = more $$)\n• Glaze type (motheye is premium)\n• Mount (adds $12-15)\n• Frame material\n\nWant budget-friendly options? Try "smaller size" or "acrylic glaze"!`
    };
  }
  
  if (lowerMessage.includes('what') && (lowerMessage.includes('product type') || lowerMessage.includes('wall art'))) {
    return {
      content: `We offer several wall art types:\n\n🖼️ Framed Print - Traditional with frame & mount\n🎨 Canvas - Gallery-wrapped, frameless\n🖼️ Framed Canvas - Canvas with frame\n✨ Acrylic Print - Modern, printed on acrylic\n🔲 Metal Print - Vibrant, printed on aluminum\n📄 Poster - Unframed, ready to frame\n\nSay "Try canvas" or "Make it acrylic"!`
    };
  }
  
  if (lowerMessage.includes('what') && (lowerMessage.includes('mount') || lowerMessage.includes('mat'))) {
    return {
      content: `A mount (also called a mat) is the border between your artwork and the frame. Benefits:\n\n✅ Creates breathing room\n✅ Adds elegance\n✅ Protects artwork\n✅ Professional look\n\nSay "Add mount" to try it!`
    };
  }
  
  if (lowerMessage.includes('what') && (lowerMessage.includes('glaze') || lowerMessage.includes('glass'))) {
    return {
      content: `Glazing protects your artwork! Options:\n\n• Acrylic - Budget-friendly, shatter-resistant\n• Glass - Traditional, crystal clear\n• Motheye - Premium, 99% UV protection, anti-glare\n\nFor bright rooms or valuable art, I recommend motheye!`
    };
  }
  
  if (lowerMessage.includes('what') && lowerMessage.includes('wrap')) {
    return {
      content: `Canvas wrap options:\n\n• Black - Clean black edges\n• White - Bright white edges\n• Image Wrap - Your image wraps around edges\n• Mirror Wrap - Mirrored image on edges\n\nSay "Image wrap" to try it!`
    };
  }
  
  if (lowerMessage.includes('suggest') || lowerMessage.includes('recommend') || lowerMessage.includes('advice')) {
    const suggestions = [];
    if (frameConfig.frameColor === 'black') suggestions.push('• Try a white frame for contrast');
    if (frameConfig.mount === 'none') suggestions.push('• Add a mount for elegance (+$12)');
    if (frameConfig.glaze === 'acrylic') suggestions.push('• Upgrade to motheye glaze for protection (+$25)');
    
    return {
      content: `Based on your ${frameConfig.size}" frame:\n\n${suggestions.join('\n') || '• Your config looks great!'}\n\nJust say what you'd like to try!`
    };
  }

  // ==== ACTIONS ====
  if (lowerMessage.includes('reset') || lowerMessage.includes('start over')) {
    return {
      content: `Starting fresh! I've reset to default options. What kind of frame would you like?`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ 
        frameColor: 'black',
        frameStyle: 'classic',
        size: '16x20',
        mount: 'none',
        glaze: 'acrylic'
      }) }
    };
  }

  // ==== DEFAULT HELPFUL RESPONSE ====
  return {
    content: `I'm your frame customization assistant! Try saying:\n\n🎨 "Try a black frame"\n📏 "Give me the smallest option" or "Try 24x36"\n📄 "Add a mount"\n💎 "Upgrade to premium glaze"\n🖼️ "Make it a canvas"\n🏠 "Show me in my room"\n❓ "What colors work?" or "Recommend something"\n\nWhat would you like to do?`
  };
}

/**
 * Convert OpenAI function calls into structured suggestions with pricing
 */
async function convertFunctionCallToSuggestion(
  functionCall: any,
  currentConfig: any
): Promise<any> {
  const { name, arguments: argsString } = functionCall;
  const args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString;

  // Generate suggestion based on function name
  switch (name) {
    case 'update_frame':
      return {
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'configuration',
        title: generateSuggestionTitle(args),
        description: generateSuggestionDescription(args, currentConfig),
        changes: args,
        currentValues: extractCurrentValues(args, currentConfig),
        confidence: 0.9,
        reason: generateSuggestionReason(args, currentConfig),
        timestamp: Date.now(),
      };
      
    case 'show_comparison':
      return {
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'comparison',
        title: 'Compare Options',
        description: 'See different frame options side-by-side',
        changes: {},
        timestamp: Date.now(),
      };
      
    case 'show_in_room':
      return {
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        title: 'Room Visualization',
        description: 'Upload a photo of your room to see this frame in your space',
        changes: {},
        timestamp: Date.now(),
      };
      
    default:
      return {
        id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        title: 'Suggestion',
        description: 'AI suggestion',
        changes: args,
        timestamp: Date.now(),
      };
  }
}

function generateSuggestionTitle(changes: any): string {
  const keys = Object.keys(changes);
  if (keys.length === 1) {
    const key = keys[0];
    const value = changes[key];
    
    switch (key) {
      case 'frameColor':
        return `Change Frame to ${capitalize(value)}`;
      case 'size':
        return `Resize to ${value}"`;
      case 'glaze':
        return value === 'none' ? 'Remove Glaze' : `Apply ${capitalize(value)} Glaze`;
      case 'mount':
        return value === 'none' ? 'Remove Mount' : `Add ${value} Mount`;
      case 'wrap':
        return `Change Canvas Wrap to ${value}`;
      case 'productType':
        return `Switch to ${capitalize(value)}`;
      default:
        return `Update ${capitalize(key)}`;
    }
  }
  
  return `Update ${keys.length} Options`;
}

function generateSuggestionDescription(changes: any, current: any): string {
  const keys = Object.keys(changes);
  
  if (keys.length === 1) {
    const key = keys[0];
    const value = changes[key];
    const oldValue = current[key];
    
    if (oldValue && oldValue !== value) {
      return `Change from ${oldValue} to ${value}`;
    }
    
    return `Set ${key} to ${value}`;
  }
  
  const changeList = keys.map(k => `${k}: ${changes[k]}`).join(', ');
  return `Update multiple options: ${changeList}`;
}

function generateSuggestionReason(changes: any, current: any): string {
  const keys = Object.keys(changes);
  
  if (keys.includes('frameColor')) {
    const color = changes.frameColor;
    const reasons: Record<string, string> = {
      black: 'Black frames create a modern, elegant look that works with most artwork',
      white: 'White frames offer a clean, gallery-style appearance perfect for bright spaces',
      natural: 'Natural wood adds warmth and complements artwork beautifully',
      gold: 'Gold frames add a premium, classical touch ideal for elegant pieces',
      silver: 'Silver provides a sleek, modern metallic finish',
    };
    return reasons[color] || 'This color will enhance your artwork';
  }
  
  if (keys.includes('glaze')) {
    if (changes.glaze === 'motheye') {
      return 'Motheye glaze offers 99% UV protection and anti-glare properties - perfect for valuable artwork';
    }
    if (changes.glaze === 'acrylic') {
      return 'Acrylic glazing is shatter-resistant and budget-friendly while still protecting your art';
    }
  }
  
  if (keys.includes('mount') && changes.mount !== 'none') {
    return 'A mount creates breathing room around your artwork and adds a professional, gallery-quality look';
  }
  
  return 'This change will improve the overall presentation of your artwork';
}

function extractCurrentValues(changes: any, current: any): Record<string, any> {
  const values: Record<string, any> = {};
  Object.keys(changes).forEach(key => {
    values[key] = current[key];
  });
  return values;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

