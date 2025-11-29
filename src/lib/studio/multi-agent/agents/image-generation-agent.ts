/**
 * Image Generation Agent
 * Expert in AI image generation, helping users create and select images for framing
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import type { OrchestratorContext, AgentResponse } from '../orchestrator';

const IMAGE_GENERATION_SYSTEM_PROMPT = `You are an AI image generation expert helping users create perfect artwork for custom framing.

Your expertise:
- AI image generation prompts and techniques
- Image selection and curation
- Aspect ratio guidance for framing
- Style recommendations for different frame types
- Image quality assessment
- Prompt optimization

Your role:
- Help users generate AI images using Ideogram
- Guide users in selecting the best image from generated options
- Provide prompt suggestions and improvements
- Explain aspect ratios and sizing for framing
- Recommend styles that work well with frames
- Help users refine their vision

Guidelines:
1. Always consider how the image will look in a frame
2. Suggest appropriate aspect ratios for framing
3. Help users refine prompts for better results
4. Guide image selection based on framing goals
5. Explain why certain images work better for framing
6. Be creative and encouraging`;

// Tool: Generate image generation prompt
const generatePromptTool = tool({
  description: 'Generate or improve an AI image generation prompt based on user requirements.',
  parameters: z.object({
    userPrompt: z.string().describe('User\'s original prompt or idea'),
    style: z.enum(['realistic', 'artistic', 'abstract', 'photographic', 'illustration', 'painting']).optional(),
    mood: z.string().optional().describe('Desired mood or atmosphere'),
    colors: z.array(z.string()).optional().describe('Color preferences'),
    aspectRatio: z.string().optional().describe('Aspect ratio for framing (e.g., "16x20", "24x36")'),
    improvements: z.array(z.string()).optional().describe('Specific improvements to make'),
  }),
  execute: async (params: any) => {
    // Enhance the prompt with framing considerations
    let enhancedPrompt = params.userPrompt;
    
    if (params.style) {
      enhancedPrompt += `, ${params.style} style`;
    }
    
    if (params.mood) {
      enhancedPrompt += `, ${params.mood} mood`;
    }
    
    if (params.colors && params.colors.length > 0) {
      enhancedPrompt += `, color palette: ${params.colors.join(', ')}`;
    }
    
    // Add framing-friendly suggestions
    const suggestions = [
      'Consider high resolution for print quality',
      'Ensure good contrast for frame visibility',
      'Think about how colors will complement frame options',
    ];
    
    return {
      originalPrompt: params.userPrompt,
      enhancedPrompt,
      aspectRatio: params.aspectRatio || '16x20',
      suggestions,
      readyForGeneration: true,
    };
  },
} as any);

// Tool: Recommend image selection
const recommendImageSelectionTool = tool({
  description: 'Help users select the best image from generated options based on framing considerations.',
  parameters: z.object({
    images: z.array(z.object({
      id: z.string(),
      url: z.string(),
      prompt: z.string().optional(),
    })).describe('Generated images to choose from'),
    frameType: z.string().optional().describe('Intended frame type'),
    frameColor: z.string().optional().describe('Intended frame color'),
    roomContext: z.string().optional().describe('Where the framed art will be displayed'),
  }),
  execute: async (params: any) => {
    // Analyze images and provide recommendations
    const recommendations = params.images.map((img: any, index: number) => {
      const score = calculateImageScore(img, params.frameType, params.frameColor);
      return {
        imageId: img.id,
        imageUrl: img.url,
        score,
        reasoning: generateSelectionReasoning(img, params.frameType, params.frameColor, score),
        rank: index + 1,
      };
    });
    
    // Sort by score
    recommendations.sort((a: any, b: any) => b.score - a.score);
    
    return {
      recommendations,
      topChoice: recommendations[0],
      selectionCriteria: [
        'Image quality and resolution',
        'Color harmony with frame',
        'Composition and framing potential',
        'Style compatibility',
      ],
    };
  },
} as any);

function calculateImageScore(image: any, frameType?: string, frameColor?: string): number {
  let score = 0.5; // Base score
  
  // Frame color compatibility
  if (frameColor === 'black') score += 0.1;
  if (frameColor === 'white') score += 0.1;
  if (frameColor === 'natural') score += 0.15;
  
  // Image quality indicators (simplified)
  if (image.url) score += 0.1;
  if (image.prompt && image.prompt.length > 20) score += 0.1;
  
  return Math.min(score, 1.0);
}

function generateSelectionReasoning(image: any, frameType?: string, frameColor?: string, score?: number): string {
  if (score && score > 0.7) {
    return 'Excellent choice for framing - good composition and color balance';
  }
  if (score && score > 0.5) {
    return 'Good option - works well with most frame styles';
  }
  return 'Consider this option if it matches your personal style preferences';
}

/**
 * Image Generation Agent
 */
export async function imageGenerationAgent(
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse> {
  const systemPrompt = `${IMAGE_GENERATION_SYSTEM_PROMPT}

Current Configuration:
${buildConfigContext(context.frameConfig)}

Available Tools:
- generatePrompt: Create or improve image generation prompts
- recommendImageSelection: Help select best image from generated options`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.slice(-5),
        { role: 'user', content: userMessage },
      ],
      tools: {
        generatePrompt: generatePromptTool,
        recommendImageSelection: recommendImageSelectionTool,
      },
      // @ts-expect-error - maxSteps is valid but not in TypeScript definitions
      maxSteps: 3,
      temperature: 0.8, // Higher creativity for image generation
    });

    return {
      agent: 'image-generation',
      content: result.text,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      confidence: 0.8,
    };
  } catch (error: any) {
    console.error('Image Generation Agent error:', error);
    
    // Handle specific error types with appropriate fallbacks
    if (error?.code === 'AI_LoadAPIKeyError' || error?.message?.includes('API key')) {
      return {
        agent: 'image-generation',
        content: 'I can help you generate AI images for framing! To get started, describe the image you want to create. For example: "A modern abstract painting with blue and gold colors, 16x20 aspect ratio." I\'ll help you refine the prompt and select the best image for framing.',
        confidence: 0.7,
        metadata: {
          fallback: true,
          error: 'API key not configured',
        },
      };
    }
    
    return {
      agent: 'image-generation',
      content: 'I encountered an issue helping with image generation. Please try again or rephrase your question.',
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
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}
