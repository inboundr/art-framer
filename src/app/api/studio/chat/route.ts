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
        model: 'gpt-3.5-turbo', // Free tier model available to all accounts
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
            description: 'Update frame configuration based on user request',
            parameters: {
              type: 'object',
              properties: {
                frameColor: {
                  type: 'string',
                  enum: ['black', 'white', 'natural', 'brown', 'gold', 'silver', 'dark grey', 'light grey'],
                },
                frameStyle: {
                  type: 'string',
                  enum: ['classic', 'modern', 'ornate', 'minimal'],
                },
                size: { type: 'string' },
                glaze: {
                  type: 'string',
                  enum: ['none', 'acrylic', 'glass', 'motheye'],
                },
                mount: {
                  type: 'string',
                  enum: ['none', '1.4mm', '2.0mm', '2.4mm'],
                },
                mountColor: { type: 'string' },
                wrap: {
                  type: 'string',
                  enum: ['Black', 'White', 'ImageWrap', 'MirrorWrap'],
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

      return NextResponse.json({
        role: message?.role || 'assistant',
        content: message?.content || '',
        function_call: message?.function_call || null,
      });
    } catch (openaiError: any) {
      console.warn('OpenAI API not available, using fallback response:', openaiError.message);
      
      // Provide intelligent fallback based on user's last message
      const lastMessage = messages[messages.length - 1]?.content || '';
      const fallbackResponse = generateFallbackResponse(lastMessage, frameConfig);
      
      return NextResponse.json({
        role: 'assistant',
        content: fallbackResponse.content,
        function_call: fallbackResponse.function_call || null,
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

  if (frameConfig.price) {
    parts.push(`- Current price: $${frameConfig.price}`);
  }

  if (frameConfig.glaze && frameConfig.glaze !== 'none') {
    parts.push(`- Has ${frameConfig.glaze} glazing`);
  }

  if (frameConfig.mount && frameConfig.mount !== 'none') {
    parts.push(`- Has ${frameConfig.mount} mount`);
  }

  return parts.join('\n');
}

/**
 * Generate fallback responses when OpenAI is not available
 * Also handle function calls for configuration updates
 */
function generateFallbackResponse(userMessage: string, frameConfig: any): { content: string; function_call?: any } {
  const lowerMessage = userMessage.toLowerCase();
  
  // ==== COLOR CHANGES ====
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
  if (lowerMessage.includes('bigger') || lowerMessage.includes('larger')) {
    const currentSize = frameConfig.size || '16x20';
    const newSize = currentSize === '16x20' ? '24x30' : '24x36';
    return {
      content: `✅ Increased size to ${newSize}"! This creates more presence on your wall.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: newSize }) }
    };
  }
  
  if (lowerMessage.includes('smaller')) {
    return {
      content: `✅ Reduced to 11x14"! Perfect for smaller walls or gallery groupings.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '11x14' }) }
    };
  }
  
  // Specific size requests
  if (lowerMessage.match(/\b8\s?x\s?10\b|\b8x10\b/)) {
    return {
      content: `✅ Set to 8x10"! Perfect desk or shelf size.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '8x10' }) }
    };
  }
  
  if (lowerMessage.match(/\b16\s?x\s?20\b|\b16x20\b/)) {
    return {
      content: `✅ Set to 16x20"! A popular medium size that works in most rooms.`,
      function_call: { name: 'update_frame', arguments: JSON.stringify({ size: '16x20' }) }
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

  if (lowerMessage.includes('size') && !(lowerMessage.includes('bigger') || lowerMessage.includes('smaller'))) {
    return {
      content: `Current size: ${frameConfig.size}. Available sizes:\n\n• 8x10" - Desk/shelf\n• 11x14" - Small walls\n• 16x20" - Medium (popular!)\n• 20x30" - Large presence\n• 24x36" - Statement piece\n\nSay "Make it bigger", "Try 20x30", or pick a size!`
    };
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
    const price = frameConfig.price > 0 ? `$${frameConfig.price}` : 'calculating...';
    return {
      content: `💰 Your current total is ${price}.\n\nPrice factors:\n• Frame size (bigger = more $$)\n• Glaze type (motheye is premium)\n• Mount (adds $12-15)\n• Frame material\n\nWant budget-friendly options? Try "smaller size" or "acrylic glaze"!`
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
    content: `I'm your frame customization assistant! Try saying:\n\n🎨 "Try a black frame"\n📏 "Make it bigger" or "Try 24x36"\n📄 "Add a mount"\n💎 "Upgrade to premium glaze"\n🏠 "Show me in my room"\n❓ "What colors work?" or "Recommend something"\n\nWhat would you like to do?`
  };
}

