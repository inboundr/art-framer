/**
 * AI Agent System for Frame Customization
 * Uses AI SDK agents with tools for sophisticated interactions
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getLifestyleImages, getChevronImage, getCornerImages, getCrossSectionImage } from '@/lib/prodigi-assets/asset-catalog';
import type { FrameConfiguration } from '@/store/studio';

/**
 * AI Agent Tools
 * These are the capabilities the AI agent has access to
 */

// Tool: Compare two product configurations
// Using explicit object schema to avoid AI SDK schema conversion issues
const compareProductsTool = tool({
  description: 'Compare two different frame/product configurations side-by-side. Shows differences in frame color, size, product type, mounts, glazing, and pricing.',
  parameters: z.object({
    comparisonType: z.enum(['color', 'size', 'product', 'mount', 'glaze', 'wrap', 'full']).optional(),
    
    // Option 1 (Flattened)
    op1_frameColor: z.string().optional(),
    op1_size: z.string().optional(),
    op1_productType: z.string().optional(),
    op1_mount: z.string().optional(),
    op1_mountColor: z.string().optional(),
    op1_glaze: z.string().optional(),
    op1_wrap: z.string().optional(),
    op1_price: z.number().optional(),
    
    // Option 2 (Flattened)
    op2_frameColor: z.string().optional(),
    op2_size: z.string().optional(),
    op2_productType: z.string().optional(),
    op2_mount: z.string().optional(),
    op2_mountColor: z.string().optional(),
    op2_glaze: z.string().optional(),
    op2_wrap: z.string().optional(),
    op2_price: z.number().optional(),
  }),
  execute: async (params: any) => {
    // Reconstruct option objects
    const option1 = {
      frameColor: params.op1_frameColor,
      size: params.op1_size,
      productType: params.op1_productType,
      mount: params.op1_mount,
      mountColor: params.op1_mountColor,
      glaze: params.op1_glaze,
      wrap: params.op1_wrap,
      price: params.op1_price,
    };
    
    const option2 = {
      frameColor: params.op2_frameColor,
      size: params.op2_size,
      productType: params.op2_productType,
      mount: params.op2_mount,
      mountColor: params.op2_mountColor,
      glaze: params.op2_glaze,
      wrap: params.op2_wrap,
      price: params.op2_price,
    };
    
    // Calculate differences
    const differences: string[] = [];
    const similarities: string[] = [];
    
    if (option1.frameColor !== option2.frameColor) {
      differences.push(`Frame: ${option1.frameColor || 'none'} vs ${option2.frameColor || 'none'}`);
    } else if (option1.frameColor) {
      similarities.push(`Both use ${option1.frameColor} frame`);
    }
    
    if (option1.size !== option2.size) {
      differences.push(`Size: ${option1.size || 'none'} vs ${option2.size || 'none'}`);
    } else if (option1.size) {
      similarities.push(`Both are ${option1.size}`);
    }
    
    if (option1.productType !== option2.productType) {
      differences.push(`Product: ${option1.productType || 'none'} vs ${option2.productType || 'none'}`);
    }
    
    if (option1.mount !== option2.mount) {
      differences.push(`Mount: ${option1.mount || 'none'} vs ${option2.mount || 'none'}`);
    }
    
    if (option1.glaze !== option2.glaze) {
      differences.push(`Glaze: ${option1.glaze || 'none'} vs ${option2.glaze || 'none'}`);
    }
    
    const priceDiff = (option1.price || 0) - (option2.price || 0);
    if (Math.abs(priceDiff) > 0.01) {
      differences.push(`Price: $${option1.price?.toFixed(2) || '0'} vs $${option2.price?.toFixed(2) || '0'} (${priceDiff > 0 ? '+' : ''}$${priceDiff.toFixed(2)})`);
    }
    
    return {
      differences,
      similarities,
      option1,
      option2,
      recommendation: generateComparisonRecommendation(option1, option2, params.comparisonType || 'full'),
    };
  },
} as any);

// Tool: Get image suggestions based on product type and configuration
const getImageSuggestionsTool = tool({
  description: 'Get visual examples and lifestyle images for a product type or frame configuration. Returns paths to Prodigi assets that can be displayed to the user.',
  parameters: z.object({
    productType: z.string().describe('Product type (framed-print, canvas, framed-canvas, acrylic, etc.)'),
    frameType: z.string().optional().describe('Frame type (classic, box, spacer, float)'),
    frameColor: z.string().optional().describe('Frame color'),
    viewType: z.string().optional().describe('Type of images to retrieve: lifestyle, chevron, corner, cross-section, or all. Default is lifestyle.'),
    limit: z.number().optional().describe('Maximum number of images to return (1-10). Default is 3.'),
  }),
  execute: async ({ productType, frameType, frameColor, viewType: viewTypeParam, limit: limitParam }: any) => {
    // Validate and apply defaults
    const validViewTypes = ['lifestyle', 'chevron', 'corner', 'cross-section', 'all'];
    const viewType = (viewTypeParam && validViewTypes.includes(viewTypeParam)) 
      ? viewTypeParam 
      : 'lifestyle';
    const limit = (limitParam && limitParam >= 1 && limitParam <= 10) 
      ? Math.floor(limitParam) 
      : 3;
    
    const images: Array<{ path: string; type: string; description: string }> = [];
    
    // Get lifestyle images
    if (viewType === 'lifestyle' || viewType === 'all') {
      const lifestyleImages = getLifestyleImages(productType as any);
      lifestyleImages.slice(0, limit).forEach(path => {
        images.push({
          path,
          type: 'lifestyle',
          description: `${productType} lifestyle example`,
        });
      });
    }
    
    // Get chevron images (frame profile views)
    if ((viewType === 'chevron' || viewType === 'all') && frameType && frameColor) {
      const chevron = getChevronImage(frameType, frameColor);
      if (chevron) {
        images.push({
          path: chevron,
          type: 'chevron',
          description: `${frameColor} ${frameType} frame profile view`,
        });
      }
    }
    
    // Get corner detail images
    if ((viewType === 'corner' || viewType === 'all') && frameType && frameColor) {
      const corners = getCornerImages(frameType, frameColor);
      corners.slice(0, 2).forEach(path => {
        images.push({
          path,
          type: 'corner',
          description: `${frameColor} ${frameType} frame corner detail`,
        });
      });
    }
    
    // Get cross-section images
    if ((viewType === 'cross-section' || viewType === 'all') && frameType) {
      const crossSection = getCrossSectionImage(frameType);
      if (crossSection) {
        images.push({
          path: crossSection,
          type: 'cross-section',
          description: `${frameType} frame technical cross-section`,
        });
      }
    }
    
    return {
      images: images.slice(0, limit),
      count: images.length,
      productType,
      frameType,
      frameColor,
    };
  },
} as any);

// Tool: Generate product recommendations
const recommendProductsTool = tool({
  description: 'Generate personalized product recommendations based on user preferences, image analysis, budget, and room context. Returns multiple options with explanations.',
  parameters: z.object({
    // Flattened preferences
    pref_style: z.enum(['modern', 'classic', 'minimal', 'ornate']).optional(),
    pref_budget: z.enum(['budget', 'mid-range', 'premium']).optional(),
    pref_roomType: z.string().optional(),
    pref_colorScheme: z.string().optional(),
    
    // Flattened image analysis
    img_dominantColors: z.array(z.string()).optional(),
    img_mood: z.array(z.string()).optional(),
    img_style: z.string().optional(),
    
    // Flattened current config
    curr_productType: z.string().optional(),
    curr_frameColor: z.string().optional(),
    curr_size: z.string().optional(),
    
    count: z.number().min(1).max(5).optional().describe('Number of recommendations to generate (1-5)'),
  }),
  execute: async (params: any) => {
    // Reconstruct objects
    const preferences = {
      style: params.pref_style,
      budget: params.pref_budget,
      roomType: params.pref_roomType,
      colorScheme: params.pref_colorScheme,
    };
    
    const imageAnalysis = {
      dominantColors: params.img_dominantColors,
      mood: params.img_mood,
      style: params.img_style,
    };
    
    const currentConfig = {
      productType: params.curr_productType,
      frameColor: params.curr_frameColor,
      size: params.curr_size,
    };
    
    const recommendations = [];
    const count = params.count || 3;
    
    // Generate recommendations based on preferences and analysis
    for (let i = 0; i < count; i++) {
      const recommendation = {
        id: `rec-${Date.now()}-${i}`,
        productType: i === 0 ? (currentConfig?.productType || 'framed-print') : ['canvas', 'framed-canvas', 'acrylic'][i % 3],
        frameColor: preferences?.style === 'modern' ? 'black' : preferences?.style === 'classic' ? 'natural' : 'white',
        size: currentConfig?.size || '16x20',
        mount: i > 0 ? '2.4mm' : 'none',
        glaze: preferences?.budget === 'premium' ? 'motheye' : 'acrylic',
        reason: generateRecommendationReason(i, preferences, imageAnalysis),
        confidence: 0.8 - (i * 0.1),
      };
      recommendations.push(recommendation);
    }
    
    return {
      recommendations,
      basedOn: {
        preferences,
        imageAnalysis,
        currentConfig,
      },
    };
  },
} as any);

// Tool: Update frame configuration
const updateFrameTool = tool({
  description: 'Update the frame configuration based on user request. Can change colors, sizes, product types, mounts, glazing, and canvas wraps.',
  parameters: z.object({
    productType: z.enum(['framed-print', 'canvas', 'framed-canvas', 'acrylic', 'metal', 'poster']).optional(),
    frameColor: z.enum(['black', 'white', 'natural', 'brown', 'gold', 'silver', 'dark grey', 'light grey']).optional(),
    frameStyle: z.enum(['classic', 'modern', 'ornate', 'minimal']).optional(),
    size: z.string().optional(),
    glaze: z.enum(['none', 'acrylic', 'glass', 'motheye']).optional(),
    mount: z.enum(['none', '1.4mm', '2.0mm', '2.4mm']).optional(),
    mountColor: z.string().optional(),
    wrap: z.enum(['Black', 'White', 'ImageWrap', 'MirrorWrap']).optional(),
  }),
  execute: async (updates: any) => {
    return {
      success: true,
      updates,
      message: `Updated configuration: ${Object.keys(updates).join(', ')}`,
    };
  },
} as any);

/**
 * Generate comparison recommendation
 */
function generateComparisonRecommendation(option1: any, option2: any, comparisonType: string): string {
  if (comparisonType === 'color') {
    return `Option 1 (${option1.frameColor}) is more ${option1.frameColor === 'black' ? 'modern and versatile' : 'classic and warm'}, while Option 2 (${option2.frameColor}) offers ${option2.frameColor === 'white' ? 'a clean gallery look' : 'a different aesthetic'}.`;
  }
  
  if (comparisonType === 'size') {
    const size1 = option1.size || 'unknown';
    const size2 = option2.size || 'unknown';
    return `Option 1 (${size1}) is ${parseInt(size1.split('x')[0]) < parseInt(size2.split('x')[0]) ? 'smaller and more intimate' : 'larger and more impactful'}, while Option 2 (${size2}) provides ${parseInt(size2.split('x')[0]) > parseInt(size1.split('x')[0]) ? 'more presence' : 'better fit for smaller spaces'}.`;
  }
  
  return 'Both options have their merits. Consider your space, budget, and personal style when choosing.';
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(index: number, preferences: any, imageAnalysis: any): string {
  if (index === 0) {
    return 'Best match for your current preferences and image style';
  }
  if (index === 1) {
    return 'Alternative option that complements your color scheme';
  }
  return 'Budget-friendly option with great quality';
}

/**
 * System prompt for the AI agent
 */
const AGENT_SYSTEM_PROMPT = `You are an expert art framing consultant with 20 years of experience.
Your role is to guide customers through creating the perfect custom frame using sophisticated AI capabilities.

Your personality:
- Friendly and enthusiastic about art
- Knowledgeable but not pretentious
- Proactive with helpful suggestions
- Respectful of budget constraints
- Focused on customer delight

Your capabilities:
- Compare multiple product options side-by-side
- Show visual examples and lifestyle images
- Generate personalized recommendations
- Analyze images for color, style, and mood
- Explain framing concepts in simple terms
- Visualize frames in customer rooms
- Optimize for budget, quality, or speed

Guidelines:
1. Use tools proactively - if user asks about options, use compareProducts or getImageSuggestions
2. Always show visual examples when recommending products
3. When comparing, highlight key differences clearly
4. Be concise but informative
5. Use emojis sparingly for visual interest
6. Offer choices, don't dictate
7. Explain trade-offs when relevant
8. Celebrate their choices
9. Be proactive but not pushy
10. Always show price impacts when relevant

When comparing products:
- Use compareProducts tool to show side-by-side differences
- Highlight what makes each option unique
- Consider user's stated preferences
- Show pricing differences clearly

When showing examples:
- Use getImageSuggestions to retrieve relevant Prodigi assets
- Show lifestyle images for context
- Include chevron views for frame profiles
- Display corner details when relevant

When recommending:
- Use recommendProducts to generate personalized options
- Consider image analysis if available
- Factor in budget and style preferences
- Explain why each recommendation works`;

/**
 * Generate AI response using multi-agent system
 * Uses specialized agents for different types of requests
 */
export async function generateAgentResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  frameConfig: FrameConfiguration,
  imageAnalysis?: any
) {
  // Use multi-agent orchestrator for sophisticated routing
  try {
    const { routeToAgents, synthesizeResponses } = await import('./multi-agent/orchestrator');
    
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    const context = {
      frameConfig,
      imageAnalysis,
      conversationHistory: messages,
    };
    
    // Route to appropriate agents
    const agentResponses = await routeToAgents(lastUserMessage, context);
    
    // Synthesize responses into a coherent message
    const synthesizedContent = await synthesizeResponses(agentResponses, lastUserMessage, context);
    
    // Combine tool calls and results from all agents
    const allToolCalls: any[] = [];
    const allToolResults: any[] = [];
    
    agentResponses.forEach(response => {
      if (response.toolCalls) allToolCalls.push(...response.toolCalls);
      if (response.toolResults) allToolResults.push(...response.toolResults);
    });
    
    return {
      content: synthesizedContent,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
      finishReason: 'stop',
      agentResponses, // Include individual agent responses for debugging
    };
  } catch (error: any) {
    console.error('Multi-agent system error, falling back to single agent:', error);
    
    // Enhanced error handling - try legacy system, but provide fallback if that also fails
    try {
      return await generateLegacyAgentResponse(messages, frameConfig, imageAnalysis);
    } catch (legacyError: any) {
      console.error('Legacy agent also failed, providing ultimate fallback:', legacyError);
      
      // Ultimate fallback - never fail completely
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      const fallbackMessage = lastUserMessage.toLowerCase().includes('price') 
        ? 'I can help with pricing questions. Pricing depends on size, product type, and options. A typical 16x20 framed print costs $45-55.'
        : lastUserMessage.toLowerCase().includes('frame') || lastUserMessage.toLowerCase().includes('color')
        ? 'I recommend black frames for modern artwork, white for gallery-style looks, and natural wood for warm aesthetics. Would you like specific recommendations?'
        : 'I\'m here to help with your custom framing needs. Could you tell me more about what you\'re looking for?';
      
      return {
        content: fallbackMessage,
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop',
        agentResponses: [{
          agent: 'orchestrator',
          content: fallbackMessage,
          confidence: 0.3,
          metadata: { fallback: true, error: 'All agents failed' },
        }],
      };
    }
  }
}

/**
 * Legacy single-agent response (fallback)
 */
async function generateLegacyAgentResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  frameConfig: FrameConfiguration,
  imageAnalysis?: any
) {
  // Build context message
  const contextMessage = buildContextMessage(frameConfig, imageAnalysis);
  
  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: AGENT_SYSTEM_PROMPT + '\n\n' + contextMessage,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      tools: {
        compareProducts: compareProductsTool,
        getImageSuggestions: getImageSuggestionsTool,
        recommendProducts: recommendProductsTool,
        updateFrame: updateFrameTool,
      },
      // @ts-expect-error - maxSteps is valid but not in TypeScript definitions
      maxSteps: 5, // Allow agent to use multiple tools in sequence
      temperature: 0.7,
    });
    
    return {
      content: result.text,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      finishReason: result.finishReason,
    };
  } catch (error: any) {
    console.error('AI Agent error:', error);
    
    // Never throw - always provide a fallback response
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const fallbackMessage = lastUserMessage.toLowerCase().includes('price') 
      ? 'I can help with pricing. A typical 16x20 framed print costs $45-55. Premium options add $10-20.'
      : 'I\'m here to help with your custom framing needs. Could you tell me more about what you\'re looking for?';
    
    return {
      content: fallbackMessage,
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
    };
  }
}

/**
 * Build context message for AI based on current state
 */
function buildContextMessage(frameConfig: FrameConfiguration, imageAnalysis?: any): string {
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
    parts.push(`- Current frame: ${frameConfig.frameColor} ${frameConfig.frameStyle || 'classic'}`);
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
  
  parts.push('\nAvailable Options:');
  parts.push('- Sizes: 8x10, 11x14, 16x20, 18x24, 20x30, 24x36, 30x40, 36x48');
  parts.push('- Frame colors: black, white, natural, brown, gold, silver, dark grey, light grey');
  parts.push('- Product types: framed-print, canvas, framed-canvas, acrylic, metal, poster');
  parts.push('- Glazing: none, acrylic, glass, motheye (premium)');
  parts.push('- Mount: none, 1.4mm, 2.0mm, 2.4mm');
  
  return parts.join('\n');
}
