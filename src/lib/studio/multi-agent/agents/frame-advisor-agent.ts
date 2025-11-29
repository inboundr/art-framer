/**
 * Frame Advisor Agent
 * Expert in frame recommendations, quality, sizing, examples, and visual guidance
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import type { OrchestratorContext, AgentResponse } from '../orchestrator';
import { getLifestyleImages, getChevronImage, getCornerImages, getCrossSectionImage } from '@/lib/prodigi-assets/asset-catalog';

const FRAME_ADVISOR_SYSTEM_PROMPT = `You are a frame advisor and art consultant with 20 years of experience helping customers choose the perfect frames.

Your expertise:
- Frame style recommendations based on artwork
- Quality comparisons and explanations
- Sizing guidance for different spaces
- Visual examples and lifestyle images
- Color coordination and design principles
- Mount and glazing recommendations
- Product comparisons

Your role:
- Provide personalized frame recommendations
- Show visual examples to help users understand options
- Explain quality differences between options
- Guide users on sizing for their space
- Compare different frame configurations
- Help users visualize how frames will look

Guidelines:
1. Always show visual examples when recommending frames
2. Explain why you're making specific recommendations
3. Consider the user's artwork, space, and preferences
4. Be proactive in showing relevant images
5. Compare options clearly when asked
6. Provide sizing guidance based on room context
7. Explain quality differences in simple terms
8. Celebrate good choices and validate decisions`;

// Tool: Get visual examples
// Using nested object pattern to match working compareFramesTool
const getFrameVisualsTool = tool({
  description: 'Get visual examples and lifestyle images for frames. Shows how frames look in real settings.',
  parameters: z.object({
    productType: z.string(),
    frameConfig: z.object({
      frameType: z.string().optional(),
      frameColor: z.string().optional(),
    }).optional(),
    viewType: z.string().optional(),
    limit: z.number().optional(),
  }),
  execute: async (params: any) => {
    // Extract parameters directly
    const productType = params.productType;
    const frameType = params.frameConfig?.frameType;
    const frameColor = params.frameConfig?.frameColor;
    
    // Validate and apply defaults
    const viewType = params.viewType || 'lifestyle';
    const limit = params.limit || 5;
    
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
      // Cross-section images don't require color, use frameType only
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

// Tool: Recommend frame configuration
const recommendFrameTool = tool({
  description: 'Generate personalized frame recommendations based on artwork, preferences, and context.',
  parameters: z.object({
    artworkStyle: z.string().optional(),
    roomType: z.string().optional(),
    colorScheme: z.string().optional(),
    budget: z.string().optional(),
    pref_style: z.string().optional(),
    pref_color: z.string().optional(),
    pref_size: z.string().optional(),
    pref_budget: z.string().optional(),
    count: z.number().optional(),
  }),
  execute: async (params: any) => {
    const recommendations = [];
    const count = params.count || 3;
    
    const preferences = {
      style: params.pref_style,
      color: params.pref_color,
      size: params.pref_size,
      budget: params.pref_budget,
    };
    
    // Generate recommendations based on inputs
    for (let i = 0; i < count; i++) {
      const recommendation = {
        id: `rec-${Date.now()}-${i}`,
        productType: i === 0 ? 'framed-print' : ['canvas', 'framed-canvas', 'acrylic'][i % 3],
        frameColor: params.artworkStyle === 'modern' ? 'black' : 
                   params.artworkStyle === 'classic' ? 'natural' : 
                   params.budget === 'premium' ? 'gold' : 'white',
        size: params.roomType === 'bedroom' ? '16x20' : 
              params.roomType === 'office' ? '18x24' : 
              '24x36',
        mount: params.budget === 'premium' ? '2.4mm' : 'none',
        glaze: params.budget === 'premium' ? 'motheye' : 'acrylic',
        reason: generateRecommendationReason(i, preferences, params.artworkStyle),
        confidence: 0.9 - (i * 0.15),
      };
      recommendations.push(recommendation);
    }
    
    return {
      recommendations,
      basedOn: {
        artworkStyle: params.artworkStyle,
        roomType: params.roomType,
        budget: params.budget,
        preferences,
      },
    };
  },
} as any);

// Tool: Compare frame options
const compareFramesTool = tool({
  description: 'Compare different frame configurations side-by-side. Shows differences and helps users choose.',
  parameters: z.object({
    comparisonType: z.string().optional(),
    op1_frameColor: z.string().optional(),
    op1_size: z.string().optional(),
    op1_productType: z.string().optional(),
    op1_mount: z.string().optional(),
    op1_glaze: z.string().optional(),
    op1_price: z.number().optional(),
    op2_frameColor: z.string().optional(),
    op2_size: z.string().optional(),
    op2_productType: z.string().optional(),
    op2_mount: z.string().optional(),
    op2_glaze: z.string().optional(),
    op2_price: z.number().optional(),
  }),
  execute: async (params: any) => {
    // Reconstruct option objects
    const option1 = {
      frameColor: params.op1_frameColor,
      size: params.op1_size,
      productType: params.op1_productType,
      mount: params.op1_mount,
      glaze: params.op1_glaze,
      price: params.op1_price,
    };
    
    const option2 = {
      frameColor: params.op2_frameColor,
      size: params.op2_size,
      productType: params.op2_productType,
      mount: params.op2_mount,
      glaze: params.op2_glaze,
      price: params.op2_price,
    };
    
    const comparisonType = params.comparisonType || 'full';
    
    const differences: string[] = [];
    const similarities: string[] = [];
    
    if (option1.frameColor !== option2.frameColor) {
      differences.push(`Frame Color: ${option1.frameColor || 'none'} vs ${option2.frameColor || 'none'}`);
    } else if (option1.frameColor) {
      similarities.push(`Both use ${option1.frameColor} frame`);
    }
    
    if (option1.size !== option2.size) {
      differences.push(`Size: ${option1.size || 'none'} vs ${option2.size || 'none'}`);
    } else if (option1.size) {
      similarities.push(`Both are ${option1.size}`);
    }
    
    if (option1.productType !== option2.productType) {
      differences.push(`Product Type: ${option1.productType || 'none'} vs ${option2.productType || 'none'}`);
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
      recommendation: generateComparisonRecommendation(option1, option2, comparisonType),
    };
  },
} as any);

function generateRecommendationReason(index: number, preferences?: any, artworkStyle?: string): string {
  if (index === 0) {
    return 'Best match for your artwork style and preferences';
  }
  if (index === 1) {
    return 'Alternative option that complements your space';
  }
  return 'Budget-friendly option with great quality';
}

function generateComparisonRecommendation(option1: any, option2: any, type: string): string {
  if (type === 'color') {
    return `Option 1 (${option1.frameColor}) is more ${option1.frameColor === 'black' ? 'modern and versatile' : 'classic and warm'}, while Option 2 (${option2.frameColor}) offers ${option2.frameColor === 'white' ? 'a clean gallery look' : 'a different aesthetic'}.`;
  }
  return 'Both options have their merits. Consider your space, budget, and personal style when choosing.';
}

/**
 * Frame Advisor Agent
 */
export async function frameAdvisorAgent(
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse> {
    const systemPrompt = `${FRAME_ADVISOR_SYSTEM_PROMPT}

Current Configuration:
${buildConfigContext(context.frameConfig || {})}

Image Analysis:
${context.imageAnalysis ? JSON.stringify(context.imageAnalysis, null, 2) : 'No image analysis available'}

Available Tools:
- getFrameVisuals: Show lifestyle images, chevrons, corners, cross-sections
- recommendFrame: Generate personalized recommendations
- compareFrames: Compare different frame options`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.slice(-5),
        { role: 'user', content: userMessage },
      ],
      tools: {
        getFrameVisuals: getFrameVisualsTool,
        recommendFrame: recommendFrameTool,
        compareFrames: compareFramesTool,
      },
      // @ts-expect-error - maxSteps is valid but not in TypeScript definitions
      maxSteps: 3,
      temperature: 0.7,
    });

    return {
      agent: 'frame-advisor',
      content: result.text,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      confidence: 0.85,
    };
  } catch (error: any) {
    console.error('Frame Advisor Agent error:', error);
    
    // Handle specific error types with appropriate fallbacks
    if (error?.code === 'AI_LoadAPIKeyError' || error?.message?.includes('API key')) {
      return {
        agent: 'frame-advisor',
        content: 'For modern artwork, I recommend a black frame which creates a sleek, contemporary look. Black frames are versatile and work well with most color schemes. Would you like to see examples or compare different frame options?',
        confidence: 0.7,
        metadata: {
          fallback: true,
          error: 'API key not configured',
        },
      };
    }
    
    return {
      agent: 'frame-advisor',
      content: 'I encountered an issue providing frame recommendations. Please try again or rephrase your question.',
      confidence: 0.2,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
    };
  }
}

function buildConfigContext(config: any): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`Product Type: ${config.productType}`);
  if (config.size) parts.push(`Size: ${config.size}`);
  if (config.frameColor) parts.push(`Frame Color: ${config.frameColor}`);
  if (config.frameStyle) parts.push(`Frame Style: ${config.frameStyle}`);
  if (config.mount && config.mount !== 'none') parts.push(`Mount: ${config.mount}`);
  if (config.glaze && config.glaze !== 'none') parts.push(`Glaze: ${config.glaze}`);
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}
